import * as THREE from 'three';
import {
  ENTER_DISTANCE,
  MANAGER_CAR_BRAND,
  STAFF_CAR_BRANDS,
  VEHICLE_BLACK,
  VEHICLE_LABELS,
} from '../../constants/vehicles.js';
import { createSportSedan, measureFootprint } from '../models/carModels.js';
import { createLuxuryCar } from '../models/luxuryCars.js';
import { TRAFFIC_CAR } from '../systems/traffic.js';
import { CAR, createCar } from '../systems/vehicle.js';
import { boxOverlap, circleOutOfBox, vehicleBox } from '../world/vehicleCollision.js';

// Every vehicle the player can drive: the family BMW, the staff cars,
// Mr Mohammadi's Bugatti once he has parked it, and any traffic car the player has taken over.
// `context.vehicle` is the one in use (or last used); `context.car` is its moving state.

// Distance beyond which two vehicles can't touch, to skip the box test.
const CONTACT_RANGE = 8;
// Radius of the walking player against parked vehicles.
const WALKER_RADIUS = 0.45;
// Speed kept after a head-on hit; a glancing scrape keeps nearly all of it.
const HEAD_ON_SPEED_KEPT = 0.4;
// A traffic car the player keeps pushing against pulls away (respawns) after this many seconds.
const TRAFFIC_GIVE_WAY = 0.8;

/**
 * Adds a vehicle to the garage and the scene.
 * @param {object} context - Game context.
 * @param {{brand: string, model: object, slot: object}} vehicle - Vehicle
 * fields; `slot` is where it is parked on reset (null for vehicles that are not reset).
 * @returns {object} The garage record.
 */
function addVehicle(context, { brand, model, slot, ...extra }) {
  const record = {
    brand,
    model,
    slot,
    label: VEHICLE_LABELS[brand],
    // Car handling, with the collision box measured from the model itself so contact is exact.
    spec: { ...CAR, ...model.size },
    state: createCar(slot.x, slot.z, slot.heading),
    ...extra,
  };
  context.garage.group.add(model.group);
  context.garage.vehicles.push(record);
  placeModel(record);
  return record;
}

/**
 * Adds footprint half extents to a freshly built model that doesn't report its own.
 * @param {object} model - Model with a group.
 * @returns {object} The same model with `size`.
 */
function withSize(model) {
  model.size = measureFootprint(model.group);
  return model;
}

/**
 * Moves a vehicle's model to its state's position and heading.
 * @param {object} record - Garage record.
 */
function placeModel({ model, state }) {
  model.group.position.set(state.x, 0, state.z);
  model.group.rotation.set(0, state.heading, 0);
}

/**
 * Makes a garage vehicle the one the player uses.
 * @param {object} context - Game context.
 * @param {object} record - Garage record.
 */
function setActive(context, record) {
  context.vehicle = record;
  context.car = record.state;
}

/**
 * Creates the garage with the factory fleet parked in the yard.
 * @param {object} context - Game context with scene and factory.
 */
export function createGarage(context) {
  context.garage = { group: new THREE.Group(), vehicles: [], managerCar: null };
  context.scene.add(context.garage.group);
  const { car: familySlot, parking } = context.factory;
  addVehicle(context, {
    brand: 'bmw',
    model: withSize(createSportSedan(VEHICLE_BLACK)),
    slot: familySlot,
  });
  STAFF_CAR_BRANDS.forEach((brand, i) =>
    addVehicle(context, {
      brand,
      model: createLuxuryCar(brand),
      slot: parking.cars[i],
    }),
  );
  setActive(context, context.garage.vehicles[0]);
}

/**
 * Parks the fleet back in its bays, drops taken traffic cars and returns the manager's car to the
 * factory so his arrival can play again. Call before factory.reset().
 * @param {object} context - Game context.
 */
export function resetGarage(context) {
  const { garage } = context;
  for (const record of garage.vehicles.filter((v) => !v.slot))
    garage.group.remove(record.model.group);
  garage.vehicles = garage.vehicles.filter((v) => v.slot);
  if (garage.managerCar) context.factory.managerCar.home.add(garage.managerCar.model.group);
  garage.managerCar = null;
  for (const record of garage.vehicles) {
    record.state = createCar(record.slot.x, record.slot.z, record.slot.heading);
    placeModel(record);
  }
  setActive(context, garage.vehicles[0]);
}

/**
 * Takes over the manager's car once he has parked it, so it can be driven like the others.
 * @param {object} context - Game context.
 */
export function updateGarage(context) {
  const manager = context.factory.managerCar;
  if (context.garage.managerCar || !manager.parked()) return;
  const group = manager.model.group;
  group.updateWorldMatrix(true, false);
  const at = group.getWorldPosition(new THREE.Vector3());
  const nose = group.localToWorld(new THREE.Vector3(1, 0, 0));
  // The factory frame is rotated; recover the world heading from where the nose points.
  const heading = Math.atan2(-(nose.z - at.z), nose.x - at.x);
  const record = addVehicle(context, {
    brand: MANAGER_CAR_BRAND,
    model: manager.model,
    slot: { x: at.x, z: at.z, heading },
  });
  // Not reset with the fleet: resetGarage hands it back to the factory instead.
  record.slot = null;
  context.garage.managerCar = record;
}

/**
 * Finds the closest vehicle the walking player can get on or in.
 * @param {object} context - Game context.
 * @returns {{label: string, record?: object, npc?: object} | null} A garage vehicle or a traffic
 * car within reach, or null.
 */
export function nearestRide(context) {
  const { x, z } = context.player;
  let best = null,
    bestDistance = ENTER_DISTANCE;
  for (const record of context.garage.vehicles) {
    const distance = Math.hypot(record.state.x - x, record.state.z - z);
    if (distance < bestDistance) [best, bestDistance] = [{ record, label: record.label }, distance];
  }
  for (const npc of context.traffic.cars) {
    if (!npc.model.group.visible) continue;
    const distance = Math.hypot(npc.x - x, npc.z - z);
    if (distance < bestDistance)
      [best, bestDistance] = [{ npc, label: VEHICLE_LABELS.traffic }, distance];
  }
  return best;
}

/**
 * Gets the player into a ride found by nearestRide; a traffic car becomes a garage vehicle.
 * @param {object} context - Game context.
 * @param {{record?: object, npc?: object}} ride - The ride to take.
 * @returns {object} The garage record now in use.
 */
export function takeRide(context, { record, npc }) {
  if (npc) {
    const slot = { x: npc.x, z: npc.z, heading: npc.model.group.rotation.y };
    const model = { ...context.traffic.adopt(npc), size: TRAFFIC_CAR };
    record = addVehicle(context, { brand: 'traffic', model, slot });
    // Taken traffic cars stay where they are left until the next reset, which removes them.
    record.slot = null;
  }
  setActive(context, record);
  return record;
}

/**
 * Updates the active vehicle's model: position, wheel spin and front-wheel steering.
 * @param {object} context - Game context.
 * @param {number} dt - Frame time in seconds.
 */
export function syncActiveVehicle(context, dt) {
  const { model, state, spec } = context.vehicle;
  placeModel(context.vehicle);
  // Wheels list the rear pair first, then the two front (steering) wheels.
  for (const [i, wheel] of model.wheels.entries()) {
    wheel.rotation.z -= (state.speed * dt) / spec.wheelRadius;
    if (i >= 2) wheel.rotation.y = -state.steer;
  }
}

/**
 * Footprint box of a garage vehicle.
 * @param {object} record - Garage record.
 * @returns {object} Box from vehicleBox.
 */
const recordBox = (record) => vehicleBox(record.state, record.spec);

/**
 * Footprint box of a traffic car.
 * @param {object} npc - Traffic car.
 * @returns {object} Box from vehicleBox.
 */
const trafficBox = (npc) =>
  vehicleBox({ x: npc.x, z: npc.z, heading: npc.model.group.rotation.y }, TRAFFIC_CAR);

/**
 * Pushes the driven vehicle out of another body and slows it by how head-on the hit was.
 * @param {object} context - Game context.
 * @param {object} box - The other body's box.
 * @returns {boolean} Whether the bodies touched.
 */
function bump(context, box) {
  const { state, spec } = context.vehicle;
  const push = boxOverlap(vehicleBox(state, spec), box);
  if (!push) return false;
  state.x += push.x;
  state.z += push.z;
  // 1 when the push points straight against the direction of travel, 0 for a side scrape.
  const forwardX = Math.cos(state.heading) * Math.sign(state.speed),
    forwardZ = -Math.sin(state.heading) * Math.sign(state.speed);
  const headOn = Math.max(0, -(push.x * forwardX + push.z * forwardZ) / push.depth);
  if (headOn > 0.5 && Math.abs(state.speed) > 4) context.tone(110, 0.25, 0.08, 'square');
  state.speed *= 1 - (1 - HEAD_ON_SPEED_KEPT) * headOn;
  context.debugHits.push({ kind: 'vehicle', x: Math.round(state.x), z: Math.round(state.z) });
  return true;
}

/**
 * Whether a point is close enough to the driven vehicle to bother with a box test.
 * @param {object} state - Driven vehicle state.
 * @param {{x: number, z: number}} other - Other body's centre.
 * @returns {boolean} True when within CONTACT_RANGE.
 */
const inRange = (state, other) => Math.hypot(other.x - state.x, other.z - state.z) < CONTACT_RANGE;

/**
 * Resolves the driven vehicle against parked garage vehicles and traffic. Bodies only meet when
 * their outlines overlap, so the player keeps full speed through any gap they fit.
 * @param {object} context - Game context.
 * @param {number} dt - Step length in seconds.
 */
export function collideDriving(context, dt) {
  const active = context.vehicle;
  for (const record of context.garage.vehicles) {
    if (record !== active && inRange(active.state, record.state)) bump(context, recordBox(record));
  }
  for (const npc of context.traffic.cars) {
    if (!npc.model.group.visible || !inRange(active.state, npc)) continue;
    if (!bump(context, trafficBox(npc))) {
      npc.contact = 0;
      continue;
    }
    // Staying pressed against a traffic car makes it pull away, so the player never gets stuck.
    npc.contact = (npc.contact ?? 0) + dt;
    if (npc.contact > TRAFFIC_GIVE_WAY) context.traffic.remove(npc);
  }
}

/**
 * Keeps the walking player out of parked vehicles.
 * @param {object} context - Game context.
 * @param {{x: number, z: number}} point - Proposed player position.
 * @returns {{x: number, z: number}} The position outside every vehicle.
 */
export function walkAroundVehicles(context, point) {
  let at = point;
  for (const record of context.garage.vehicles) {
    if (!inRange(at, record.state)) continue;
    at = circleOutOfBox(recordBox(record), at, WALKER_RADIUS) ?? at;
  }
  return at;
}

/**
 * Everything traffic should not drive into: the player and every garage vehicle, with widths so
 * traffic only stops for what really blocks its lane.
 * @param {object} context - Game context.
 * @returns {{x: number, z: number, halfWidth: number}[]} Obstacles.
 */
export function trafficObstacles(context) {
  const walker = { x: context.player.x, z: context.player.z, halfWidth: WALKER_RADIUS };
  return [
    ...(context.mode === 'walk' ? [walker] : []),
    ...context.garage.vehicles.map(({ state, spec }) => ({
      x: state.x,
      z: state.z,
      halfWidth: spec.halfWidth,
    })),
  ];
}
