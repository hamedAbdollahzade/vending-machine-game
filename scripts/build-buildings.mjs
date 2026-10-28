// Adds Microsoft's ML building footprints to the game world as public/data/buildings.bin.
//
// Usage:
//   node scripts/build-buildings.mjs <global-buildings quadkey file .csv.gz>
//
// The file comes from https://minedbuildings.z5.web.core.windows.net/global-buildings/dataset-links.csv
// (row "Iran,123012100" covers Mashhad). Footprints © Microsoft, ODbL.
//
// OSM buildings in src/data/mellat.json stay as they are; a Microsoft footprint whose centre lies
// inside an OSM building is dropped, as is anything inside the factory compound (drawn by the game).
// Microsoft has no heights for Iran, so they are estimated from footprint area and land use.
//
// Binary layout (little-endian): "RMB2", count u32, origin x f32, origin z f32, step f32, then per building:
// vertex count u8, height in 0.5 m u8, first vertex (x u16, z u16) in `step` metres from that origin,
// then each further vertex as (dx i16, dz i16) from the one before. Buildings are sorted west to
// east in 100 m strips, so neighbours sit next to each other and the small deltas gzip well.
import { createReadStream, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import { toLocal } from '../src/utils/geo.js';
import { FACTORY } from '../src/constants/locations.js';
import { createCollisionWorld, blocked } from '../src/game/world/collision.js';

const [source] = process.argv.slice(2);
if (!source) {
  console.error('usage: node scripts/build-buildings.mjs <global-buildings .csv.gz>');
  process.exit(1);
}
const STEP = 0.5;
const data = JSON.parse(readFileSync(new URL('../src/data/mellat.json', import.meta.url), 'utf8'));
const { minX, minZ, maxX, maxZ } = data.bounds;
const osm = createCollisionWorld(data.buildings.map((b) => b.slice(1)));
const areasOf = (kind) =>
  data.areas.filter((a) => data.areaKinds[a[0]] === kind).map((a) => a.slice(1));
const industrial = createCollisionWorld(areasOf('industrial')),
  parks = createCollisionWorld([...areasOf('park'), ...areasOf('forest')]);

// The factory compound in its own frame (u along the driveway, v across), with a margin.
const normal = { x: -FACTORY.axis.z, z: FACTORY.axis.x };
const inFactory = (x, z) => {
  const dx = x - FACTORY.center.x,
    dz = z - FACTORY.center.z;
  const u = dx * FACTORY.axis.x + dz * FACTORY.axis.z,
    v = dx * normal.x + dz * normal.z;
  return u > -115 && u < 85 && v > -55 && v < 55;
};

const hash = (n) => {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};

// Outside the Payambar-e Azam ring (west of ~59.47°E or north of ~36.40°N) the region is industrial
// estates and villages, not apartment blocks.
const outskirts = (x, z) => x < -6000 || z < -9400;

// Storeys of 3.2 m, picked from the footprint area; warehouses are one tall storey.
export function estimateHeight(area, { inIndustrial, inPark, inOutskirts }, seed) {
  const r = hash(seed),
    pick = (lo, hi) => lo + Math.floor(r * (hi - lo + 1));
  if (inPark) return 3.2;
  if ((inIndustrial || inOutskirts) && area >= 250) return 6 + r * 3;
  if (inOutskirts) return pick(1, 2) * 3.2;
  if (inIndustrial && area >= 150) return 7 + r * 3;
  if (area < 40) return 3.2;
  if (area < 120) return pick(2, 3) * 3.2;
  if (area < 300) return pick(3, 4) * 3.2;
  if (area < 800) return pick(4, 6) * 3.2;
  return pick(5, 8) * 3.2;
}

const polygonArea = (pts) => {
  let a = 0;
  for (let i = 0; i < pts.length; i += 2) {
    const j = (i + 2) % pts.length;
    a += pts[i] * pts[j + 1] - pts[j] * pts[i + 1];
  }
  return Math.abs(a / 2);
};

const out = [];
let read = 0,
  outside = 0,
  duplicate = 0,
  factory = 0,
  tiny = 0;
const lines = createInterface({ input: createReadStream(source).pipe(createGunzip()) });
for await (const line of lines) {
  if (!line.trim()) continue;
  read++;
  const ring = JSON.parse(line).geometry.coordinates[0];
  const pts = [];
  for (const [lon, lat] of ring.slice(0, -1)) {
    const p = toLocal(lat, lon);
    pts.push(p.x, p.z);
  }
  let cx = 0,
    cz = 0;
  for (let i = 0; i < pts.length; i += 2) {
    cx += pts[i];
    cz += pts[i + 1];
  }
  cx /= pts.length / 2;
  cz /= pts.length / 2;
  if (cx < minX || cx > maxX || cz < minZ || cz > maxZ) {
    outside++;
    continue;
  }
  if (pts.length / 2 > 255 || pts.length < 6) continue;
  const area = polygonArea(pts);
  if (area < 12) {
    tiny++;
    continue;
  }
  if (blocked(osm, cx, cz)) {
    duplicate++;
    continue;
  }
  if (inFactory(cx, cz)) {
    factory++;
    continue;
  }
  const height = estimateHeight(
    area,
    {
      inIndustrial: blocked(industrial, cx, cz),
      inPark: blocked(parks, cx, cz),
      inOutskirts: outskirts(cx, cz),
    },
    Math.round(cx * 7 + cz * 13),
  );
  out.push({ height, pts });
}

let bytes = 20;
for (const b of out) bytes += 2 + b.pts.length * 2;
const buffer = new ArrayBuffer(bytes),
  view = new DataView(buffer);
[0x52, 0x4d, 0x42, 0x32].forEach((c, i) => view.setUint8(i, c));
out.sort((a, b) => Math.floor(a.pts[1] / 100) - Math.floor(b.pts[1] / 100) || a.pts[0] - b.pts[0]);
view.setUint32(4, out.length, true);
// Coordinates are stored from a point 200 m outside the region, so edge buildings never go negative.
const originX = minX - 200,
  originZ = minZ - 200;
view.setFloat32(8, originX, true);
view.setFloat32(12, originZ, true);
view.setFloat32(16, STEP, true);
let o = 20;
for (const b of out) {
  view.setUint8(o++, b.pts.length / 2);
  view.setUint8(o++, Math.min(255, Math.round(b.height / 0.5)));
  let px = 0,
    pz = 0;
  for (let i = 0; i < b.pts.length; i += 2) {
    const qx = Math.round((b.pts[i] - originX) / STEP),
      qz = Math.round((b.pts[i + 1] - originZ) / STEP);
    if (i === 0) {
      view.setUint16(o, qx, true);
      view.setUint16(o + 2, qz, true);
    } else {
      view.setInt16(o, qx - px, true);
      view.setInt16(o + 2, qz - pz, true);
    }
    px = qx;
    pz = qz;
    o += 4;
  }
}
mkdirSync(new URL('../public/data/', import.meta.url), { recursive: true });
writeFileSync(new URL('../public/data/buildings.bin', import.meta.url), new Uint8Array(buffer));
console.log(
  `read ${read}, kept ${out.length}, outside ${outside}, OSM duplicates ${duplicate}, factory ${factory}, tiny ${tiny}, ${(bytes / 1e6).toFixed(1)} MB`,
);
