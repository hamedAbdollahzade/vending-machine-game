// Road graph, A* routing and nearest-street lookup over the OSM road polylines.
// A road is [typeIndex, nameIndex, x0, z0, x1, z1, …]; ways that share an OSM node share coordinates.
export const DRIVABLE_MAX_TYPE = 7; // trunk … service in data.roadTypes

export function buildGraph(roads, {drivable = false} = {}) {
    const ids = new Map(), xs = [], zs = [], adj = [];
    const node = (x, z) => {
        const k = `${x},${z}`;
        if (!ids.has(k)) {
            ids.set(k, xs.length);
            xs.push(x);
            zs.push(z);
            adj.push([]);
        }
        return ids.get(k);
    };
    for (const road of roads) {
        if (drivable && road[0] > DRIVABLE_MAX_TYPE) continue;
        let prev = node(road[2], road[3]);
        for (let i = 4; i < road.length; i += 2) {
            const next = node(road[i], road[i + 1]), cost = Math.hypot(xs[next] - xs[prev], zs[next] - zs[prev]);
            if (next !== prev) {
                adj[prev].push(next, cost);
                adj[next].push(prev, cost);
            }
            prev = next;
        }
    }
    const graph = {xs, zs, adj, main: largestComponent(adj), grid: new Map()};
    graph.main.forEach((inMain, i) => {
        if (!inMain) return;
        const k = cellKey(Math.floor(xs[i] / 50), Math.floor(zs[i] / 50));
        if (!graph.grid.has(k)) graph.grid.set(k, []);
        graph.grid.get(k).push(i);
    });
    return graph;
}

const cellKey = (cx, cz) => cx * 100003 + cz;

function largestComponent(adj) {
    const label = new Int32Array(adj.length).fill(-1), sizes = [];
    for (let s = 0; s < adj.length; s++) {
        if (label[s] >= 0) continue;
        const id = sizes.length, stack = [s];
        let size = 0;
        label[s] = id;
        while (stack.length) {
            const n = stack.pop();
            size++;
            for (let i = 0; i < adj[n].length; i += 2) if (label[adj[n][i]] < 0) {
                label[adj[n][i]] = id;
                stack.push(adj[n][i]);
            }
        }
        sizes.push(size);
    }
    const best = sizes.indexOf(Math.max(...sizes));
    return Array.from(label, l => l === best);
}

// Nearest node of the main connected component, searching outward ring by ring.
export function nearestNode(graph, x, z) {
    const cx = Math.floor(x / 50), cz = Math.floor(z / 50);
    let best = -1, bestD = Infinity;
    for (let ring = 0; ring < 40; ring++) {
        for (let i = cx - ring; i <= cx + ring; i++) for (let j = cz - ring; j <= cz + ring; j++) {
            if (Math.max(Math.abs(i - cx), Math.abs(j - cz)) !== ring) continue;
            for (const n of graph.grid.get(cellKey(i, j)) ?? []) {
                const d = Math.hypot(graph.xs[n] - x, graph.zs[n] - z);
                if (d < bestD) {
                    bestD = d;
                    best = n;
                }
            }
        }
        if (best >= 0 && bestD < ring * 50) break;
    }
    return best;
}

export function findPath(graph, start, goal) {
    if (start < 0 || goal < 0) return null;
    const {xs, zs, adj} = graph, g = new Map([[start, 0]]), from = new Map(), closed = new Set();
    const h = n => Math.hypot(xs[n] - xs[goal], zs[n] - zs[goal]);
    const heap = [[h(start), start]];
    const push = item => {
        heap.push(item);
        for (let i = heap.length - 1; i > 0;) {
            const p = (i - 1) >> 1;
            if (heap[p][0] <= heap[i][0]) break;
            [heap[p], heap[i]] = [heap[i], heap[p]];
            i = p;
        }
    };
    const pop = () => {
        const top = heap[0], last = heap.pop();
        if (heap.length) {
            heap[0] = last;
            for (let i = 0; ;) {
                const l = i * 2 + 1, r = l + 1;
                let m = i;
                if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
                if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
                if (m === i) break;
                [heap[m], heap[i]] = [heap[i], heap[m]];
                i = m;
            }
        }
        return top;
    };
    while (heap.length) {
        const [, n] = pop();
        if (n === goal) {
            const path = [n];
            while (from.has(path[0])) path.unshift(from.get(path[0]));
            return path;
        }
        if (closed.has(n)) continue;
        closed.add(n);
        for (let i = 0; i < adj[n].length; i += 2) {
            const m = adj[n][i], cost = g.get(n) + adj[n][i + 1];
            if (cost < (g.get(m) ?? Infinity)) {
                g.set(m, cost);
                from.set(m, n);
                push([cost + h(m), m]);
            }
        }
    }
    return null;
}

export function routeBetween(graph, ax, az, bx, bz) {
    const path = findPath(graph, nearestNode(graph, ax, az), nearestNode(graph, bx, bz));
    if (!path) return null;
    const points = [{x: ax, z: az}, ...path.map(n => ({x: graph.xs[n], z: graph.zs[n]})), {x: bx, z: bz}];
    return {points, length: polylineLength(points)};
}

export function polylineLength(points) {
    let total = 0;
    for (let i = 1; i < points.length; i++) total += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
    return total;
}

// Spatial index of road segments, used for street names and keeping trees off paths.
export function buildSegmentIndex(roads) {
    const grid = new Map();
    for (const road of roads) for (let i = 4; i < road.length; i += 2) {
        const seg = [road[i - 2], road[i - 1], road[i], road[i + 1], road[0], road[1]];
        for (let cx = Math.floor(Math.min(seg[0], seg[2]) / 40); cx <= Math.floor(Math.max(seg[0], seg[2]) / 40); cx++)
            for (let cz = Math.floor(Math.min(seg[1], seg[3]) / 40); cz <= Math.floor(Math.max(seg[1], seg[3]) / 40); cz++) {
                const k = cellKey(cx, cz);
                if (!grid.has(k)) grid.set(k, []);
                grid.get(k).push(seg);
            }
    }
    return grid;
}

export function nearestSegment(index, x, z, maxDistance, filter = () => true) {
    let best = null, bestD = maxDistance;
    for (let cx = Math.floor((x - maxDistance) / 40); cx <= Math.floor((x + maxDistance) / 40); cx++)
        for (let cz = Math.floor((z - maxDistance) / 40); cz <= Math.floor((z + maxDistance) / 40); cz++)
            for (const s of index.get(cellKey(cx, cz)) ?? []) {
                if (!filter(s)) continue;
                const dx = s[2] - s[0], dz = s[3] - s[1];
                const t = Math.max(0, Math.min(1, ((x - s[0]) * dx + (z - s[1]) * dz) / (dx * dx + dz * dz || 1)));
                const d = Math.hypot(x - s[0] - dx * t, z - s[1] - dz * t);
                if (d < bestD) {
                    bestD = d;
                    best = {type: s[4], name: s[5], distance: d, x: s[0] + dx * t, z: s[1] + dz * t, dx, dz};
                }
            }
    return best;
}
