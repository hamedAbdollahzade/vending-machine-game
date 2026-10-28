import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {toLocal, toLatLon, bearing, ORIGIN} from '../src/geo.js';
import {createCollisionWorld, resolveCircle, blocked, clearFraction} from '../src/collision.js';
import {buildGraph, routeBetween, nearestSegment, buildSegmentIndex} from '../src/routing.js';
import {createCar, stepCar} from '../src/vehicle.js';
import {createTraffic} from '../src/traffic.js';
import {Scene} from 'three';
import {machines, machineById, FACTORY} from '../src/locations.js';

const data = JSON.parse(readFileSync(new URL('../src/data/mellat.json', import.meta.url)));

test('Projection round-trips and bearings follow the compass', () => {
    const p = toLocal(36.32092, 59.53744), back = toLatLon(p.x, p.z);
    assert.ok(Math.abs(back.lat - 36.32092) < 1e-9 && Math.abs(back.lon - 59.53744) < 1e-9);
    assert.ok(p.z < 0, 'north of the origin is -z');
    assert.deepEqual(toLocal(ORIGIN.lat, ORIGIN.lon), {x: 0, z: 0});
    assert.equal(bearing(0, -1), 0);
    assert.equal(bearing(1, 0), 90);
});

test('Circles are pushed out of footprints and segments stop at walls', () => {
    const world = createCollisionWorld([[0, 0, 10, 0, 10, 10, 0, 10]]);
    assert.ok(blocked(world, 5, 5));
    const out = resolveCircle(world, 9.5, 5, 1);
    assert.ok(out.hit && out.x >= 10.99);
    assert.equal(resolveCircle(world, 20, 20, 1).hit, false);
    assert.ok(Math.abs(clearFraction(world, -10, 5, 10, 5) - .5) < .06);
});

test('Real map: the factory connects by car to the city, and every city machine is reachable', () => {
    const walk = buildGraph(data.roads), drive = buildGraph(data.roads, {drivable: true});
    const toCity = routeBetween(drive, FACTORY.center.x, FACTORY.center.z, -445.8, -275.7);
    assert.ok(toCity && toCity.length > 18000 && toCity.length < 23000, `factory → Park Mellat is ~20 km (${toCity?.length})`);
    const start = machineById('mellat-park').anchor;
    for (const m of machines.filter(m => m.anchor)) {
        const onFoot = routeBetween(walk, start.x, start.z, m.anchor.x, m.anchor.z);
        assert.ok(onFoot, `walk route to ${m.id}`);
        assert.ok(onFoot.length >= Math.hypot(m.anchor.x - start.x, m.anchor.z - start.z) - 1);
        assert.ok(routeBetween(drive, start.x, start.z, m.anchor.x, m.anchor.z), `drive route to ${m.id}`);
    }
    const street = nearestSegment(buildSegmentIndex(data.roads), 494, 280, 30, s => s[5] >= 0);
    assert.equal(data.names[street.name], 'بولوار ملک آباد');
});

test('Car accelerates, steers right with positive input and brakes', () => {
    const car = createCar(0, 0, 0);
    for (let i = 0; i < 60; i++) stepCar(car, {throttle: 1}, 1 / 30);
    assert.ok(car.speed > 10 && car.x > 10 && Math.abs(car.z) < 1e-9);
    for (let i = 0; i < 30; i++) stepCar(car, {throttle: 1, steer: 1}, 1 / 30);
    assert.ok(car.z > 0, 'turning right while heading east moves south (+z)');
    for (let i = 0; i < 90; i++) stepCar(car, {throttle: -1}, 1 / 30);
    assert.ok(car.speed <= 0);
});

test('Traffic drives with the flow on one-way carriageways and stays inside them', () => {
    const oneway = new Set(data.oneway);
    assert.ok(data.roads.some((r, i) => data.names[r[1]]?.includes('چناران') && oneway.has(i)), 'Chenaran highway is one-way per carriageway');
    const traffic = createTraffic(new Scene(), data, 28), around = {x: -10008, z: -15049};
    for (let i = 0; i < 400; i++) traffic.update(1 / 30, [], around);
    const active = traffic.cars.filter(c => c.road);
    assert.ok(active.length > 10, `cars spawned near the player (${active.length})`);
    for (const car of active.filter(c => c.road.oneway)) {
        assert.equal(car.dir, 1);
        assert.ok(Math.abs(car.lane) < car.road.width / 2, 'lane inside the carriageway');
    }
});

test('Microsoft buildings decode into the world, stay clear of the factory and leave machines reachable', async () => {
    const {decodeBuildings} = await import('../src/buildings-data.js');
    const file = readFileSync(new URL('../public/data/buildings.bin', import.meta.url));
    const buildings = decodeBuildings(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
    assert.ok(buildings.length > 100000, `${buildings.length} buildings`);
    const {minX, minZ, maxX, maxZ} = data.bounds;
    for (const b of buildings) {
        assert.ok(b[0] >= 3 && b[0] <= 30, `height ${b[0]}`);
        assert.ok(b[1] >= minX - 150 && b[1] <= maxX + 150 && b[2] >= minZ - 150 && b[2] <= maxZ + 150, 'near the region');
    }
    const world = createCollisionWorld([...data.buildings, ...buildings].map(b => b.slice(1)));
    assert.equal(blocked(world, FACTORY.center.x, FACTORY.center.z), false, 'factory compound is clear');
    // Every city machine's path point is still outside buildings, so the family can stand there.
    for (const m of machines.filter(m => m.anchor)) assert.equal(blocked(world, m.anchor.x, m.anchor.z), false, m.id);
});

test('Satellite tiles land where the map is: a tile over Park Mellat covers the park', async () => {
    const {tileCorners} = await import('../src/imagery.js');
    const index = JSON.parse(readFileSync(new URL('../public/imagery/index.json', import.meta.url)));
    assert.ok(index[17].length > 100 && index[15].length > 100);
    const park = toLocal(36.32092, 59.53744), z = 17;
    const x = Math.floor((59.53744 + 180) / 360 * 2 ** z), y = Math.floor((1 - Math.asinh(Math.tan(36.32092 * Math.PI / 180)) / Math.PI) / 2 * 2 ** z);
    assert.ok(index[17].includes(`${x}/${y}`), 'the Park Mellat tile was downloaded');
    const [nw, ne, sw, se] = tileCorners(x, y, z);
    assert.ok(nw.x < ne.x && nw.z < sw.z && se.x > sw.x, 'north-west corner is up-left in world space');
    assert.ok(park.x >= nw.x && park.x <= se.x && park.z >= nw.z && park.z <= se.z, 'the park centre lies inside its tile');
    assert.ok(Math.abs((ne.x - nw.x) - 247) < 5, 'a zoom-17 tile is ~247 m wide at Mashhad');
});
