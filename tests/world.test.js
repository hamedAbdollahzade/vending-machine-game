import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {toLocal, toLatLon, bearing, ORIGIN} from '../src/geo.js';
import {createCollisionWorld, resolveCircle, blocked, clearFraction} from '../src/collision.js';
import {buildGraph, routeBetween, nearestSegment, buildSegmentIndex} from '../src/routing.js';
import {createCar, stepCar} from '../src/vehicle.js';
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
