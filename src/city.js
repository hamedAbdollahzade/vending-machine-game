import * as THREE from 'three';
import {nearestSegment, DRIVABLE_MAX_TYPE} from './routing.js';
import {blocked, insidePolygon} from './collision.js';

// Road widths in metres per OSM highway type. Dual carriageways are two separate one-way ways.
const WIDTH = {trunk: 11, primary: 10, secondary: 9, tertiary: 8, unclassified: 6.5, residential: 6, living_street: 5, service: 4, pedestrian: 4, footway: 2.4, cycleway: 2, path: 1.6, track: 3, steps: 2.2};
const BUCKET = {trunk: 'major', primary: 'major', secondary: 'major', tertiary: 'minor', unclassified: 'minor', residential: 'minor', living_street: 'minor', service: 'minor', pedestrian: 'paved', footway: 'paved', cycleway: 'paved', steps: 'paved', path: 'dirt', track: 'dirt'};
// Ground layers: height above the ground plane and polygon offset, so overlaps never flicker.
const LAYER = {campus: [.01, 1], park: [.02, 2], grass: [.025, 3], forest: [.025, 3], pitch: [.03, 4], water: [.035, 5], sidewalk: [.04, 6], dirt: [.045, 7], paved: [.05, 8], minor: [.06, 9], major: [.07, 10]};
const AREA_COLOR = {campus: '#d8ccb2', park: '#7a9a55', grass: '#8aa660', forest: '#5d7f47', pitch: '#5f9a58', water: '#4f93a8'};
const BUILDING_COLORS = ['#dccbaa', '#e7dcc4', '#c9a585', '#bdb4a3', '#ece6da', '#d2b48f', '#b7957a'].map(c => new THREE.Color(c));

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

function noise(c, w, h, base, spread, count) {
    c.fillStyle = base;
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < count; i++) {
        const v = Math.random() * spread - spread / 2;
        c.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
        c.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
}

const textures = () => ({
    major: canvasTexture(128, 256, (c, w, h) => {
        noise(c, w, h, '#4a4d50', .12, 1800);
        c.fillStyle = '#e8e4d6';
        c.fillRect(6, 0, 4, h);
        c.fillRect(w - 10, 0, 4, h);
        c.fillRect(w / 2 - 2, 0, 4, h * .45);
    }),
    minor: canvasTexture(128, 256, (c, w, h) => noise(c, w, h, '#58595a', .12, 1600)),
    paved: canvasTexture(128, 128, (c, w, h) => {
        noise(c, w, h, '#c4b597', .1, 900);
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
        noise(c, w, h, '#b9b1a1', .1, 900);
        c.fillStyle = '#d9d4c8';
        c.fillRect(0, 0, 10, h);
        c.fillRect(w - 10, 0, 10, h);
    }),
    dirt: canvasTexture(64, 64, (c, w, h) => noise(c, w, h, '#b39d78', .15, 500)),
    walls: canvasTexture(128, 128, (c, w, h) => {
        noise(c, w, h, '#f1ede4', .06, 600);
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
    })
});

// Pushes a strip of quads along a polyline into a geometry buffer.
function ribbon(out, pts, width, y, repeat) {
    const n = pts.length / 2;
    if (n < 2) return;
    const base = out.pos.length / 3, half = width / 2;
    let along = 0;
    for (let i = 0; i < n; i++) {
        const x = pts[i * 2], z = pts[i * 2 + 1];
        if (i) along += Math.hypot(x - pts[i * 2 - 2], z - pts[i * 2 - 1]);
        const seg = (a, b) => {
            const dx = pts[b * 2] - pts[a * 2], dz = pts[b * 2 + 1] - pts[a * 2 + 1], len = Math.hypot(dx, dz) || 1;
            return [-dz / len, dx / len];
        };
        const n1 = seg(Math.max(0, i - 1), Math.max(1, i)), n2 = seg(Math.min(n - 2, i), Math.min(n - 1, i + 1));
        let nx = n1[0] + n2[0], nz = n1[1] + n2[1];
        const len = Math.hypot(nx, nz) || 1;
        nx /= len;
        nz /= len;
        const miter = half / Math.max(.45, nx * n1[0] + nz * n1[1]);
        out.pos.push(x + nx * miter, y, z + nz * miter, x - nx * miter, y, z - nz * miter);
        out.uv.push(0, along / repeat, 1, along / repeat);
        if (i) {
            const a = base + (i - 1) * 2;
            // Wound so the strip faces up (+y) and survives back-face culling.
            out.idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        }
    }
}

function disc(out, x, z, radius, y) {
    const base = out.pos.length / 3;
    out.pos.push(x, y, z);
    out.uv.push(.25, 0);
    for (let i = 0; i <= 10; i++) {
        const a = i / 10 * Math.PI * 2;
        out.pos.push(x + Math.cos(a) * radius, y, z + Math.sin(a) * radius);
        out.uv.push(.25, 0);
        if (i) out.idx.push(base, base + i + 1, base + i);
    }
}

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
function flatPolygon(out, pts, y, uvScale = 0, color = null) {
    const base = out.pos.length / 3;
    for (let i = 0; i < pts.length; i += 2) {
        out.pos.push(pts[i], y, pts[i + 1]);
        out.uv?.push(pts[i] * uvScale, pts[i + 1] * uvScale);
        if (color) out.col.push(color.r, color.g, color.b);
    }
    for (const [a, b, c] of polygonTriangles(pts)) {
        const cross = (pts[b * 2 + 1] - pts[a * 2 + 1]) * (pts[c * 2] - pts[a * 2]) - (pts[b * 2] - pts[a * 2]) * (pts[c * 2 + 1] - pts[a * 2 + 1]);
        out.idx.push(base + a, ...(cross >= 0 ? [base + b, base + c] : [base + c, base + b]));
    }
}

function toMesh(out, material, normals = 'up') {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3));
    if (out.uv?.length) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(out.uv, 2));
    if (out.col?.length) geometry.setAttribute('color', new THREE.Float32BufferAttribute(out.col, 3));
    geometry.setIndex(out.idx);
    if (normals === 'up') geometry.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(out.pos.length).map((_, i) => i % 3 === 1 ? 1 : 0), 3));
    else geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    return mesh;
}

const groundMaterial = (options, layer) => new THREE.MeshStandardMaterial({
    roughness: .95, ...options,
    polygonOffset: true, polygonOffsetFactor: -layer, polygonOffsetUnits: -layer * 2
});

function seeded(seed) {
    return () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
    };
}

function signedArea(pts) {
    let a = 0;
    for (let i = 0; i < pts.length; i += 2) {
        const j = (i + 2) % pts.length;
        a += pts[i] * pts[j + 1] - pts[j] * pts[i + 1];
    }
    return a / 2;
}

export function createCity(scene, data, {collision, segments}) {
    const tex = textures(), group = new THREE.Group();
    scene.add(group);
    const random = seeded(1405);
    const {minX, minZ, maxX, maxZ} = data.bounds;

    // Dusty urban ground, and a darker desert beyond the mapped area.
    const desert = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), groundMaterial({color: '#b8a888'}, 0));
    desert.rotation.x = -Math.PI / 2;
    desert.position.y = -.02;
    desert.receiveShadow = true;
    group.add(desert);
    const urban = {pos: [], idx: []};
    flatPolygon(urban, [minX, minZ, maxX, minZ, maxX, maxZ, minX, maxZ], 0);
    group.add(toMesh(urban, groundMaterial({color: '#c8bea8'}, 0)));

    const areaBuffers = {};
    for (const area of data.areas) {
        const kind = data.areaKinds[area[0]];
        areaBuffers[kind] ??= {pos: [], idx: []};
        flatPolygon(areaBuffers[kind], area.slice(1), LAYER[kind][0]);
    }
    for (const [kind, out] of Object.entries(areaBuffers)) group.add(toMesh(out, groundMaterial({color: AREA_COLOR[kind], roughness: kind === 'water' ? .25 : .95, metalness: kind === 'water' ? .2 : 0}, LAYER[kind][1])));

    const roadBuffers = {};
    const buffer = name => roadBuffers[name] ??= {pos: [], uv: [], idx: []};
    for (const road of data.roads) {
        const type = data.roadTypes[road[0]], bucket = BUCKET[type], pts = road.slice(2), width = WIDTH[type];
        ribbon(buffer(bucket), pts, width, LAYER[bucket][0], bucket === 'major' ? 9 : 8);
        if (road[0] <= DRIVABLE_MAX_TYPE) {
            if (type !== 'service') ribbon(buffer('sidewalk'), pts, width + 4, LAYER.sidewalk[0], 6);
            disc(buffer(bucket), pts[0], pts[1], width / 2, LAYER[bucket][0]);
            disc(buffer(bucket), pts.at(-2), pts.at(-1), width / 2, LAYER[bucket][0]);
        }
    }
    for (const [bucket, out] of Object.entries(roadBuffers)) group.add(toMesh(out, groundMaterial({map: tex[bucket]}, LAYER[bucket][1])));

    // Buildings: textured walls with one window per 3.6 m bay and 3.2 m storey, flat roofs.
    const walls = {pos: [], uv: [], col: [], idx: []}, roofs = {pos: [], col: [], idx: []};
    const tanks = [], units = [];
    for (const building of data.buildings) {
        const height = building[0];
        let pts = building.slice(1);
        if (signedArea(pts) > 0) {
            const reversed = [];
            for (let i = pts.length - 2; i >= 0; i -= 2) reversed.push(pts[i], pts[i + 1]);
            pts = reversed;
        }
        const color = BUILDING_COLORS[Math.floor(random() * BUILDING_COLORS.length)].clone().multiplyScalar(.9 + random() * .15);
        let along = 0;
        for (let i = 0; i < pts.length; i += 2) {
            const j = (i + 2) % pts.length, ax = pts[i], az = pts[i + 1], bx = pts[j], bz = pts[j + 1];
            const len = Math.hypot(bx - ax, bz - az), base = walls.pos.length / 3;
            walls.pos.push(ax, 0, az, bx, 0, bz, bx, height, bz, ax, height, az);
            walls.uv.push(along / 3.6, 0, (along + len) / 3.6, 0, (along + len) / 3.6, height / 3.2, along / 3.6, height / 3.2);
            for (let k = 0; k < 4; k++) walls.col.push(color.r, color.g, color.b);
            walls.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
            along += len;
        }
        flatPolygon(roofs, pts, height, 0, color.clone().multiplyScalar(.78));
        // Rooftop water tanks and air coolers, typical of Mashhad apartment blocks.
        let cx = 0, cz = 0;
        for (let i = 0; i < pts.length; i += 2) {
            cx += pts[i];
            cz += pts[i + 1];
        }
        cx /= pts.length / 2;
        cz /= pts.length / 2;
        if (insidePolygon(pts, cx, cz) && random() < .6) {
            (random() < .5 ? tanks : units).push([cx + (random() - .5) * 2, height, cz + (random() - .5) * 2, random() * Math.PI]);
        }
    }
    const wallMesh = toMesh(walls, new THREE.MeshStandardMaterial({map: tex.walls, vertexColors: true, roughness: .85}), 'compute');
    wallMesh.castShadow = true;
    group.add(wallMesh);
    const roofMesh = toMesh(roofs, new THREE.MeshStandardMaterial({vertexColors: true, roughness: .9}));
    roofMesh.castShadow = true;
    group.add(roofMesh);
    const dummy = new THREE.Object3D();
    const instanced = (geometry, material, items, place) => {
        const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, items.length));
        mesh.count = items.length;
        items.forEach((item, i) => {
            place(item);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        });
        mesh.castShadow = mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
    };
    instanced(new THREE.CylinderGeometry(.55, .55, 1.1, 10), new THREE.MeshStandardMaterial({color: '#d8d8d2', metalness: .4, roughness: .4}), tanks, ([x, y, z]) => {
        dummy.position.set(x, y + .55, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(1);
    });
    instanced(new THREE.BoxGeometry(1, .8, .9), new THREE.MeshStandardMaterial({color: '#a9aaa4', roughness: .6}), units, ([x, y, z, r]) => {
        dummy.position.set(x, y + .4, z);
        dummy.rotation.set(0, r, 0);
        dummy.scale.setScalar(1);
    });

    // Trees fill parks and line the boulevards, kept off paths and out of buildings.
    const trees = [];
    const freeSpot = (x, z) => !blocked(collision, x, z) && !nearestSegment(segments, x, z, 3);
    for (const area of data.areas) {
        const kind = data.areaKinds[area[0]];
        if (!['park', 'forest', 'grass'].includes(kind)) continue;
        const pts = area.slice(1), step = kind === 'grass' ? 16 : 10;
        let ax = Infinity, az = Infinity, bx = -Infinity, bz = -Infinity;
        for (let i = 0; i < pts.length; i += 2) {
            ax = Math.min(ax, pts[i]);
            bx = Math.max(bx, pts[i]);
            az = Math.min(az, pts[i + 1]);
            bz = Math.max(bz, pts[i + 1]);
        }
        for (let x = ax; x < bx; x += step) for (let z = az; z < bz; z += step) {
            const tx = x + (random() - .5) * step * .8, tz = z + (random() - .5) * step * .8;
            if (insidePolygon(pts, tx, tz) && freeSpot(tx, tz)) trees.push([tx, tz, .8 + random() * .6]);
        }
    }
    for (const road of data.roads) {
        const type = data.roadTypes[road[0]];
        if (road[0] > 3) continue;
        const offset = WIDTH[type] / 2 + 2.6;
        for (let i = 4; i < road.length; i += 2) {
            const ax = road[i - 2], az = road[i - 1], dx = road[i] - ax, dz = road[i + 1] - az, len = Math.hypot(dx, dz);
            for (let d = random() * 12; d < len; d += 12) for (const side of [-1, 1]) {
                const tx = ax + dx / len * d - dz / len * offset * side, tz = az + dz / len * d + dx / len * offset * side;
                if (!blocked(collision, tx, tz) && !nearestSegment(segments, tx, tz, WIDTH[type] / 2 + 1.5, s => s[4] <= DRIVABLE_MAX_TYPE)) trees.push([tx, tz, .7 + random() * .4]);
            }
        }
    }
    trees.length = Math.min(trees.length, 7000);
    instanced(new THREE.CylinderGeometry(.14, .22, 2.6, 5, 1, true), new THREE.MeshStandardMaterial({color: '#6a5039', roughness: .9}), trees, ([x, z, s]) => {
        dummy.position.set(x, 1.3 * s, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(s);
    });
    const crowns = instanced(new THREE.IcosahedronGeometry(1.7, 0), new THREE.MeshStandardMaterial({color: '#ffffff', roughness: .85, flatShading: true}), trees, ([x, z, s]) => {
        dummy.position.set(x, 3.4 * s, z);
        dummy.rotation.set(0, x * 13 % 6, 0);
        dummy.scale.set(s, s * (1 + (x * 7 % 1) * .3), s);
    });
    const crownColors = ['#4d7a3e', '#5f8a45', '#3f6b3a', '#6f9150'].map(c => new THREE.Color(c));
    trees.forEach((_, i) => crowns.setColorAt(i, crownColors[i % crownColors.length]));

    // Metro station entrances with the Mashhad Urban Railway "M" sign.
    const signTexture = canvasTexture(128, 128, (c, w, h) => {
        c.fillStyle = '#d2232a';
        c.beginPath();
        c.arc(w / 2, h / 2, 60, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#fff';
        c.font = 'bold 84px sans-serif';
        c.textAlign = 'center';
        c.fillText('M', w / 2, h / 2 + 30);
    }, false);
    const canopy = new THREE.MeshStandardMaterial({color: '#59646b', metalness: .5, roughness: .4});
    const glass = new THREE.MeshStandardMaterial({color: '#9fc4cf', transparent: true, opacity: .45, roughness: .1});
    for (const label of data.labels.filter(l => l.kind === 'metro')) {
        const entrance = new THREE.Group();
        entrance.position.set(label.x, 0, label.z);
        const road = nearestSegment(segments, label.x, label.z, 40, s => s[4] <= DRIVABLE_MAX_TYPE);
        if (road) entrance.rotation.y = Math.atan2(road.dx, road.dz);
        const box = (w, h, d, m, x, y, z) => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
            mesh.position.set(x, y, z);
            mesh.castShadow = mesh.receiveShadow = true;
            entrance.add(mesh);
        };
        box(4.4, .2, 7, canopy, 0, 3, 0);
        box(.15, 3, 7, glass, -2.1, 1.5, 0);
        box(.15, 3, 7, glass, 2.1, 1.5, 0);
        box(.25, 4.2, .25, canopy, 2.6, 2.1, 3.6);
        const sign = new THREE.Mesh(new THREE.CircleGeometry(.6, 24), new THREE.MeshBasicMaterial({map: signTexture}));
        sign.position.set(2.6, 4.4, 3.75);
        entrance.add(sign);
        const back = sign.clone();
        back.rotation.y = Math.PI;
        back.position.z = 3.45;
        entrance.add(back);
        group.add(entrance);
    }

    // A continuous ridge line around the horizon: the Binalood range high to the south-west,
    // the lower Hezar Masjed hills to the north-east. Hazy colours stand in for distance fog.
    const ridgePos = [], ridgeCol = [], ridgeIdx = [], segmentsAround = 240;
    const foot = new THREE.Color('#cfc5b0'), crest = new THREE.Color('#a39a8a');
    for (let i = 0; i <= segmentsAround; i++) {
        const a = i / segmentsAround * Math.PI * 2, x = Math.cos(a), z = Math.sin(a);
        // South-west is −x (west) and +z (south); peaks grow with how far this direction points there.
        const southWest = Math.max(0, (-x + z) / Math.SQRT2), rough = Math.sin(a * 7) * .5 + Math.sin(a * 17 + 1) * .3 + Math.sin(a * 41) * .15;
        const height = 90 + southWest ** 1.5 * 420 + rough * (60 + southWest * 120), r = 4300;
        ridgePos.push(x * r, -20, z * r, x * r, height, z * r);
        ridgeCol.push(foot.r, foot.g, foot.b, crest.r, crest.g, crest.b);
        if (i) {
            const b = (i - 1) * 2;
            ridgeIdx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
        }
    }
    const ridgeGeometry = new THREE.BufferGeometry();
    ridgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(ridgePos, 3));
    ridgeGeometry.setAttribute('color', new THREE.Float32BufferAttribute(ridgeCol, 3));
    ridgeGeometry.setIndex(ridgeIdx);
    group.add(new THREE.Mesh(ridgeGeometry, new THREE.MeshBasicMaterial({vertexColors: true, fog: false, side: THREE.DoubleSide})));
    return {group};
}
