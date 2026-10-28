// Downloads Esri World Imagery tiles for the game region into public/imagery/<z>/<x>/<y>.jpg and
// writes public/imagery/index.json listing them.
//
// Usage: node scripts/fetch-imagery.mjs
//
//   zoom 17 (~1 m per pixel): the city zone, the factory zone, and 300 m either side of the drive
//             from the factory to Park Mellat, where the player spends their time;
//   zoom 15 (~4 m per pixel): the whole region, seen in the distance and from the highway.
//
// Imagery: Esri, Maxar, Earthstar Geographics, and the GIS User Community. Commercial use and
// hosting copies require a suitable Esri licence; check Esri's terms for your use.
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {toLatLon} from '../src/geo.js';
import {buildGraph, routeBetween} from '../src/routing.js';
import {FACTORY, machineById} from '../src/locations.js';

const URL_TEMPLATE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const OUT = new URL('../public/imagery/', import.meta.url);
const data = JSON.parse(readFileSync(new URL('../src/data/mellat.json', import.meta.url), 'utf8'));

export const tileX = (lon, z) => Math.floor((lon + 180) / 360 * 2 ** z);
export const tileY = (lat, z) => Math.floor((1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * 2 ** z);

const tiles = {15: new Set(), 17: new Set()};
const addBox = (z, lat0, lon0, lat1, lon1) => {
    for (let x = tileX(lon0, z); x <= tileX(lon1, z); x++)
        for (let y = tileY(lat1, z); y <= tileY(lat0, z); y++) tiles[z].add(`${x}/${y}`);
};
const {minX, minZ, maxX, maxZ} = data.bounds;
const nw = toLatLon(minX, minZ), se = toLatLon(maxX, maxZ);
addBox(15, se.lat, nw.lon, nw.lat, se.lon);
addBox(17, 36.300, 59.512, 36.330, 59.566);
addBox(17, 36.443, 59.414, 36.458, 59.434);
// The drive along the real roads, widened by 300 m.
const drive = buildGraph(data.roads, {drivable: true}), park = machineById('mellat-park').anchor;
const route = routeBetween(drive, FACTORY.center.x, FACTORY.center.z, park.x, park.z);
for (let i = 1; i < route.points.length; i++) {
    const a = route.points[i - 1], b = route.points[i], steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 100);
    for (let s = 0; s <= steps; s++) {
        const x = a.x + (b.x - a.x) * s / steps, z = a.z + (b.z - a.z) * s / steps;
        const p0 = toLatLon(x - 300, z + 300), p1 = toLatLon(x + 300, z - 300);
        addBox(17, p0.lat, p0.lon, p1.lat, p1.lon);
    }
}

const queue = Object.entries(tiles).flatMap(([z, set]) => [...set].map(key => ({z: Number(z), key})));
console.log(`tiles: zoom 15 ${tiles[15].size}, zoom 17 ${tiles[17].size}`);
let done = 0, fetched = 0, bytes = 0;
async function worker() {
    while (queue.length) {
        const {z, key} = queue.pop(), [x, y] = key.split('/');
        const file = new URL(`${z}/${x}/${y}.jpg`, OUT);
        if (!existsSync(file)) {
            for (let attempt = 0; attempt < 4; attempt++) {
                try {
                    const res = await fetch(URL_TEMPLATE.replace('{z}', z).replace('{y}', y).replace('{x}', x), {headers: {'User-Agent': 'robot-market-game/1.0'}});
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const body = new Uint8Array(await res.arrayBuffer());
                    mkdirSync(new URL(`${z}/${x}/`, OUT), {recursive: true});
                    writeFileSync(file, body);
                    fetched++;
                    bytes += body.length;
                    break;
                } catch (error) {
                    if (attempt === 3) console.warn(`failed ${z}/${x}/${y}: ${error.message}`);
                    await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                }
            }
        }
        if (++done % 100 === 0) console.log(`${done} tiles…`);
    }
}
await Promise.all(Array.from({length: 6}, worker));
const index = {attribution: 'Esri, Maxar, Earthstar Geographics, and the GIS User Community'};
for (const [z, set] of Object.entries(tiles)) index[z] = [...set].filter(key => existsSync(new URL(`${z}/${key}.jpg`, OUT))).sort();
writeFileSync(new URL('index.json', OUT), JSON.stringify(index));
console.log(`downloaded ${fetched} new tiles (${(bytes / 1e6).toFixed(1)} MB); index lists ${index[15].length} + ${index[17].length}`);
