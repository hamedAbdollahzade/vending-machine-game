import * as THREE from 'three';

// Low-poly saloon facing local +X, sized like a Peugeot/Samand (4.4 m long).
/**
 * Creates car model resources for the game.
 * @param {*} color - color.
 * @returns {*} Operation result, when applicable.
 */
export function createCarModel(color = '#d9d9d4') {
  const group = new THREE.Group();
  /**
   * Runs the mat operation for this subsystem.
   * @param {*} c - c.
   * @param {*} extra - extra.
   * @returns {*} Operation result, when applicable.
   */
  const mat = (c, extra = {}) =>
    new THREE.MeshStandardMaterial({
      color: c,
      roughness: 0.45,
      ...extra,
    });
  const paint = mat(color, {
      metalness: 0.55,
      roughness: 0.35,
    }),
    glass = mat('#1e2c33', {
      metalness: 0.6,
      roughness: 0.15,
    });
  const dark = mat('#141618'),
    chrome = mat('#c8ccce', {
      metalness: 0.9,
      roughness: 0.2,
    });
  /**
   * Runs the box operation for this subsystem.
   * @param {*} w - w.
   * @param {*} h - h.
   * @param {*} d - d.
   * @param {*} m - m.
   * @param {*} x - x.
   * @param {*} y - y.
   * @param {*} z - z.
   * @returns {*} Operation result, when applicable.
   */
  const box = (w, h, d, m, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  box(4.4, 0.62, 1.78, paint, 0, 0.68, 0);
  box(4.42, 0.16, 1.8, dark, 0, 0.38, 0);
  const cabin = box(2.3, 0.62, 1.6, glass, -0.25, 1.28, 0);
  cabin.scale.set(1, 1, 0.98);
  box(2.1, 0.08, 1.62, paint, -0.25, 1.62, 0);
  box(0.9, 0.06, 1.7, paint, 1.45, 1.0, 0).rotation.z = -0.12;
  for (const z of [-0.62, 0.62]) {
    box(
      0.06,
      0.18,
      0.34,
      mat('#fff4cc', {
        emissive: '#fff1b0',
        emissiveIntensity: 0.6,
      }),
      2.21,
      0.78,
      z,
    );
    box(
      0.06,
      0.16,
      0.34,
      mat('#b3261e', {
        emissive: '#7a0f0b',
        emissiveIntensity: 0.5,
      }),
      -2.21,
      0.8,
      z,
    );
    box(0.18, 0.08, 0.1, chrome, 0.6, 1.02, z * 1.47);
  }
  box(0.04, 0.12, 1.0, chrome, 2.22, 0.6, 0);
  const wheels = [];
  for (const x of [-1.38, 1.38])
    for (const z of [-0.86, 0.86]) {
      const wheel = new THREE.Group();
      wheel.position.set(x, 0.36, z);
      const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 18), dark);
      tyre.rotation.x = Math.PI / 2;
      tyre.castShadow = true;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.27, 10), chrome);
      hub.rotation.x = Math.PI / 2;
      wheel.add(tyre, hub);
      group.add(wheel);
      wheels.push(wheel);
    }
  return {
    group,
    wheels,
  };
}
const COLORS = [
  '#e9e9e4',
  '#1d1f22',
  '#9aa3a8',
  '#d6c9a5',
  '#7e1f1d',
  '#2f4a6b',
  '#f2c94c',
  '#efefea',
];

// Ambient cars on the main roads. They stay within a few hundred metres of the player: a car that
// falls too far behind is moved to a road ahead or around them. Cars stop for anything in their lane.
const WIDTH = [11, 10, 9, 8]; // trunk … tertiary, matching the road strips in city.js

// Body size of a traffic car (createCarModel), for collisions and lane checks.
export const TRAFFIC_CAR = { halfLength: 2.2, halfWidth: 0.88 };
// Extra side clearance a traffic car wants before it drives past something.
const PASSING_MARGIN = 0.25;
// Half width assumed for an obstacle that doesn't give one, such as a pedestrian.
const DEFAULT_OBSTACLE_HALF_WIDTH = 0.4;

/**
 * Creates traffic resources for the game.
 * @param {*} scene - scene.
 * @param {*} data - data.
 * @param {*} count - count.
 * @returns {*} Operation result, when applicable.
 */
export function createTraffic(scene, data, count = 28) {
  const oneway = new Set(data.oneway ?? []);
  const roads = data.roads
    .flatMap((r, index) => {
      if (r[0] > 3) return [];
      const pts = [];
      for (let i = 2; i < r.length; i += 2) pts.push(new THREE.Vector2(r[i], r[i + 1]));
      const lengths = [0];
      for (let i = 1; i < pts.length; i++)
        lengths.push(lengths[i - 1] + pts[i].distanceTo(pts[i - 1]));
      const xs = pts.map((p) => p.x),
        zs = pts.map((p) => p.y);
      return [
        {
          pts,
          lengths,
          total: lengths.at(-1),
          width: WIDTH[r[0]],
          oneway: oneway.has(index),
          box: {
            x0: Math.min(...xs),
            x1: Math.max(...xs),
            z0: Math.min(...zs),
            z1: Math.max(...zs),
          },
        },
      ];
    })
    .filter((r) => r.total > 80);
  /**
   * Runs the sample operation for this subsystem.
   * @param {*} road - road.
   * @param {*} d - d.
   * @returns {*} Operation result, when applicable.
   */
  const sample = (road, d) => {
    let i = 1;
    while (i < road.lengths.length - 1 && road.lengths[i] < d) i++;
    const a = road.pts[i - 1],
      b = road.pts[i],
      t = (d - road.lengths[i - 1]) / (road.lengths[i] - road.lengths[i - 1] || 1);
    return {
      x: a.x + (b.x - a.x) * t,
      z: a.y + (b.y - a.y) * t,
      dx: b.x - a.x,
      dz: b.y - a.y,
    };
  };
  let seed = 7;
  /**
   * Runs the random operation for this subsystem.

   * @returns {*} Operation result, when applicable.
   */
  const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  // Roads whose bounding box comes within 600 m of the player, refreshed as they travel.
  let nearby = [],
    nearbyAt = null;
  /**
   * Runs the roads near operation for this subsystem.
   * @param {*} x - x.
   * @param {*} z - z.
   * @returns {*} Operation result, when applicable.
   */
  const roadsNear = (x, z) => {
    if (!nearbyAt || Math.hypot(x - nearbyAt.x, z - nearbyAt.z) > 150) {
      nearbyAt = {
        x,
        z,
      };
      nearby = roads.filter(
        ({ box }) => x > box.x0 - 600 && x < box.x1 + 600 && z > box.z0 - 600 && z < box.z1 + 600,
      );
    }
    return nearby;
  };
  // Places a car on a random main-road point between 120 and 600 m from (x, z), if one exists.
  /**
   * Runs the respawn operation for this subsystem.
   * @param {*} car - car.
   * @param {*} x - x.
   * @param {*} z - z.
   * @returns {*} Operation result, when applicable.
   */
  function respawn(car, x, z) {
    const candidates = roadsNear(x, z);
    for (let attempt = 0; attempt < 30 && candidates.length; attempt++) {
      const road = candidates[Math.floor(random() * candidates.length)],
        d = random() * road.total,
        p = sample(road, d);
      const dist = Math.hypot(p.x - x, p.z - z);
      if (dist < 120 || dist > 600) continue;
      // One-way carriageways: with the flow, in either of two lanes. Two-way roads: right-hand half.
      const lane = road.oneway ? ((random() < 0.5 ? -1 : 1) * road.width) / 4 : road.width / 4;
      Object.assign(car, {
        road,
        d,
        dir: road.oneway || random() < 0.5 ? 1 : -1,
        lane,
        speed: 9 + random() * 7,
      });
      car.model.group.visible = true;
      return true;
    }
    car.model.group.visible = false;
    return false;
  }
  // All traffic sits in one group so it can be hidden as a whole (camera AR view).
  const group = new THREE.Group(),
    cars = [];
  scene.add(group);
  for (let i = 0; i < count; i++) {
    const color = COLORS[i % COLORS.length];
    const model = createCarModel(color);
    group.add(model.group);
    model.group.visible = false;
    cars.push({
      model,
      color,
      halfWidth: TRAFFIC_CAR.halfWidth,
      road: null,
      d: 0,
      dir: 1,
      lane: 2.2,
      speed: 10,
      x: 1e9,
      z: 1e9,
    });
  }
  // Takes a car off the road; it respawns out of sight on a later frame.
  /**
   * Runs the remove operation for this subsystem.
   * @param {*} car - car.
   * @returns {*} Operation result, when applicable.
   */
  function remove(car) {
    car.road = null;
    car.x = car.z = 1e9;
    car.model.group.visible = false;
  }
  /**
   * Hands a traffic car's model over to the player, who takes it as their own vehicle. The traffic
   * slot gets a fresh model of the same colour and respawns out of sight later.
   * @param {object} car - The traffic car being taken.
   * @returns {{group: THREE.Group, wheels: THREE.Group[]}} The model that now belongs to the player.
   */
  function adopt(car) {
    const { model } = car;
    group.remove(model.group);
    car.model = createCarModel(car.color);
    group.add(car.model.group);
    remove(car);
    return model;
  }
  let cursor = 0;
  /**
   * Updates update from the active simulation.
   * @param {*} dt - dt.
   * @param {*} obstacles - obstacles.
   * @param {*} around - around.
   * @returns {*} Operation result, when applicable.
   */
  function update(dt, obstacles, around) {
    // Re-home a couple of distant cars per frame, which keeps the cost per frame small.
    for (let n = 0; n < 2; n++) {
      const car = cars[(cursor = (cursor + 1) % cars.length)];
      if (!car.road || Math.hypot(car.x - around.x, car.z - around.z) > 800)
        respawn(car, around.x, around.z);
    }
    for (const car of cars) {
      if (!car.road || !car.model.group.visible) continue;
      const here = sample(car.road, car.d),
        len = Math.hypot(here.dx, here.dz) || 1;
      const fx = (here.dx / len) * car.dir,
        fz = (here.dz / len) * car.dir;
      const ahead = obstacles
        .concat(cars.filter((c) => c !== car && c.model.group.visible))
        .some((o) => {
          const ox = o.x - car.x,
            oz = o.z - car.z,
            along = ox * fx + oz * fz;
          // Only something that really overlaps the lane stops the car, so a car or walker
          // beside the lane doesn't bring traffic to a halt.
          const reach =
            TRAFFIC_CAR.halfWidth + (o.halfWidth ?? DEFAULT_OBSTACLE_HALF_WIDTH) + PASSING_MARGIN;
          return along > 0 && along < 9 && Math.abs(ox * fz - oz * fx) < reach;
        });
      const speed = ahead ? 0 : car.speed;
      car.d += speed * car.dir * dt;
      if (car.d > car.road.total || car.d < 0) {
        // At the end of a one-way road the car leaves; on a two-way road it turns back.
        if (car.road.oneway) {
          remove(car);
          continue;
        }
        car.dir *= -1;
        car.d = Math.max(0, Math.min(car.road.total, car.d));
      }
      // Keep to the right-hand lane relative to the direction of travel.
      const p = sample(car.road, car.d);
      car.x = p.x - fz * car.lane;
      car.z = p.z + fx * car.lane;
      car.model.group.position.set(car.x, 0, car.z);
      car.model.group.rotation.y = Math.atan2(-fz, fx);
      for (const wheel of car.model.wheels) wheel.rotation.z -= (speed * dt) / 0.36;
    }
  }
  return {
    group,
    cars,
    update,
    remove,
    adopt,
  };
}
