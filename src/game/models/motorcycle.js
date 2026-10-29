import * as THREE from 'three';
import { VEHICLE_BLACK } from '../../constants/vehicles.js';
import { extrudeProfile, mat, measureFootprint } from './carModels.js';
import { createPerson } from './staff.js';

// Naked street bike in the style of an Apache RTR: sculpted tank, split seat, angular tail and a
// short underbelly exhaust. 2 m long, faces local +X. `wheels` is [rear, front]; `body` is the
// group that leans into corners; `rider` sits on it and is shown only while the bike is ridden.

const WHEEL_RADIUS = 0.31;
const WHEEL_X = [-0.67, 0.67];

/**
 * Builds one spoked wheel that spins about local z.
 * @param {THREE.Material} rubber - Tyre material.
 * @param {THREE.Material} rim - Rim material.
 * @returns {THREE.Group} The wheel.
 */
function createWheel(rubber, rim) {
  const wheel = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.TorusGeometry(WHEEL_RADIUS - 0.05, 0.05, 8, 24), rubber);
  tyre.castShadow = true;
  wheel.add(tyre);
  for (let i = 0; i < 3; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.035, 0.03), rim);
    spoke.rotation.z = (i * Math.PI) / 3;
    wheel.add(spoke);
  }
  return wheel;
}

/**
 * Adds a box to a group.
 * @param {THREE.Group} group - Parent group.
 * @param {THREE.Material} material - Material.
 * @param {{size: number[], at: number[], tilt?: number}} placement - Size, centre and z rotation.
 */
function box(group, material, { size, at, tilt = 0 }) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...at);
  mesh.rotation.z = tilt;
  mesh.castShadow = true;
  group.add(mesh);
}

/**
 * Adds the tank, seat, tail, engine and exhaust.
 * @param {THREE.Group} body - Leaning body group.
 * @param {object} kit - Materials.
 */
function addBodywork(body, kit) {
  const tank = [
    [0.55, 0.82],
    [0.45, 1.03],
    [0.05, 1.0],
    [-0.12, 0.86],
  ];
  body.add(extrudeProfile(tank, 0.38, kit.paint, 0.05));
  const tail = [
    [-0.55, 0.86],
    [-0.98, 1.04],
    [-1.0, 0.98],
    [-0.6, 0.82],
  ];
  body.add(extrudeProfile(tail, 0.22, kit.paint, 0.03));
  box(body, kit.seat, { size: [0.5, 0.08, 0.26], at: [-0.35, 0.93, 0] });
  box(body, kit.accent, { size: [0.32, 0.03, 0.39], at: [0.3, 0.9, 0], tilt: 0.2 });
  box(body, kit.engine, { size: [0.46, 0.34, 0.3], at: [0.05, 0.52, 0] });
  box(body, kit.engine, { size: [0.7, 0.05, 0.08], at: [-0.33, 0.38, 0], tilt: 0.12 });
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.38, 10), kit.chrome);
  exhaust.rotation.z = Math.PI / 2 - 0.15;
  exhaust.position.set(-0.05, 0.3, 0.12);
  body.add(exhaust);
}

/**
 * Adds the fork, handlebar, headlight and tail light.
 * @param {THREE.Group} body - Leaning body group.
 * @param {object} kit - Materials.
 */
function addFrontAndLights(body, kit) {
  for (const z of [0.08, -0.08])
    box(body, kit.chrome, { size: [0.04, 0.72, 0.04], at: [0.58, 0.65, z], tilt: 0.42 });
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 8), kit.engine);
  bar.rotation.x = Math.PI / 2;
  bar.position.set(0.44, 1.07, 0);
  body.add(bar);
  box(body, kit.paint, { size: [0.14, 0.2, 0.24], at: [0.62, 0.98, 0], tilt: -0.3 });
  box(body, kit.head, { size: [0.04, 0.08, 0.16], at: [0.7, 0.96, 0], tilt: -0.3 });
  box(body, kit.tail, { size: [0.03, 0.05, 0.12], at: [-1.0, 0.98, 0] });
  box(body, kit.paint, { size: [0.3, 0.03, 0.14], at: [0.68, 0.62, 0], tilt: -0.5 });
}

/**
 * Creates the seated rider in a black jacket and helmet, holding the handlebar.
 * @returns {object} Person from createPerson.
 */
function createRider() {
  const rider = createPerson({ top: '#151515', bottom: '#28303a', shoes: '#1a1a1a' });
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 16, 12),
    mat('#0d0d0f', { metalness: 0.6, roughness: 0.25 }),
  );
  helmet.position.set(0, 0.01, -0.01);
  rider.head.add(helmet);
  // Seated pose puts the pelvis 0.5 m up; lift it onto the 0.94 m seat, facing the bars (+x).
  rider.pose('type');
  rider.root.position.set(-0.32, 0.42, 0);
  rider.root.rotation.y = Math.PI / 2;
  rider.root.visible = false;
  return rider;
}

/**
 * Creates the motorcycle's materials.
 * @param {string} color - Body paint colour.
 * @returns {object} Paint, trim and lamp materials.
 */
function createBikeKit(color) {
  return {
    paint: mat(color, { metalness: 0.7, roughness: 0.25 }),
    accent: mat('#c8171e', { metalness: 0.4, roughness: 0.35 }),
    seat: mat('#151617', { roughness: 0.85 }),
    engine: mat('#2b2e31', { metalness: 0.6, roughness: 0.45 }),
    chrome: mat('#c9cdd1', { metalness: 0.9, roughness: 0.2 }),
    head: mat('#eaf6ff', { emissive: '#cfe9ff', emissiveIntensity: 1.6 }),
    tail: mat('#9e1410', { emissive: '#e0261c', emissiveIntensity: 0.9 }),
  };
}

/**
 * Builds a black Apache-style motorcycle.
 * @param {string} color - Body paint colour.
 * @returns {{group: THREE.Group, body: THREE.Group, wheels: THREE.Group[], rider: object,
 * size: object}} The model and its footprint half extents (without the rider).
 */
export function createMotorcycle(color = VEHICLE_BLACK) {
  const kit = createBikeKit(color);
  const group = new THREE.Group(),
    body = new THREE.Group();
  group.add(body);
  addBodywork(body, kit);
  addFrontAndLights(body, kit);
  const rubber = mat('#151719', { roughness: 0.9 });
  const wheels = WHEEL_X.map((x) => {
    const wheel = createWheel(rubber, kit.engine);
    wheel.position.set(x, WHEEL_RADIUS, 0);
    body.add(wheel);
    return wheel;
  });
  const size = measureFootprint(group);
  const rider = createRider();
  body.add(rider.root);
  return { group, body, wheels, rider, size };
}
