import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Scene } from 'three';
import { boxOverlap, circleOutOfBox, vehicleBox } from '../src/game/world/vehicleCollision.js';
import { createTraffic, TRAFFIC_CAR } from '../src/game/systems/traffic.js';
import { createLuxuryCar } from '../src/game/models/luxuryCars.js';

const data = JSON.parse(readFileSync(new URL('../src/data/mellat.json', import.meta.url)));

// Two traffic cars side by side on a 9 m road, lanes 4.5 m apart (centres at ±2.25).
const leftCar = vehicleBox({ x: 0, z: -2.25, heading: 0 }, TRAFFIC_CAR);
const rightCar = vehicleBox({ x: 0, z: 2.25, heading: Math.PI }, TRAFFIC_CAR);

test('A car drives between two traffic cars without touching them', () => {
  const car = createLuxuryCar('mazda');
  const between = vehicleBox({ x: 0, z: 0, heading: 0 }, car.size);
  assert.equal(boxOverlap(between, leftCar), null);
  assert.equal(boxOverlap(between, rightCar), null);
  // Regression: the old 3.4 m circle test counted this as a crash and stopped the driver.
  assert.ok(Math.hypot(0, 2.25) < 3.4);
});

test('Vehicles only collide when their bodies really overlap', () => {
  const car = (z) => vehicleBox({ x: 0, z, heading: 0 }, { halfLength: 2.3, halfWidth: 0.95 });
  assert.equal(boxOverlap(car(0), leftCar), null, '0.4 m gap: no contact');
  const hit = boxOverlap(car(-0.5), leftCar);
  assert.ok(hit, 'bodies overlap by 0.08 m');
  assert.ok(Math.abs(hit.depth - 0.08) < 1e-9);
  assert.ok(hit.z > 0 && Math.abs(hit.x) < 1e-9, 'pushed sideways, away from the other car');
  const nose = boxOverlap(vehicleBox({ x: -4.3, z: -2.25, heading: 0 }, TRAFFIC_CAR), leftCar);
  assert.ok(nose && nose.x < 0, 'rear-ending pushes back along the road');
  const crossing = vehicleBox({ x: 0, z: -5.4, heading: Math.PI / 2 }, TRAFFIC_CAR);
  assert.equal(boxOverlap(crossing, leftCar), null, 'a car crossing 7 cm away does not clip it');
});

test('A walker is pushed out of a parked vehicle, even from inside it', () => {
  const parked = vehicleBox({ x: 10, z: 0, heading: 0.7 }, { halfLength: 2.3, halfWidth: 1 });
  assert.equal(circleOutOfBox(parked, { x: 20, z: 0 }, 0.45), null);
  for (const point of [
    { x: 10, z: 0.2 },
    { x: 11.5, z: -1.4 },
  ]) {
    const out = circleOutOfBox(parked, point, 0.45);
    assert.ok(out, 'contact');
    const again = circleOutOfBox(parked, out, 0.449);
    assert.equal(again, null, 'the corrected point is clear of the box');
  }
});

test('Luxury cars report footprints that match their size', () => {
  for (const brand of ['bugatti', 'lamborghini', 'mazda', 'nissan']) {
    const model = createLuxuryCar(brand);
    assert.equal(model.wheels.length, 4, brand);
    assert.ok(model.size.halfLength > 2.1 && model.size.halfLength < 2.6, brand);
    assert.ok(model.size.halfWidth > 0.9 && model.size.halfWidth < 1.15, brand);
  }
});

/**
 * Finds an active traffic car with no other traffic car within 20 m.
 * @param {object} traffic - Traffic from createTraffic.
 * @returns {object | undefined} The car.
 */
function loneCar(traffic) {
  return traffic.cars.find(
    (car) =>
      car.road && traffic.cars.every((o) => o === car || Math.hypot(o.x - car.x, o.z - car.z) > 20),
  );
}

test('Traffic stops for what blocks its lane but keeps going past what is beside it', () => {
  const traffic = createTraffic(new Scene(), data, 28),
    around = { x: -10008, z: -15049 };
  for (let i = 0; i < 200; i++) traffic.update(1 / 30, [], around);
  const car = loneCar(traffic);
  assert.ok(car, 'a traffic car on its own');
  const heading = car.model.group.rotation.y;
  const forward = { x: Math.cos(heading), z: -Math.sin(heading) },
    side = { x: Math.sin(heading), z: Math.cos(heading) };
  // An obstacle 5 m ahead, offset sideways by `offset`.
  const at = (offset, halfWidth) => ({
    x: car.x + forward.x * 5 + side.x * offset,
    z: car.z + forward.z * 5 + side.z * offset,
    halfWidth,
  });
  const before = car.d;
  // A walker (0.45 m half width) in the lane stops the car; one at the lane edge does not.
  traffic.update(1 / 30, [at(0.5, 0.45)], around);
  assert.equal(car.d, before, 'a walker in the lane stops the car');
  traffic.update(1 / 30, [at(1.8, 0.45)], around);
  assert.notEqual(car.d, before, 'a walker on the lane edge does not');
});

test('Taking a traffic car hands its model to the player and refills the slot', () => {
  const traffic = createTraffic(new Scene(), data, 4);
  for (let i = 0; i < 60; i++) traffic.update(1 / 30, [], { x: -10008, z: -15049 });
  const car = traffic.cars.find((c) => c.road);
  const model = traffic.adopt(car);
  assert.equal(model.group.parent, null, 'no longer part of traffic');
  assert.notEqual(car.model, model);
  assert.equal(car.model.group.parent, traffic.group);
  assert.equal(car.road, null, 'the slot respawns elsewhere later');
});

test('The motorcycle is gone from the game', () => {
  const src = new URL('../src/', import.meta.url);
  const vehicleSource = ['game/runtime/garage.js', 'game/systems/vehicle.js', 'i18n/fa.js']
    .map((file) => readFileSync(new URL(file, src), 'utf8'))
    .join('\n');
  assert.doesNotMatch(vehicleSource, /motorcycle|BIKE|apache/i);
});
