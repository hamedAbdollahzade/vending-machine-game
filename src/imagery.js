import * as THREE from 'three';
import {toLocal} from './geo.js';

// Satellite ground: Esri World Imagery tiles (public/imagery, see scripts/fetch-imagery.mjs) laid on
// the ground as textured quads. Detailed zoom-17 tiles load near the camera, zoom-15 tiles further
// out underneath them, and tiles out of range are released.

const tileLon = (x, z) => x / 2 ** z * 360 - 180;
const tileLat = (y, z) => Math.atan(Math.sinh(Math.PI * (1 - 2 * y / 2 ** z))) * 180 / Math.PI;

// World-space corners of a Web Mercator tile: north-west, north-east, south-west, south-east.
export function tileCorners(x, y, z) {
    const n = tileLat(y, z), s = tileLat(y + 1, z), w = tileLon(x, z), e = tileLon(x + 1, z);
    return [toLocal(n, w), toLocal(n, e), toLocal(s, w), toLocal(s, e)];
}

export function createImagery(scene, index, {baseUrl = './imagery/', lowQuality = false, anisotropy = 4} = {}) {
    const group = new THREE.Group();
    scene.add(group);
    const loader = new THREE.TextureLoader();
    // Zoom 15 sits just under zoom 17 so the detailed tiles always win where both exist.
    const levels = [
        {z: 17, range: lowQuality ? 450 : 750, y: .012, offset: -3},
        {z: 15, range: lowQuality ? 1800 : 2800, y: .004, offset: -1}
    ].map(level => ({
        ...level,
        tiles: (index[level.z] ?? []).map(key => {
            const [x, y] = key.split('/').map(Number), corners = tileCorners(x, y, level.z);
            const cx = corners.reduce((s, c) => s + c.x, 0) / 4, cz = corners.reduce((s, c) => s + c.z, 0) / 4;
            return {key, x, y, corners, cx, cz, mesh: null, loading: false};
        })
    }));
    let loads = 0;

    function show(level, tile) {
        if (tile.mesh || tile.loading || loads >= 6) return;
        tile.loading = true;
        loads++;
        loader.load(`${baseUrl}${level.z}/${tile.x}/${tile.y}.jpg`, texture => {
            loads--;
            tile.loading = false;
            texture.colorSpace = THREE.SRGBColorSpace;
            // Sharp at the low angles a driver sees the road from.
            texture.anisotropy = anisotropy;
            const [nw, ne, sw, se] = tile.corners, geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute([nw.x, level.y, nw.z, ne.x, level.y, ne.z, sw.x, level.y, sw.z, se.x, level.y, se.z], 3));
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 0, 0, 1, 0], 2));
            geometry.setIndex([0, 2, 1, 1, 2, 3]);
            tile.mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
                map: texture, toneMapped: false, polygonOffset: true, polygonOffsetFactor: level.offset, polygonOffsetUnits: level.offset * 2
            }));
            group.add(tile.mesh);
        }, undefined, () => {
            loads--;
            tile.loading = false;
            tile.failed = true;
        });
    }

    function hide(tile) {
        if (!tile.mesh) return;
        group.remove(tile.mesh);
        tile.mesh.geometry.dispose();
        tile.mesh.material.map.dispose();
        tile.mesh.material.dispose();
        tile.mesh = null;
    }

    let last = null;
    return {
        group,
        available: levels.some(level => level.tiles.length),
        // Loads tiles in range of (x, z), nearest first, and releases ones well out of range.
        update(x, z) {
            const moved = !last || Math.hypot(x - last.x, z - last.z) > 25;
            if (!moved && loads >= 6) return;
            last = {x, z};
            for (const level of levels) {
                const wanted = [];
                for (const tile of level.tiles) {
                    const d = Math.hypot(tile.cx - x, tile.cz - z);
                    if (d > level.range * 1.2) hide(tile);
                    else if (d < level.range && !tile.mesh && !tile.failed) wanted.push([d, tile]);
                }
                wanted.sort((a, b) => a[0] - b[0]).forEach(([, tile]) => show(level, tile));
            }
        }
    };
}
