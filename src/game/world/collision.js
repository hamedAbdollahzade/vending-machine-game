// 2D collision against building footprints, stored as flat [x0, z0, x1, z1, …] rings.
const CELL = 24;
/**
 * Runs the key operation for this subsystem.
 * @param {*} cx - cx.
 * @param {*} cz - cz.
 * @returns {*} Operation result, when applicable.
 */
const key = (cx, cz) => cx * 100003 + cz;
/**
 * Creates collision world resources for the game.
 * @param {*} polygons - polygons.
 * @returns {*} Operation result, when applicable.
 */
export function createCollisionWorld(polygons) {
  const world = {
    polygons: [],
    grid: new Map(),
  };
  polygons.forEach((p) => addPolygon(world, p));
  return world;
}
/**
 * Runs the add polygon operation for this subsystem.
 * @param {*} world - world.
 * @param {*} pts - pts.
 * @returns {*} Operation result, when applicable.
 */
export function addPolygon(world, pts) {
  let minX = Infinity,
    minZ = Infinity,
    maxX = -Infinity,
    maxZ = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    minX = Math.min(minX, pts[i]);
    maxX = Math.max(maxX, pts[i]);
    minZ = Math.min(minZ, pts[i + 1]);
    maxZ = Math.max(maxZ, pts[i + 1]);
  }
  const index =
    world.polygons.push({
      pts,
      minX,
      minZ,
      maxX,
      maxZ,
    }) - 1;
  for (let cx = Math.floor(minX / CELL); cx <= Math.floor(maxX / CELL); cx++)
    for (let cz = Math.floor(minZ / CELL); cz <= Math.floor(maxZ / CELL); cz++) {
      const k = key(cx, cz);
      if (!world.grid.has(k)) world.grid.set(k, []);
      world.grid.get(k).push(index);
    }
}
/**
 * Runs the nearby operation for this subsystem.
 * @param {*} world - world.
 * @param {*} x - x.
 * @param {*} z - z.
 * @param {*} r - r.
 * @returns {*} Operation result, when applicable.
 */
function nearby(world, x, z, r) {
  const found = new Set();
  for (let cx = Math.floor((x - r) / CELL); cx <= Math.floor((x + r) / CELL); cx++)
    for (let cz = Math.floor((z - r) / CELL); cz <= Math.floor((z + r) / CELL); cz++)
      for (const i of world.grid.get(key(cx, cz)) ?? []) found.add(i);
  return [...found]
    .map((i) => world.polygons[i])
    .filter((p) => x + r > p.minX && x - r < p.maxX && z + r > p.minZ && z - r < p.maxZ);
}
/**
 * Runs the inside polygon operation for this subsystem.
 * @param {*} pts - pts.
 * @param {*} x - x.
 * @param {*} z - z.
 * @returns {*} Operation result, when applicable.
 */
export function insidePolygon(pts, x, z) {
  let inside = false;
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    const xi = pts[i],
      zi = pts[i + 1],
      xj = pts[j],
      zj = pts[j + 1];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
/**
 * Runs the closest on edges operation for this subsystem.
 * @param {*} pts - pts.
 * @param {*} x - x.
 * @param {*} z - z.
 * @returns {*} Operation result, when applicable.
 */
function closestOnEdges(pts, x, z) {
  let best = {
    d: Infinity,
    x: 0,
    z: 0,
  };
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    const ax = pts[j],
      az = pts[j + 1],
      dx = pts[i] - ax,
      dz = pts[i + 1] - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    const px = ax + dx * t,
      pz = az + dz * t,
      d = Math.hypot(x - px, z - pz);
    if (d < best.d)
      best = {
        d,
        x: px,
        z: pz,
      };
  }
  return best;
}

// Pushes a circle out of every footprint it overlaps. Returns the corrected position.
/**
 * Runs the resolve circle operation for this subsystem.
 * @param {*} world - world.
 * @param {*} x - x.
 * @param {*} z - z.
 * @param {*} r - r.
 * @returns {*} Operation result, when applicable.
 */
export function resolveCircle(world, x, z, r) {
  let hit = false;
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (const p of nearby(world, x, z, r)) {
      const inside = insidePolygon(p.pts, x, z),
        c = closestOnEdges(p.pts, x, z);
      if (!inside && c.d >= r) continue;
      const len = c.d || 1e-6,
        nx = ((x - c.x) / len) * (inside ? -1 : 1),
        nz = ((z - c.z) / len) * (inside ? -1 : 1);
      x = c.x + nx * r;
      z = c.z + nz * r;
      moved = hit = true;
    }
    if (!moved) break;
  }
  return {
    x,
    z,
    hit,
  };
}
/**
 * Runs the blocked operation for this subsystem.
 * @param {*} world - world.
 * @param {*} x - x.
 * @param {*} z - z.
 * @returns {*} Operation result, when applicable.
 */
export const blocked = (world, x, z) =>
  nearby(world, x, z, 0).some((p) => insidePolygon(p.pts, x, z));

// Fraction (0–1) of the segment a→b that is free before it enters a footprint.
/**
 * Runs the clear fraction operation for this subsystem.
 * @param {*} world - world.
 * @param {*} ax - ax.
 * @param {*} az - az.
 * @param {*} bx - bx.
 * @param {*} bz - bz.
 * @param {*} step - step.
 * @returns {*} Operation result, when applicable.
 */
export function clearFraction(world, ax, az, bx, bz, step = 1) {
  const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (blocked(world, ax + (bx - ax) * t, az + (bz - az) * t)) return (i - 1) / steps;
  }
  return 1;
}
