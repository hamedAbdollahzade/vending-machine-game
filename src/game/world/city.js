import * as THREE from 'three';
import { nearestSegment, DRIVABLE_MAX_TYPE } from './routing.js';
import { blocked, insidePolygon } from './collision.js';

// Road widths in metres per OSM highway type. Dual carriageways are two separate one-way ways.
const WIDTH = {
  trunk: 11,
  primary: 10,
  secondary: 9,
  tertiary: 8,
  unclassified: 6.5,
  residential: 6,
  living_street: 5,
  service: 4,
  pedestrian: 4,
  footway: 2.4,
  cycleway: 2,
  path: 1.6,
  track: 3,
  steps: 2.2,
};
const BUCKET = {
  trunk: 'major',
  primary: 'major',
  secondary: 'major',
  tertiary: 'minor',
  unclassified: 'minor',
  residential: 'minor',
  living_street: 'minor',
  service: 'minor',
  pedestrian: 'paved',
  footway: 'paved',
  cycleway: 'paved',
  steps: 'paved',
  path: 'dirt',
  track: 'dirt',
};
// Ground layers: height above the ground plane and polygon offset, so overlaps never flicker.
const LAYER = {
  industrial: [0.006, 1],
  farmland: [0.008, 1],
  campus: [0.01, 1],
  park: [0.02, 2],
  grass: [0.025, 3],
  forest: [0.025, 3],
  pitch: [0.03, 4],
  water: [0.035, 5],
  sidewalk: [0.04, 6],
  dirt: [0.045, 7],
  paved: [0.05, 8],
  minor: [0.06, 9],
  major: [0.07, 10],
};
const AREA_COLOR = {
  campus: '#d8ccb2',
  park: '#7a9a55',
  grass: '#8aa660',
  forest: '#5d7f47',
  pitch: '#5f9a58',
  water: '#4f93a8',
  industrial: '#bdb6a6',
  farmland: '#a8a46e',
};
const BUILDING_COLORS = [
  '#dccbaa',
  '#e7dcc4',
  '#c9a585',
  '#bdb4a3',
  '#ece6da',
  '#d2b48f',
  '#b7957a',
].map((c) => new THREE.Color(c));
/**
 * Runs the canvas texture operation for this subsystem.
 * @param {*} width - width.
 * @param {*} height - height.
 * @param {*} draw - draw.
 * @param {*} repeat - repeat.
 * @returns {*} Operation result, when applicable.
 */
function canvasTexture(width, height, draw, repeat = true) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}
/**
 * Runs the noise operation for this subsystem.
 * @param {*} c - c.
 * @param {*} w - w.
 * @param {*} h - h.
 * @param {*} base - base.
 * @param {*} spread - spread.
 * @param {*} count - count.
 * @returns {*} Operation result, when applicable.
 */
function noise(c, w, h, base, spread, count) {
  c.fillStyle = base;
  c.fillRect(0, 0, w, h);
  for (let i = 0; i < count; i++) {
    const v = Math.random() * spread - spread / 2;
    c.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
    c.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
}
/**
 * Runs the textures operation for this subsystem.

 * @returns {*} Operation result, when applicable.
 */
const textures = () => ({
  major: canvasTexture(128, 256, (c, w, h) => {
    noise(c, w, h, '#4a4d50', 0.12, 1800);
    c.fillStyle = '#e8e4d6';
    c.fillRect(6, 0, 4, h);
    c.fillRect(w - 10, 0, 4, h);
    c.fillRect(w / 2 - 2, 0, 4, h * 0.45);
  }),
  minor: canvasTexture(128, 256, (c, w, h) => noise(c, w, h, '#58595a', 0.12, 1600)),
  paved: canvasTexture(128, 128, (c, w, h) => {
    noise(c, w, h, '#c4b597', 0.1, 900);
    c.strokeStyle = 'rgba(90,70,50,.25)';
    for (let i = 0; i <= 4; i++) {
      c.beginPath();
      c.moveTo(0, i * 32);
      c.lineTo(w, i * 32);
      c.moveTo(i * 32 + (i % 2) * 16, 0);
      c.lineTo(i * 32 + (i % 2) * 16, h);
      c.stroke();
    }
  }),
  sidewalk: canvasTexture(128, 128, (c, w, h) => {
    noise(c, w, h, '#b9b1a1', 0.1, 900);
    c.fillStyle = '#d9d4c8';
    c.fillRect(0, 0, 10, h);
    c.fillRect(w - 10, 0, 10, h);
  }),
  dirt: canvasTexture(64, 64, (c, w, h) => noise(c, w, h, '#b39d78', 0.15, 500)),
  walls: canvasTexture(128, 128, (c, w, h) => {
    noise(c, w, h, '#f1ede4', 0.06, 600);
    const g = c.createLinearGradient(0, 30, 0, 96);
    g.addColorStop(0, '#7c95a3');
    g.addColorStop(1, '#3b4b55');
    c.fillStyle = '#8e8679';
    c.fillRect(28, 26, 72, 70);
    c.fillStyle = g;
    c.fillRect(32, 30, 64, 62);
    c.fillStyle = 'rgba(255,255,255,.18)';
    c.fillRect(34, 32, 18, 58);
    c.fillStyle = '#8e8679';
    c.fillRect(62, 30, 4, 62);
    c.fillStyle = 'rgba(0,0,0,.12)';
    c.fillRect(0, 118, w, 10);
  }),
});

// Pushes a strip of quads along a polyline into a geometry buffer.
/**
 * Runs the ribbon operation for this subsystem.
 * @param {*} out - out.
 * @param {*} pts - pts.
 * @param {*} width - width.
 * @param {*} y - y.
 * @param {*} repeat - repeat.
 * @returns {*} Operation result, when applicable.
 */
function ribbon(out, pts, width, y, repeat) {
  const n = pts.length / 2;
  if (n < 2) return;
  const base = out.pos.length / 3,
    half = width / 2;
  let along = 0;
  for (let i = 0; i < n; i++) {
    const x = pts[i * 2],
      z = pts[i * 2 + 1];
    if (i) along += Math.hypot(x - pts[i * 2 - 2], z - pts[i * 2 - 1]);
    /**
     * Runs the seg operation for this subsystem.
     * @param {*} a - a.
     * @param {*} b - b.
     * @returns {*} Operation result, when applicable.
     */
    const seg = (a, b) => {
      const dx = pts[b * 2] - pts[a * 2],
        dz = pts[b * 2 + 1] - pts[a * 2 + 1],
        len = Math.hypot(dx, dz) || 1;
      return [-dz / len, dx / len];
    };
    const n1 = seg(Math.max(0, i - 1), Math.max(1, i)),
      n2 = seg(Math.min(n - 2, i), Math.min(n - 1, i + 1));
    let nx = n1[0] + n2[0],
      nz = n1[1] + n2[1];
    const len = Math.hypot(nx, nz) || 1;
    nx /= len;
    nz /= len;
    const miter = half / Math.max(0.45, nx * n1[0] + nz * n1[1]);
    out.pos.push(x + nx * miter, y, z + nz * miter, x - nx * miter, y, z - nz * miter);
    out.uv.push(0, along / repeat, 1, along / repeat);
    if (i) {
      const a = base + (i - 1) * 2;
      // Wound so the strip faces up (+y) and survives back-face culling.
      out.idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
}
/**
 * Runs the disc operation for this subsystem.
 * @param {*} out - out.
 * @param {*} x - x.
 * @param {*} z - z.
 * @param {*} radius - radius.
 * @param {*} y - y.
 * @returns {*} Operation result, when applicable.
 */
function disc(out, x, z, radius, y) {
  const base = out.pos.length / 3;
  out.pos.push(x, y, z);
  out.uv.push(0.25, 0);
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    out.pos.push(x + Math.cos(a) * radius, y, z + Math.sin(a) * radius);
    out.uv.push(0.25, 0);
    if (i) out.idx.push(base, base + i + 1, base + i);
  }
}
/**
 * Runs the polygon triangles operation for this subsystem.
 * @param {*} pts - pts.
 * @returns {*} Operation result, when applicable.
 */
function polygonTriangles(pts) {
  const contour = [];
  for (let i = 0; i < pts.length; i += 2) contour.push(new THREE.Vector2(pts[i], pts[i + 1]));
  try {
    return THREE.ShapeUtils.triangulateShape(contour, []);
  } catch {
    return [];
  }
}

// Flat polygon facing up; triangles are flipped where needed so normals point to the sky.
/**
 * Runs the flat polygon operation for this subsystem.
 * @param {*} out - out.
 * @param {*} pts - pts.
 * @param {*} y - y.
 * @param {*} uvScale - uv Scale.
 * @param {*} color - color.
 * @returns {*} Operation result, when applicable.
 */
function flatPolygon(out, pts, y, uvScale = 0, color = null) {
  const base = out.pos.length / 3;
  for (let i = 0; i < pts.length; i += 2) {
    out.pos.push(pts[i], y, pts[i + 1]);
    out.uv?.push(pts[i] * uvScale, pts[i + 1] * uvScale);
    if (color) out.col.push(color.r, color.g, color.b);
  }
  for (const [a, b, c] of polygonTriangles(pts)) {
    const cross =
      (pts[b * 2 + 1] - pts[a * 2 + 1]) * (pts[c * 2] - pts[a * 2]) -
      (pts[b * 2] - pts[a * 2]) * (pts[c * 2 + 1] - pts[a * 2 + 1]);
    out.idx.push(base + a, ...(cross >= 0 ? [base + b, base + c] : [base + c, base + b]));
  }
}
/**
 * Runs the to mesh operation for this subsystem.
 * @param {*} out - out.
 * @param {*} material - material.
 * @param {*} normals - normals.
 * @returns {*} Operation result, when applicable.
 */
function toMesh(out, material, normals = 'up') {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3));
  if (out.uv?.length) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(out.uv, 2));
  if (out.col?.length) geometry.setAttribute('color', new THREE.Float32BufferAttribute(out.col, 3));
  geometry.setIndex(out.idx);
  if (normals === 'up')
    geometry.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute(
        new Float32Array(out.pos.length).map((_, i) => (i % 3 === 1 ? 1 : 0)),
        3,
      ),
    );
  else geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}
/**
 * Runs the ground material operation for this subsystem.
 * @param {*} options - options.
 * @param {*} layer - layer.
 * @returns {*} Operation result, when applicable.
 */
const groundMaterial = (options, layer) =>
  new THREE.MeshStandardMaterial({
    roughness: 0.95,
    ...options,
    polygonOffset: true,
    polygonOffsetFactor: -layer,
    polygonOffsetUnits: -layer * 2,
  });
/**
 * Runs the seeded operation for this subsystem.
 * @param {*} seed - seed.
 * @returns {*} Operation result, when applicable.
 */
function seeded(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
/**
 * Runs the signed area operation for this subsystem.
 * @param {*} pts - pts.
 * @returns {*} Operation result, when applicable.
 */
function signedArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i += 2) {
    const j = (i + 2) % pts.length;
    a += pts[i] * pts[j + 1] - pts[j] * pts[i + 1];
  }
  return a / 2;
}

// The world is split into 2 km chunks (buildings: 500 m blocks); meshes out of view range are hidden.
const CHUNK = 2000,
  BLOCK = 500;

// With satellite imagery the photo shows the real roads and land, so the drawn roads and areas are
// left out; `extraBuildings` are footprints beyond OSM (Microsoft's, see buildings-data.js).
/**
 * Creates city resources for the game.
 * @param {*} scene - scene.
 * @param {*} data - data.
 * @param {*} options2 - Operation options.
 * @returns {*} Operation result, when applicable.
 */
export function createCity(
  scene,
  data,
  { collision, segments, extraBuildings = [], satellite = false, lowQuality = false },
) {
  const build = {
    scene,
    data,
    collision,
    segments,
    extraBuildings,
    satellite,
    lowQuality,
  };
  for (const [name, method] of Object.entries(CITY_METHODS))
    build[name] = (...args) => method(build, ...args);
  for (const initialize of CITY_STEPS) initialize(build);
  return build.result;
}
/**
 * Runs the city build block operation for this subsystem.
 * @param {*} build - build.
 * @param {*} block - block.
 * @returns {*} Operation result, when applicable.
 */
function cityBuildBlock(build, block) {
  const walls = {
      pos: [],
      uv: [],
      col: [],
      idx: [],
    },
    roofs = {
      pos: [],
      col: [],
      idx: [],
    };
  for (const building of block.buildings) {
    const height = building[0];
    let pts = building.slice(1);
    if (signedArea(pts) > 0) {
      const reversed = [];
      for (let i = pts.length - 2; i >= 0; i -= 2) reversed.push(pts[i], pts[i + 1]);
      pts = reversed;
    }
    // Colour picked from the position, so a block looks the same every time it is built.
    const shade = Math.abs(Math.sin(pts[0] * 12.9898 + pts[1] * 78.233) * 43758.5453) % 1;
    const color = BUILDING_COLORS[Math.floor(shade * BUILDING_COLORS.length)]
      .clone()
      .multiplyScalar(0.9 + ((shade * 7) % 1) * 0.15);
    let along = 0;
    for (let i = 0; i < pts.length; i += 2) {
      const j = (i + 2) % pts.length,
        ax = pts[i],
        az = pts[i + 1],
        bx = pts[j],
        bz = pts[j + 1];
      const len = Math.hypot(bx - ax, bz - az),
        base = walls.pos.length / 3;
      walls.pos.push(ax, 0, az, bx, 0, bz, bx, height, bz, ax, height, az);
      walls.uv.push(
        along / 3.6,
        0,
        (along + len) / 3.6,
        0,
        (along + len) / 3.6,
        height / 3.2,
        along / 3.6,
        height / 3.2,
      );
      for (let k = 0; k < 4; k++) walls.col.push(color.r, color.g, color.b);
      walls.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      along += len;
    }
    flatPolygon(roofs, pts, height, 0, color.clone().multiplyScalar(0.78));
  }
  block.meshes = [toMesh(walls, build.wallMaterial, 'compute'), toMesh(roofs, build.roofMaterial)];
  for (const mesh of block.meshes) {
    mesh.castShadow = true;
    build.addChunked(mesh);
  }
}

// Rooftop water tanks and air coolers, typical of Mashhad apartment blocks, on the OSM buildings.
/**
 * Runs the city build view_range operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function cityBuildVIEW_RANGE(build) {
  build.VIEW_RANGE = build.lowQuality ? 1500 : 2400;
  build.tex = textures();
  build.group = new THREE.Group();
  build.scene.add(build.group);
  build.random = seeded(1405);
  build.chunked = [];
  build.buckets = new Map();
  build.bucket = (name, x, z, make) => {
    const key = `${name}|${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}`;
    if (!build.buckets.has(key))
      build.buckets.set(key, {
        name,
        out: make(),
      });
    return build.buckets.get(key).out;
  };
  build.addChunked = (mesh) => {
    mesh.geometry.computeBoundingSphere();
    build.chunked.push(mesh);
    build.group.add(mesh);
    return mesh;
  };
}
/**
 * Runs the city build ground operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function cityBuildGround(build) {
  // Open ground that follows the camera, so the horizon never shows an edge.
  build.ground = new THREE.Mesh(
    new THREE.PlaneGeometry(14000, 14000),
    groundMaterial(
      {
        color: '#c6baa0',
      },
      0,
    ),
  );
  build.ground.rotation.x = -Math.PI / 2;
  build.ground.position.y = -0.02;
  build.ground.receiveShadow = true;
  build.group.add(build.ground);
  for (const area of build.satellite ? [] : build.data.areas) {
    const kind = build.data.areaKinds[area[0]];
    flatPolygon(
      build.bucket(`area:${kind}`, area[1], area[2], () => ({
        pos: [],
        idx: [],
      })),
      area.slice(1),
      LAYER[kind][0],
    );
  }
  build.areaMaterials = {};
  for (const kind of build.data.areaKinds)
    build.areaMaterials[kind] = groundMaterial(
      {
        color: AREA_COLOR[kind],
        roughness: kind === 'water' ? 0.25 : 0.95,
        metalness: kind === 'water' ? 0.2 : 0,
      },
      LAYER[kind][1],
    );
}
/**
 * Runs the city build road operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function cityBuildRoad(build) {
  build.road = (name, x, z) =>
    build.bucket(`road:${name}`, x, z, () => ({
      pos: [],
      uv: [],
      idx: [],
    }));
  for (const r of build.satellite ? [] : build.data.roads) {
    const type = build.data.roadTypes[r[0]],
      kind = BUCKET[type],
      pts = r.slice(2),
      width = WIDTH[type];
    ribbon(build.road(kind, pts[0], pts[1]), pts, width, LAYER[kind][0], kind === 'major' ? 9 : 8);
    if (r[0] <= DRIVABLE_MAX_TYPE) {
      if (type !== 'service')
        ribbon(build.road('sidewalk', pts[0], pts[1]), pts, width + 4, LAYER.sidewalk[0], 6);
      disc(build.road(kind, pts[0], pts[1]), pts[0], pts[1], width / 2, LAYER[kind][0]);
      disc(build.road(kind, pts[0], pts[1]), pts.at(-2), pts.at(-1), width / 2, LAYER[kind][0]);
    }
  }
  build.roadMaterials = {};
}
/**
 * Runs the city build geometry operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function cityBuildGeometry(build) {
  for (const kind of ['major', 'minor', 'paved', 'dirt', 'sidewalk'])
    build.roadMaterials[kind] = groundMaterial(
      {
        map: build.tex[kind],
      },
      LAYER[kind][1],
    );

  // Buildings: textured walls with one window per 3.6 m bay and 3.2 m storey, flat roofs. There are
  // ~145,000 of them (OSM plus Microsoft footprints), so each 500 m block is built only when the
  // camera first comes near it, one block per frame.
  build.wallMaterial = new THREE.MeshStandardMaterial({
    map: build.tex.walls,
    vertexColors: true,
    roughness: 0.85,
  });
  build.roofMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
  });
  build.blocks = new Map();
}
/**
 * Runs the city build geometry2 operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function cityBuildGeometry2(build) {
  for (const building of [...build.data.buildings, ...build.extraBuildings]) {
    const key = `${Math.floor(building[1] / BLOCK)},${Math.floor(building[2] / BLOCK)}`;
    if (!build.blocks.has(key)) {
      const [bx, bz] = key.split(',').map(Number);
      build.blocks.set(key, {
        x: (bx + 0.5) * BLOCK,
        z: (bz + 0.5) * BLOCK,
        buildings: [],
        meshes: null,
      });
    }
    build.blocks.get(key).buildings.push(building);
  }
  build.pendingBlocks = [...build.blocks.values()];
  build.tanks = [];
  build.units = [];
}
/**
 * Runs the city build geometry3 operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function cityBuildGeometry3(build) {
  for (const building of build.data.buildings) {
    const height = building[0],
      pts = building.slice(1);
    let cx = 0,
      cz = 0;
    for (let i = 0; i < pts.length; i += 2) {
      cx += pts[i];
      cz += pts[i + 1];
    }
    cx /= pts.length / 2;
    cz /= pts.length / 2;
    if (insidePolygon(pts, cx, cz) && build.random() < 0.6) {
      (build.random() < 0.5 ? build.tanks : build.units).push([
        cx + (build.random() - 0.5) * 2,
        height,
        build.random() * Math.PI,
        cz + (build.random() - 0.5) * 2,
        0,
      ]);
    }
  }
  for (const { name, out } of build.buckets.values()) {
    const [kind, sub] = name.split(':');
    build.addChunked(
      kind === 'area'
        ? toMesh(out, build.areaMaterials[sub])
        : toMesh(out, build.roadMaterials[sub]),
    );
  }
  build.dummy = new THREE.Object3D();
}
/**
 * Runs the city build instanced operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function cityBuildInstanced(build) {
  // One instanced mesh per chunk, so small props are culled with the rest of their chunk.
  // Each item is an array whose first entry is x and second-to-last entry is z.
  build.instanced = (geometry, material, items, place) => {
    const byChunk = new Map();
    items.forEach((item, i) => {
      const key = `${Math.floor(item[0] / CHUNK)},${Math.floor(item.at(-2) / CHUNK)}`;
      if (!byChunk.has(key)) byChunk.set(key, []);
      byChunk.get(key).push([item, i]);
    });
    const meshes = [];
    for (const list of byChunk.values()) {
      const mesh = new THREE.InstancedMesh(geometry, material, list.length);
      list.forEach(([item], i) => {
        place(item);
        build.dummy.updateMatrix();
        mesh.setMatrixAt(i, build.dummy.matrix);
      });
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      mesh.userData.items = list.map(([, i]) => i);
      build.chunked.push(mesh);
      build.group.add(mesh);
      meshes.push(mesh);
    }
    return meshes;
  };
}
/**
 * Runs the city build geometry4 operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function cityBuildGeometry4(build) {
  build.instanced(
    new THREE.CylinderGeometry(0.55, 0.55, 1.1, 10),
    new THREE.MeshStandardMaterial({
      color: '#d8d8d2',
      metalness: 0.4,
      roughness: 0.4,
    }),
    build.tanks,
    ([x, y, , z]) => {
      build.dummy.position.set(x, y + 0.55, z);
      build.dummy.rotation.set(0, 0, 0);
      build.dummy.scale.setScalar(1);
    },
  );
  build.instanced(
    new THREE.BoxGeometry(1, 0.8, 0.9),
    new THREE.MeshStandardMaterial({
      color: '#a9aaa4',
      roughness: 0.6,
    }),
    build.units,
    ([x, y, r, z]) => {
      build.dummy.position.set(x, y + 0.4, z);
      build.dummy.rotation.set(0, r, 0);
      build.dummy.scale.setScalar(1);
    },
  );

  // Trees fill parks and line the boulevards, kept off paths and out of buildings.
  build.trees = [];
  build.freeSpot = (x, z) =>
    !blocked(build.collision, x, z) && !nearestSegment(build.segments, x, z, 3);
}
/**
 * Runs the city build geometry5 operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function cityBuildGeometry5(build) {
  for (const area of build.data.areas) {
    const kind = build.data.areaKinds[area[0]];
    if (!['park', 'forest', 'grass'].includes(kind)) continue;
    const pts = area.slice(1),
      step = kind === 'grass' ? 16 : 10;
    let ax = Infinity,
      az = Infinity,
      bx = -Infinity,
      bz = -Infinity;
    for (let i = 0; i < pts.length; i += 2) {
      ax = Math.min(ax, pts[i]);
      bx = Math.max(bx, pts[i]);
      az = Math.min(az, pts[i + 1]);
      bz = Math.max(bz, pts[i + 1]);
    }
    for (let x = ax; x < bx; x += step)
      for (let z = az; z < bz; z += step) {
        const tx = x + (build.random() - 0.5) * step * 0.8,
          tz = z + (build.random() - 0.5) * step * 0.8;
        if (insidePolygon(pts, tx, tz) && build.freeSpot(tx, tz))
          build.trees.push([tx, 0.8 + build.random() * 0.6, tz, 0]);
      }
  }
}
/**
 * Runs the city build geometry6 operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function cityBuildGeometry6(build) {
  for (const road of build.data.roads) {
    const type = build.data.roadTypes[road[0]];
    if (road[0] > 3) continue;
    const offset = WIDTH[type] / 2 + 2.6;
    for (let i = 4; i < road.length; i += 2) {
      const ax = road[i - 2],
        az = road[i - 1],
        dx = road[i] - ax,
        dz = road[i + 1] - az,
        len = Math.hypot(dx, dz);
      for (let d = build.random() * 12; d < len; d += 12)
        for (const side of [-1, 1]) {
          const tx = ax + (dx / len) * d - (dz / len) * offset * side,
            tz = az + (dz / len) * d + (dx / len) * offset * side;
          if (
            !blocked(build.collision, tx, tz) &&
            !nearestSegment(
              build.segments,
              tx,
              tz,
              WIDTH[type] / 2 + 1.5,
              (s) => s[4] <= DRIVABLE_MAX_TYPE,
            )
          )
            build.trees.push([tx, 0.7 + build.random() * 0.4, tz, 0]);
        }
    }
  }
}
/**
 * Runs the city build geometry7 operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function cityBuildGeometry7(build) {
  build.instanced(
    new THREE.CylinderGeometry(0.14, 0.22, 2.6, 5, 1, true),
    new THREE.MeshStandardMaterial({
      color: '#6a5039',
      roughness: 0.9,
    }),
    build.trees,
    ([x, s, z]) => {
      build.dummy.position.set(x, 1.3 * s, z);
      build.dummy.rotation.set(0, 0, 0);
      build.dummy.scale.setScalar(s);
    },
  );
  build.crowns = build.instanced(
    new THREE.IcosahedronGeometry(1.7, 0),
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.85,
      flatShading: true,
    }),
    build.trees,
    ([x, s, z]) => {
      build.dummy.position.set(x, 3.4 * s, z);
      build.dummy.rotation.set(0, (x * 13) % 6, 0);
      build.dummy.scale.set(s, s * (1 + ((x * 7) % 1) * 0.3), s);
    },
  );
  build.crownColors = ['#4d7a3e', '#5f8a45', '#3f6b3a', '#6f9150'].map((c) => new THREE.Color(c));
  for (const mesh of build.crowns)
    mesh.userData.items.forEach((tree, i) =>
      mesh.setColorAt(i, build.crownColors[tree % build.crownColors.length]),
    );

  // Metro station entrances with the Mashhad Urban Railway "M" sign.
}
/**
 * Runs the city build sign texture operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function cityBuildSignTexture(build) {
  build.signTexture = canvasTexture(
    128,
    128,
    (c, w, h) => {
      c.fillStyle = '#d2232a';
      c.beginPath();
      c.arc(w / 2, h / 2, 60, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#fff';
      c.font = 'bold 84px sans-serif';
      c.textAlign = 'center';
      c.fillText('M', w / 2, h / 2 + 30);
    },
    false,
  );
  build.canopy = new THREE.MeshStandardMaterial({
    color: '#59646b',
    metalness: 0.5,
    roughness: 0.4,
  });
  build.glass = new THREE.MeshStandardMaterial({
    color: '#9fc4cf',
    transparent: true,
    opacity: 0.45,
    roughness: 0.1,
  });
}
/**
 * Runs the city build geometry8 operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function cityBuildGeometry8(build) {
  for (const label of build.data.labels.filter((l) => l.kind === 'metro')) {
    const entrance = new THREE.Group();
    entrance.position.set(label.x, 0, label.z);
    const road = nearestSegment(
      build.segments,
      label.x,
      label.z,
      40,
      (s) => s[4] <= DRIVABLE_MAX_TYPE,
    );
    if (road) entrance.rotation.y = Math.atan2(road.dx, road.dz);
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
      entrance.add(mesh);
    };
    box(4.4, 0.2, 7, build.canopy, 0, 3, 0);
    box(0.15, 3, 7, build.glass, -2.1, 1.5, 0);
    box(0.15, 3, 7, build.glass, 2.1, 1.5, 0);
    box(0.25, 4.2, 0.25, build.canopy, 2.6, 2.1, 3.6);
    const sign = new THREE.Mesh(
      new THREE.CircleGeometry(0.6, 24),
      new THREE.MeshBasicMaterial({
        map: build.signTexture,
      }),
    );
    sign.position.set(2.6, 4.4, 3.75);
    entrance.add(sign);
    const back = sign.clone();
    back.rotation.y = Math.PI;
    back.position.z = 3.45;
    entrance.add(back);
    build.group.add(entrance);
  }

  // A continuous ridge line around the horizon: the Binalood range high to the south-west,
  // the lower Hezar Masjed hills to the north-east. Hazy colours stand in for distance fog.
}
/**
 * Runs the city build ridge pos operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function cityBuildRidgePos(build) {
  build.ridgePos = [];
  build.ridgeCol = [];
  build.ridgeIdx = [];
  build.segmentsAround = 240;
  build.foot = new THREE.Color('#cfc5b0');
  build.crest = new THREE.Color('#a39a8a');
}
/**
 * Runs the city build geometry9 operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function cityBuildGeometry9(build) {
  for (let i = 0; i <= build.segmentsAround; i++) {
    const a = (i / build.segmentsAround) * Math.PI * 2,
      x = Math.cos(a),
      z = Math.sin(a);
    // South-west is −x (west) and +z (south); peaks grow with how far this direction points there.
    const southWest = Math.max(0, (-x + z) / Math.SQRT2),
      rough = Math.sin(a * 7) * 0.5 + Math.sin(a * 17 + 1) * 0.3 + Math.sin(a * 41) * 0.15;
    const height = 90 + southWest ** 1.5 * 420 + rough * (60 + southWest * 120),
      r = 4300;
    build.ridgePos.push(x * r, -20, z * r, x * r, height, z * r);
    build.ridgeCol.push(
      build.foot.r,
      build.foot.g,
      build.foot.b,
      build.crest.r,
      build.crest.g,
      build.crest.b,
    );
    if (i) {
      const b = (i - 1) * 2;
      build.ridgeIdx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }
  build.ridgeGeometry = new THREE.BufferGeometry();
  build.ridgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(build.ridgePos, 3));
  build.ridgeGeometry.setAttribute('color', new THREE.Float32BufferAttribute(build.ridgeCol, 3));
  build.ridgeGeometry.setIndex(build.ridgeIdx);
}
/**
 * Runs the city build ridge operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function cityBuildRidge(build) {
  build.ridge = new THREE.Mesh(
    build.ridgeGeometry,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      fog: false,
      side: THREE.DoubleSide,
    }),
  );
  build.group.add(build.ridge);
  build.lastCheck = null;
}
/**
 * Runs the city build result operation for this subsystem.
 * @param {*} build - build.
 * @returns {*} Operation result, when applicable.
 */
function cityBuildResult(build) {
  build.result = {
    group: build.group,
    // Keeps the ground and horizon around the camera and shows only chunks within range.
    update(camera) {
      build.ground.position.set(camera.x, -0.02, camera.z);
      build.ridge.position.set(camera.x, 0, camera.z);
      // Build the nearest unbuilt block in range, one per frame to avoid stutter.
      let next = null,
        nextDistance = build.VIEW_RANGE + BLOCK;
      for (const block of build.pendingBlocks) {
        const d = Math.hypot(block.x - camera.x, block.z - camera.z);
        if (d < nextDistance) {
          next = block;
          nextDistance = d;
        }
      }
      if (next) {
        build.pendingBlocks.splice(build.pendingBlocks.indexOf(next), 1);
        build.buildBlock(next);
        build.lastCheck = null;
      }
      if (
        build.lastCheck &&
        Math.hypot(camera.x - build.lastCheck.x, camera.z - build.lastCheck.z) < 60
      )
        return;
      build.lastCheck = {
        x: camera.x,
        z: camera.z,
      };
      for (const mesh of build.chunked) {
        const sphere = mesh.boundingSphere ?? mesh.geometry.boundingSphere;
        mesh.visible =
          Math.hypot(sphere.center.x - camera.x, sphere.center.z - camera.z) - sphere.radius <
          build.VIEW_RANGE;
      }
    },
  };
}
const CITY_METHODS = {
  buildBlock: cityBuildBlock,
};
const CITY_STEPS = [
  cityBuildVIEW_RANGE,
  cityBuildGround,
  cityBuildRoad,
  cityBuildGeometry,
  cityBuildGeometry2,
  cityBuildGeometry3,
  cityBuildInstanced,
  cityBuildGeometry4,
  cityBuildGeometry5,
  cityBuildGeometry6,
  cityBuildGeometry7,
  cityBuildSignTexture,
  cityBuildGeometry8,
  cityBuildRidgePos,
  cityBuildGeometry9,
  cityBuildRidge,
  cityBuildResult,
];
