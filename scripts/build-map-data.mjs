// Converts raw OpenStreetMap and Natural Earth exports into the compact files in src/data.
//
// Usage:
//   node scripts/build-map-data.mjs --osm <file>… --poi <poi-osm.json> --provinces <ne_10m_admin_1_states_provinces.geojson>
//
// Each --osm file is an Overpass API response with `out geom` (send a User-Agent header); elements
// that appear in several files are merged. The playable world is built from four extracts:
//   city zone:    [bbox:36.300,59.512,36.330,59.566];(way["highway"];way["building"];way["leisure"~"park|garden|pitch"];
//                 way["landuse"~"grass|forest|park|recreation_ground"];way["natural"~"water|wood"];
//                 way["amenity"~"school|university|college"];relation["amenity"="university"];relation["leisure"="park"];node["amenity"="school"];)
//   factory zone: [bbox:36.4430,59.4140,36.4580,59.4340];(way["highway"];way["building"];way["leisure"~"park|garden|pitch"];way["landuse"];
//                 way["natural"~"water|wood"];way["amenity"];relation["leisure"="park"];)
//   corridor:     the same feature types within ~250 m of the factory → Park Mellat driving route (around:250,<route lat,lon list>)
//   main roads:   [bbox:36.298,59.405,36.462,59.572];way["highway"~"^(trunk|primary|secondary|tertiary|motorway)(_link)?$"];
//   poi:          nwr["railway"="station"](36.28,59.48,36.36,59.60);nwr["amenity"="university"](…);out center tags;
// Map data © OpenStreetMap contributors (ODbL). Province outlines: Natural Earth (public domain).
import {readFileSync, writeFileSync} from 'node:fs';
import {ORIGIN, toLocal} from '../src/geo.js';

const args = {osm: []};
for (let i = 2, key = null; i < process.argv.length; i++) {
    if (process.argv[i].startsWith('--')) key = process.argv[i].slice(2);
    else if (key === 'osm') args.osm.push(process.argv[i]);
    else args[key] = process.argv[i];
}
if (!args.osm.length || !args.poi || !args.provinces) {
    console.error('usage: node scripts/build-map-data.mjs --osm <file>… --poi <poi-osm.json> --provinces <provinces.geojson>');
    process.exit(1);
}
// Points of interest are kept only inside the detailed city zone.
const BBOX = {minLat: 36.300, maxLat: 36.330, minLon: 59.512, maxLon: 59.566};
// The playable region: from the factory on the Chenaran road to Park Mellat and Ferdowsi University.
const REGION = {minLat: 36.298, maxLat: 36.462, minLon: 59.405, maxLon: 59.572};
const merged = new Map();
for (const file of args.osm) for (const e of JSON.parse(readFileSync(file, 'utf8')).elements) merged.set(`${e.type}/${e.id}`, e);
const city = [...merged.values()];
const poi = JSON.parse(readFileSync(args.poi, 'utf8')).elements;
const provincesPath = args.provinces;
const r1 = v => Math.round(v * 10) / 10;
const flat = geometry => geometry.flatMap(({lat, lon}) => {
    const {x, z} = toLocal(lat, lon);
    return [r1(x), r1(z)];
});
// Closed OSM rings repeat their first node; the game stores each vertex once.
const ring = geometry => {
    const pts = flat(geometry);
    if (pts.length > 4 && pts[0] === pts.at(-2) && pts[1] === pts.at(-1)) pts.length -= 2;
    return pts;
};
const hash = n => {
    n = (n ^ 61) ^ (n >>> 16);
    n = Math.imul(n, 9);
    n ^= n >>> 4;
    n = Math.imul(n, 0x27d4eb2d);
    return ((n ^ (n >>> 15)) >>> 0) / 4294967296;
};

const roadTypes = ['trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street', 'service', 'pedestrian', 'footway', 'cycleway', 'path', 'track', 'steps'];
const names = [], nameIndex = new Map();
const nameId = name => {
    if (!name) return -1;
    if (!nameIndex.has(name)) {
        nameIndex.set(name, names.length);
        names.push(name);
    }
    return nameIndex.get(name);
};
const roads = [], buildings = [], areas = [], labels = [];
const areaKinds = ['park', 'grass', 'forest', 'pitch', 'water', 'campus', 'industrial', 'farmland'];
const areaKind = t => t.leisure === 'park' || t.leisure === 'garden' || t.landuse === 'park' || t.landuse === 'recreation_ground' ? 'park'
    : t.landuse === 'grass' ? 'grass'
        : t.landuse === 'forest' || t.natural === 'wood' ? 'forest'
            : t.leisure === 'pitch' ? 'pitch'
                : t.natural === 'water' ? 'water'
                    : ['school', 'university', 'college'].includes(t.amenity) ? 'campus'
                        : t.landuse === 'industrial' ? 'industrial'
                            : t.landuse === 'farmland' ? 'farmland' : null;

// Joins a relation's outer member ways end to end into closed rings.
function joinRings(members) {
    const parts = members.filter(m => m.type === 'way' && m.role !== 'inner' && m.geometry?.length > 1).map(m => m.geometry.slice());
    const rings = [], same = (a, b) => a.lat === b.lat && a.lon === b.lon;
    while (parts.length) {
        let current = parts.shift();
        for (let grown = true; grown && !same(current[0], current.at(-1));) {
            grown = false;
            for (let i = 0; i < parts.length; i++) {
                const p = parts[i];
                if (same(current.at(-1), p[0])) current = current.concat(p.slice(1));
                else if (same(current.at(-1), p.at(-1))) current = current.concat(p.slice(0, -1).reverse());
                else continue;
                parts.splice(i, 1);
                grown = true;
                break;
            }
        }
        if (same(current[0], current.at(-1)) && current.length > 3) rings.push(current);
    }
    return rings;
}

for (const e of city) {
    const t = e.tags ?? {};
    // Motorways are drawn and routed like trunk roads.
    const highway = t.highway?.replace('_link', '').replace('motorway', 'trunk');
    if (e.type === 'way' && highway && roadTypes.includes(highway) && e.geometry?.length > 1) {
        // Whole ways come back from Overpass, so cut them where they leave the region.
        const inRegion = ({lat, lon}) => lat >= REGION.minLat && lat <= REGION.maxLat && lon >= REGION.minLon && lon <= REGION.maxLon;
        let run = [];
        for (const point of [...e.geometry, null]) {
            if (point && inRegion(point)) run.push(point);
            else {
                if (run.length > 1) roads.push([roadTypes.indexOf(highway), nameId(t.name), ...flat(run)]);
                run = [];
            }
        }
    } else if (e.type === 'way' && t.building && e.geometry?.length > 3) {
        const levels = Number.parseFloat(t['building:levels']), height = Number.parseFloat(t.height);
        const h = Number.isFinite(height) ? height : Number.isFinite(levels) ? levels * 3.2 : (2 + Math.floor(hash(e.id) * 4)) * 3.2;
        buildings.push([r1(Math.min(h, 80)), ...ring(e.geometry)]);
    } else if (e.type === 'way' && areaKind(t) && e.geometry?.length > 3) {
        areas.push([areaKinds.indexOf(areaKind(t)), ...ring(e.geometry)]);
    } else if (e.type === 'relation' && areaKind(t)) {
        for (const r of joinRings(e.members ?? [])) areas.push([areaKinds.indexOf(areaKind(t)), ...ring(r)]);
    }
    if (t.name && (t.amenity === 'school' || t.amenity === 'university' || t.leisure === 'park' || t.landuse === 'industrial')) {
        const c = e.type === 'node' ? e : e.bounds ? {lat: (e.bounds.minlat + e.bounds.maxlat) / 2, lon: (e.bounds.minlon + e.bounds.maxlon) / 2} : null;
        if (c) labels.push({name: t.name, kind: t.landuse === 'industrial' ? 'industrial' : t.amenity ?? 'park', ...roundPoint(toLocal(c.lat, c.lon))});
    }
}
for (const e of poi) {
    const t = e.tags ?? {}, c = e.center ?? e;
    if (c.lat < BBOX.minLat || c.lat > BBOX.maxLat || c.lon < BBOX.minLon || c.lon > BBOX.maxLon) continue;
    if (t.railway === 'station' || t.shop === 'mall') labels.push({name: t.name, kind: t.railway ? 'metro' : 'mall', ...roundPoint(toLocal(c.lat, c.lon))});
}

function roundPoint({x, z}) {
    return {x: r1(x), z: r1(z)};
}

// Areas draw largest first, so small pitches and ponds stay visible on top of parks.
const polygonArea = pts => {
    let a = 0;
    for (let i = 0; i < pts.length; i += 2) {
        const j = (i + 2) % pts.length;
        a += pts[i] * pts[j + 1] - pts[j] * pts[i + 1];
    }
    return Math.abs(a / 2);
};
areas.sort((a, b) => polygonArea(b.slice(1)) - polygonArea(a.slice(1)));
// The world spans every road we kept, plus a margin.
let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
for (const road of roads) for (let i = 2; i < road.length; i += 2) {
    minX = Math.min(minX, road[i]);
    maxX = Math.max(maxX, road[i]);
    minZ = Math.min(minZ, road[i + 1]);
    maxZ = Math.max(maxZ, road[i + 1]);
}
const min = {x: Math.floor(minX - 200), z: Math.floor(minZ - 200)}, max = {x: Math.ceil(maxX + 200), z: Math.ceil(maxZ + 200)};
const city_ = {
    origin: ORIGIN,
    attribution: '© OpenStreetMap contributors',
    bounds: {minX: min.x, minZ: min.z, maxX: max.x, maxZ: max.z},
    roadTypes, areaKinds, names, roads, buildings, areas,
    labels: [...new Map(labels.map(l => [l.name, l])).values()]
};
writeFileSync(new URL('../src/data/mellat.json', import.meta.url), JSON.stringify(city_));

// Douglas–Peucker keeps the province shapes recognisable at a fraction of the size.
function simplify(points, tolerance) {
    if (points.length < 3) return points;
    const [ax, ay] = points[0], [bx, by] = points.at(-1);
    let index = 0, distance = 0;
    for (let i = 1; i < points.length - 1; i++) {
        const [px, py] = points[i], dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
        // A closed ring starts and ends on the same point, so measure from that point instead.
        const d = len ? Math.abs(dy * px - dx * py + bx * ay - by * ax) / len : Math.hypot(px - ax, py - ay);
        if (d > distance) {
            index = i;
            distance = d;
        }
    }
    if (distance <= tolerance) return [points[0], points.at(-1)];
    return [...simplify(points.slice(0, index + 1), tolerance).slice(0, -1), ...simplify(points.slice(index), tolerance)];
}

const provinces = JSON.parse(readFileSync(provincesPath, 'utf8')).features
    .filter(f => f.properties.adm0_a3 === 'IRN')
    .map(f => {
        const polygons = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
        return {
            id: f.properties.name,
            name: f.properties.name_fa.replace(/^استان\s+/, ''),
            rings: polygons.map(p => simplify(p[0], .02).flatMap(([lon, lat]) => [Math.round(lon * 1000) / 1000, Math.round(lat * 1000) / 1000])).filter(r => r.length >= 8)
        };
    });
writeFileSync(new URL('../src/data/iran.json', import.meta.url), JSON.stringify({provinces}));
console.log(`roads ${roads.length}, buildings ${buildings.length}, areas ${areas.length}, labels ${city_.labels.length}, provinces ${provinces.length}`);
