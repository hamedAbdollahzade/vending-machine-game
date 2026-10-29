import * as THREE from 'three';
import { VEHICLE_BLACK } from '../../constants/vehicles.js';
import { addWheels, bodyOutline, extrudeProfile, mat, measureFootprint } from './carModels.js';

// Low-poly luxury cars for the factory yard, each in the style of a well-known brand but without
// badges or logos. Like the other models they face local +X, sit on y = 0 and list their wheels
// rear pair first, then the two front (steering) ones.

/**
 * Creates the materials every luxury car shares.
 * @param {string} color - Body paint colour.
 * @returns {object} Paint, glass, trim and lamp materials.
 */
function createKit(color) {
  return {
    paint: mat(color, { metalness: 0.75, roughness: 0.22 }),
    glass: mat('#0f1a22', { metalness: 0.7, roughness: 0.08 }),
    black: mat('#050506', { roughness: 0.6 }),
    chrome: mat('#d8dcdf', { metalness: 0.95, roughness: 0.15 }),
    head: mat('#eaf6ff', { emissive: '#cfe9ff', emissiveIntensity: 1.6 }),
    tail: mat('#9e1410', { emissive: '#e0261c', emissiveIntensity: 0.9 }),
  };
}

/**
 * Adds a box part, optionally mirrored to both sides of the car.
 * @param {THREE.Group} group - Car group.
 * @param {THREE.Material} material - Part material.
 * @param {{size: number[], at: number[], mirror?: boolean}} placement - Box size and centre; with
 * `mirror` a copy is placed at -z too.
 * @returns {THREE.Mesh[]} The added meshes.
 */
function part(group, material, { size, at, mirror = false }) {
  return (mirror ? [1, -1] : [1]).map((side) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(at[0], at[1], at[2] * side);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  });
}

/**
 * Adds a round lamp ring facing along the car, mirrored to both sides.
 * @param {THREE.Group} group - Car group.
 * @param {THREE.Material} material - Lamp material.
 * @param {{radius: number, at: number[]}} placement - Ring radius and centre.
 */
function lampRing(group, material, { radius, at }) {
  for (const side of [1, -1]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, radius * 0.3, 8, 20), material);
    ring.rotation.y = Math.PI / 2;
    ring.position.set(at[0], at[1], at[2] * side);
    group.add(ring);
  }
}

/**
 * Extrudes the lower body outline across the car's width.
 * @param {THREE.Shape} outline - Side outline from bodyOutline.
 * @param {number} width - Overall body width.
 * @param {THREE.Material} paint - Body paint.
 * @returns {THREE.Mesh} The body mesh.
 */
function extrudeBody(outline, width, paint) {
  const geometry = new THREE.ExtrudeGeometry(outline, {
    depth: width - 0.2,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.08,
    bevelSegments: 3,
    curveSegments: 10,
  });
  geometry.translate(0, 0, -(width - 0.2) / 2);
  const body = new THREE.Mesh(geometry, paint);
  body.castShadow = body.receiveShadow = true;
  return body;
}

/**
 * Adds the painted roof panel, mirrors and side skirts shared by every model.
 * @param {THREE.Group} group - Car group.
 * @param {object} spec - Brand spec.
 * @param {object} kit - Materials from createKit.
 */
function addCommonParts(group, spec, kit) {
  const [, roofFront, roofRear] = spec.cabin;
  const roofTop = Math.max(roofFront[1], roofRear[1]) + 0.02;
  part(group, kit.paint, {
    size: [roofFront[0] - roofRear[0], 0.05, spec.cabinWidth - 0.1],
    at: [(roofFront[0] + roofRear[0]) / 2, roofTop, 0],
  });
  const [windscreenX, windscreenY] = spec.cabin[0];
  part(group, kit.paint, {
    size: [0.18, 0.1, 0.14],
    at: [windscreenX - 0.12, windscreenY + 0.08, spec.width / 2 + 0.02],
    mirror: true,
  });
  part(group, kit.black, {
    size: [spec.arches[1] - spec.arches[0] - 0.9, 0.08, 0.04],
    at: [(spec.arches[0] + spec.arches[1]) / 2, 0.34, spec.width / 2 + 0.01],
    mirror: true,
  });
}

/**
 * Wheel centres for a spec: rear pair first, then the front pair.
 * @param {object} spec - Brand spec.
 * @returns {number[][]} [x, z] pairs.
 */
function wheelPositions(spec) {
  const track = spec.width / 2 - 0.14;
  return spec.arches.flatMap((x) => [
    [x, -track],
    [x, track],
  ]);
}

/**
 * Hypercar details: horseshoe grille, C-shaped side sweep, roof fin and a full-width tail bar.
 * @param {THREE.Group} group - Car group.
 * @param {object} kit - Materials.
 * @param {object} spec - Brand spec.
 */
function bugattiDetails(group, kit, spec) {
  part(group, kit.black, { size: [0.05, 0.3, 0.3], at: [2.33, 0.46, 0] });
  const horseshoe = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.025, 8, 20, Math.PI),
    kit.chrome,
  );
  // Euler XYZ applies z first: flip the arch into a U, then turn it to face forward.
  horseshoe.rotation.set(0, Math.PI / 2, Math.PI);
  horseshoe.position.set(2.35, 0.56, 0);
  group.add(horseshoe);
  for (const side of [1, -1]) {
    const sweep = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.022, 6, 24, Math.PI), kit.chrome);
    // The C bulges towards the nose and opens towards the rear.
    sweep.rotation.z = -Math.PI / 2;
    sweep.position.set(-0.1, 0.6, (side * spec.width) / 2);
    group.add(sweep);
  }
  part(group, kit.paint, { size: [1.2, 0.07, 0.03], at: [-0.4, 1.27, 0] });
  for (const y of [0.6, 0.53])
    part(group, kit.head, { size: [0.05, 0.035, 0.26], at: [2.3, y, 0.62], mirror: true });
  part(group, kit.tail, { size: [0.05, 0.06, 1.7], at: [-2.28, 0.8, 0] });
  part(group, kit.chrome, { size: [0.06, 0.12, 0.5], at: [-2.3, 0.38, 0] });
}

/**
 * Wedge supercar details: Y-shaped lamps, side intakes, rear wing and a hexagonal exhaust.
 * @param {THREE.Group} group - Car group.
 * @param {object} kit - Materials.
 * @param {object} spec - Brand spec.
 */
function lamborghiniDetails(group, kit, spec) {
  for (const side of [1, -1]) {
    for (const tilt of [0.45, -0.45]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.3), kit.head);
      lamp.position.set(2.3, 0.52, side * 0.64);
      lamp.rotation.x = tilt * side;
      group.add(lamp);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.34), kit.tail);
      tail.position.set(-2.42, 0.74, side * 0.66);
      tail.rotation.x = tilt * side;
      group.add(tail);
    }
  }
  part(group, kit.black, {
    size: [0.7, 0.25, 0.04],
    at: [-0.75, 0.62, spec.width / 2 + 0.01],
    mirror: true,
  });
  part(group, kit.black, { size: [0.05, 0.14, 1.5], at: [2.4, 0.36, 0] });
  part(group, kit.paint, { size: [0.34, 0.04, 1.7], at: [-2.1, 1.1, 0] });
  part(group, kit.black, { size: [0.06, 0.16, 0.05], at: [-2.1, 1.0, 0.6], mirror: true });
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 6), kit.chrome);
  exhaust.rotation.z = Math.PI / 2;
  exhaust.position.set(-2.46, 0.42, 0);
  group.add(exhaust);
}

/**
 * Grand-tourer details: large five-point grille with a chrome wing and twin round tail lamps.
 * @param {THREE.Group} group - Car group.
 * @param {object} kit - Materials.
 */
function mazdaDetails(group, kit) {
  part(group, kit.black, { size: [0.05, 0.28, 0.9], at: [2.3, 0.5, 0] });
  part(group, kit.chrome, { size: [0.04, 0.03, 1.1], at: [2.31, 0.37, 0] });
  part(group, kit.head, { size: [0.06, 0.05, 0.38], at: [2.24, 0.66, 0.6], mirror: true });
  for (const z of [0.5, 0.72]) lampRing(group, kit.tail, { radius: 0.07, at: [-2.26, 0.76, z] });
  part(group, kit.chrome, { size: [0.06, 0.1, 0.16], at: [-2.26, 0.38, 0.5], mirror: true });
}

/**
 * Grand-touring coupe details: four round tail lamps, a rear wing on struts and a V grille.
 * @param {THREE.Group} group - Car group.
 * @param {object} kit - Materials.
 */
function nissanDetails(group, kit) {
  part(group, kit.black, { size: [0.05, 0.22, 0.8], at: [2.4, 0.52, 0] });
  part(group, kit.chrome, { size: [0.04, 0.03, 0.82], at: [2.41, 0.64, 0] });
  part(group, kit.head, { size: [0.06, 0.08, 0.42], at: [2.34, 0.72, 0.6], mirror: true });
  for (const z of [0.45, 0.72]) lampRing(group, kit.tail, { radius: 0.08, at: [-2.4, 0.86, z] });
  part(group, kit.paint, { size: [0.3, 0.04, 1.6], at: [-2.02, 1.24, 0] });
  part(group, kit.black, { size: [0.06, 0.22, 0.05], at: [-2.02, 1.12, 0.55], mirror: true });
  part(group, kit.chrome, { size: [0.06, 0.12, 0.12], at: [-2.4, 0.38, 0.55], mirror: true });
}

// Side profiles (x forward, y up). `body` feeds bodyOutline; `cabin` is the glasshouse: windscreen
// base, roof front, roof rear, rear-window base, closing point.
const BRANDS = {
  bugatti: {
    width: 2.0,
    arches: [-1.4, 1.35],
    archRadius: 0.43,
    front: [
      [2.12, 0.3],
      [2.26, 0.4],
      [2.28, 0.58],
      [2.1, 0.72],
    ],
    rear: [
      [-2.2, 0.3],
      [-2.25, 0.55],
      [-2.2, 0.82],
      [-2.05, 0.9],
    ],
    top: [
      [1.3, 0.82],
      [0.6, 0.9],
      [-1.0, 0.95],
      [-1.9, 0.9],
    ],
    cabin: [
      [0.6, 0.88],
      [-0.15, 1.2],
      [-0.75, 1.21],
      [-1.5, 0.94],
      [-1.4, 0.9],
    ],
    cabinWidth: 1.4,
    rim: '#2a2d30',
    spokes: 6,
    details: bugattiDetails,
  },
  lamborghini: {
    width: 2.03,
    arches: [-1.45, 1.4],
    archRadius: 0.43,
    front: [
      [2.3, 0.3],
      [2.42, 0.38],
      [2.35, 0.55],
    ],
    rear: [
      [-2.35, 0.3],
      [-2.4, 0.6],
      [-2.3, 0.92],
    ],
    top: [
      [1.6, 0.7],
      [0.7, 0.85],
      [-1.2, 0.95],
      [-2.1, 0.92],
    ],
    cabin: [
      [0.75, 0.83],
      [-0.1, 1.13],
      [-0.7, 1.14],
      [-1.6, 0.95],
      [-1.5, 0.92],
    ],
    cabinWidth: 1.3,
    rim: '#16181a',
    spokes: 5,
    details: lamborghiniDetails,
  },
  mazda: {
    width: 1.9,
    arches: [-1.38, 1.4],
    archRadius: 0.42,
    front: [
      [2.1, 0.3],
      [2.25, 0.42],
      [2.24, 0.62],
      [2.05, 0.76],
    ],
    rear: [
      [-2.15, 0.3],
      [-2.2, 0.6],
      [-2.1, 0.85],
      [-1.95, 0.9],
    ],
    top: [
      [1.5, 0.82],
      [0.5, 0.9],
      [-1.2, 0.92],
      [-1.8, 0.88],
    ],
    cabin: [
      [0.4, 0.88],
      [-0.35, 1.18],
      [-0.95, 1.18],
      [-1.75, 0.92],
      [-1.6, 0.88],
    ],
    cabinWidth: 1.35,
    rim: '#9aa0a5',
    spokes: 10,
    details: mazdaDetails,
  },
  nissan: {
    width: 1.9,
    arches: [-1.39, 1.39],
    archRadius: 0.42,
    front: [
      [2.2, 0.3],
      [2.34, 0.44],
      [2.34, 0.66],
      [2.18, 0.8],
    ],
    rear: [
      [-2.3, 0.3],
      [-2.35, 0.6],
      [-2.3, 0.95],
      [-2.15, 1.0],
    ],
    top: [
      [1.6, 0.86],
      [0.7, 0.96],
      [-1.5, 1.0],
      [-2.0, 0.98],
    ],
    cabin: [
      [0.7, 0.95],
      [-0.1, 1.36],
      [-0.95, 1.37],
      [-1.85, 1.0],
      [-1.7, 0.97],
    ],
    cabinWidth: 1.5,
    rim: '#3a3d40',
    spokes: 6,
    details: nissanDetails,
  },
};

/**
 * Builds a black luxury car in the style of one brand.
 * @param {'bugatti' | 'lamborghini' | 'mazda' | 'nissan'} brand - Which style to build.
 * @param {string} color - Body paint colour.
 * @returns {{group: THREE.Group, wheels: THREE.Group[], size: object}} The car model and its
 * footprint half extents.
 */
export function createLuxuryCar(brand, color = VEHICLE_BLACK) {
  const spec = BRANDS[brand];
  const kit = createKit(color);
  const group = new THREE.Group();
  const outline = bodyOutline(spec.front, spec.rear, spec.arches, spec.archRadius, spec.top);
  group.add(extrudeBody(outline, spec.width, kit.paint));
  group.add(extrudeProfile(spec.cabin, spec.cabinWidth, kit.glass, 0.08));
  addCommonParts(group, spec, kit);
  spec.details(group, kit, spec);
  const wheels = addWheels(group, wheelPositions(spec), 0.36, 0.28, spec.rim, spec.spokes);
  return { group, wheels, size: measureFootprint(group) };
}
