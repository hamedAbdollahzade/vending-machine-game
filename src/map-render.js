// Tactical 2D maps drawn from the same OSM data as the 3D city.
const SCALE = .75; // raster pixels per metre
const AREA = {campus: '#28322c', park: '#2c4a32', grass: '#30503a', forest: '#27432e', pitch: '#33603c', water: '#2b5b6e'};
const ROAD_WIDTH = [11, 10, 9, 8, 6.5, 6, 5, 4, 4, 2.4, 2, 1.6, 3, 2.2];
const roadColor = type => type <= 2 ? '#d7dcd3' : type <= 7 ? '#8e9891' : '#5f6b63';

export function createMapAssets(data) {
    const {minX, minZ, maxX, maxZ} = data.bounds;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil((maxX - minX) * SCALE);
    canvas.height = Math.ceil((maxZ - minZ) * SCALE);
    const c = canvas.getContext('2d');
    c.fillStyle = '#1b231f';
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.setTransform(SCALE, 0, 0, SCALE, -minX * SCALE, -minZ * SCALE);
    const path = pts => {
        c.beginPath();
        c.moveTo(pts[0], pts[1]);
        for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    };
    for (const area of data.areas) {
        c.fillStyle = AREA[data.areaKinds[area[0]]];
        path(area.slice(1));
        c.fill();
    }
    c.lineCap = c.lineJoin = 'round';
    // Minor roads first so boulevards draw on top.
    for (const road of [...data.roads].sort((a, b) => b[0] - a[0])) {
        c.strokeStyle = roadColor(road[0]);
        c.lineWidth = Math.max(1.6, ROAD_WIDTH[road[0]]);
        path(road.slice(2));
        c.stroke();
    }
    c.fillStyle = '#3c4943';
    for (const b of data.buildings) {
        path(b.slice(1));
        c.fill();
    }
    // One label per named boulevard, at the middle of its longest way.
    const streets = new Map();
    for (const road of data.roads) {
        if (road[1] < 0 || road[0] > 3) continue;
        let len = 0;
        for (let i = 4; i < road.length; i += 2) len += Math.hypot(road[i] - road[i - 2], road[i + 1] - road[i - 1]);
        const name = data.names[road[1]];
        if ((streets.get(name)?.len ?? 0) < len) {
            const mid = Math.floor((road.length - 2) / 4) * 2 + 2;
            const angle = Math.atan2(road[Math.min(mid + 3, road.length - 1)] - road[mid - 1], road[Math.min(mid + 2, road.length - 2)] - road[mid - 2]);
            streets.set(name, {name, len, x: road[mid], z: road[mid + 1], angle});
        }
    }
    return {canvas, bounds: data.bounds, labels: data.labels, streets: [...streets.values()].filter(s => s.len > 150)};
}

function rotatePoint(x, z, cx, cz, angle, k) {
    const dx = (x - cx) * k, dz = (z - cz) * k, cos = Math.cos(angle), sin = Math.sin(angle);
    return [dx * cos - dz * sin, dx * sin + dz * cos];
}

function machineIcon(c, x, y, {objective, visited, open}) {
    c.save();
    c.translate(x, y);
    if (objective) {
        c.rotate(Math.PI / 4);
        c.fillStyle = '#f2c94c';
        c.strokeStyle = '#1b1406';
        c.lineWidth = 2;
        c.fillRect(-7, -7, 14, 14);
        c.strokeRect(-7, -7, 14, 14);
    } else {
        c.fillStyle = open ? (visited ? '#7fb8ad' : '#3ee0c9') : '#7b817f';
        c.strokeStyle = '#08201c';
        c.lineWidth = 2;
        c.beginPath();
        c.roundRect(-6, -8, 12, 16, 3);
        c.fill();
        c.stroke();
        c.fillStyle = '#08201c';
        c.fillRect(-3, -5, 6, 6);
    }
    c.restore();
    if (visited) {
        c.fillStyle = '#fff';
        c.font = 'bold 11px sans-serif';
        c.fillText('✓', x + 8, y - 6);
    }
}

// Circular minimap rotated so the camera's forward direction points up.
export function drawMinimap(ctx, assets, view) {
    const {size, x, z, heading, camForward, radius, markers, route} = view;
    const r = size / 2, k = r / radius, angle = -Math.PI / 2 - Math.atan2(camForward.z, camForward.x);
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(r, r, r - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#141b18';
    ctx.fillRect(0, 0, size, size);
    ctx.translate(r, r);
    ctx.save();
    ctx.rotate(angle);
    ctx.scale(k / SCALE, k / SCALE);
    ctx.drawImage(assets.canvas, -(x - assets.bounds.minX) * SCALE, -(z - assets.bounds.minZ) * SCALE);
    ctx.restore();
    if (route?.length > 1) {
        ctx.strokeStyle = '#f2c94c';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        route.forEach((p, i) => {
            const [px, py] = rotatePoint(p.x, p.z, x, z, angle, k);
            i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        });
        ctx.stroke();
        ctx.setLineDash([]);
    }
    for (const m of markers) {
        let [px, py] = rotatePoint(m.x, m.z, x, z, angle, k);
        const d = Math.hypot(px, py);
        if (d > r - 12) {
            if (!m.objective) continue;
            px *= (r - 12) / d;
            py *= (r - 12) / d;
        }
        machineIcon(ctx, px, py, m);
    }
    // Player arrow, then north marker on the rim.
    ctx.save();
    ctx.rotate(angle + Math.atan2(-Math.sin(heading), Math.cos(heading)) + Math.PI / 2);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0b100e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(7, 8);
    ctx.lineTo(0, 4);
    ctx.lineTo(-7, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    const [nx, ny] = rotatePoint(x, z - 1, x, z, angle, 1);
    const nl = Math.hypot(nx, ny) || 1;
    ctx.fillStyle = '#f2c94c';
    ctx.font = 'bold 13px Vazirmatn, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ش', nx / nl * (r - 12), ny / nl * (r - 12));
    ctx.restore();
    ctx.strokeStyle = 'rgba(230,240,235,.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(r, r, r - 2, 0, Math.PI * 2);
    ctx.stroke();
}

// Full-screen city map. view = {cx, cz, mpp} (centre in metres, metres per CSS pixel).
export function drawFullMap(ctx, assets, view, state) {
    const {width, height} = ctx.canvas, dpr = state.dpr, w = width / dpr, h = height / dpr;
    const toScreen = (x, z) => [(x - view.cx) / view.mpp + w / 2, (z - view.cz) / view.mpp + h / 2];
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#101614';
    ctx.fillRect(0, 0, w, h);
    const [ox, oy] = toScreen(assets.bounds.minX, assets.bounds.minZ);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(assets.canvas, ox, oy, assets.canvas.width / SCALE / view.mpp, assets.canvas.height / SCALE / view.mpp);
    // Grid lines every 500 m, like a tactical map.
    ctx.strokeStyle = 'rgba(160,200,185,.08)';
    ctx.lineWidth = 1;
    for (let gx = Math.ceil(assets.bounds.minX / 500) * 500; gx < assets.bounds.maxX; gx += 500) {
        const [sx] = toScreen(gx, 0);
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, h);
        ctx.stroke();
    }
    for (let gz = Math.ceil(assets.bounds.minZ / 500) * 500; gz < assets.bounds.maxZ; gz += 500) {
        const [, sy] = toScreen(0, gz);
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(w, sy);
        ctx.stroke();
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (view.mpp < 3) {
        ctx.font = '11px Vazirmatn, sans-serif';
        ctx.fillStyle = 'rgba(235,240,232,.75)';
        for (const s of assets.streets) {
            const [sx, sy] = toScreen(s.x, s.z);
            if (sx < -100 || sy < -20 || sx > w + 100 || sy > h + 20) continue;
            ctx.save();
            ctx.translate(sx, sy);
            let a = s.angle;
            if (a > Math.PI / 2) a -= Math.PI;
            if (a < -Math.PI / 2) a += Math.PI;
            ctx.rotate(a);
            ctx.fillText(s.name, 0, 0);
            ctx.restore();
        }
    }
    for (const l of assets.labels) {
        if (l.kind === 'school' && view.mpp > 1.6) continue;
        const [sx, sy] = toScreen(l.x, l.z);
        ctx.font = `${l.kind === 'school' ? 10 : 12}px Vazirmatn, sans-serif`;
        ctx.fillStyle = {park: '#9fd49a', university: '#c9b6f2', school: '#e8c79a', metro: '#ff8a80', mall: '#f5b8d9'}[l.kind];
        ctx.fillText(l.kind === 'metro' ? `Ⓜ ${l.name.replace('ایستگاه مترو ', '')}` : l.name, sx, sy + 14);
    }
    if (state.route?.length > 1) {
        ctx.strokeStyle = '#f2c94c';
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 5]);
        ctx.beginPath();
        state.route.forEach((p, i) => {
            const [sx, sy] = toScreen(p.x, p.z);
            i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy);
        });
        ctx.stroke();
        ctx.setLineDash([]);
    }
    for (const m of state.markers) {
        const [sx, sy] = toScreen(m.x, m.z);
        if (m.id === state.selected) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx, sy, 16, 0, Math.PI * 2);
            ctx.stroke();
        }
        machineIcon(ctx, sx, sy, m);
    }
    const [px, py] = toScreen(state.player.x, state.player.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.atan2(-Math.sin(state.player.heading), Math.cos(state.player.heading)) + Math.PI / 2);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(8, 9);
    ctx.lineTo(0, 5);
    ctx.lineTo(-8, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return toScreen;
}

// Iran overview for the briefing and the map's country tab. `t` animates the highlight.
export function drawIran(ctx, iran, {width, height, t = 0, highlight = 'Razavi Khorasan', cities = []}) {
    const lon0 = 43.8, lon1 = 63.6, lat0 = 24.8, lat1 = 40;
    const kx = .84, k = Math.min(width / ((lon1 - lon0) * kx), height / (lat1 - lat0)) * .94;
    const offX = (width - (lon1 - lon0) * kx * k) / 2, offY = (height - (lat1 - lat0) * k) / 2;
    const p = (lon, lat) => [offX + (lon - lon0) * kx * k, offY + (lat1 - lat) * k];
    ctx.clearRect(0, 0, width, height);
    for (const province of iran.provinces) {
        const active = province.id === highlight;
        ctx.fillStyle = active ? `rgba(62,224,201,${.35 + Math.sin(t * 3) * .12})` : 'rgba(40,56,50,.85)';
        ctx.strokeStyle = active ? '#3ee0c9' : 'rgba(150,190,175,.35)';
        ctx.lineWidth = active ? 2 : 1;
        for (const ring of province.rings) {
            ctx.beginPath();
            for (let i = 0; i < ring.length; i += 2) {
                const [x, y] = p(ring[i], ring[i + 1]);
                i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    }
    ctx.textAlign = 'center';
    for (const city of cities) {
        const [x, y] = p(city.lon, city.lat);
        if (city.active) {
            ctx.strokeStyle = '#f2c94c';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 6 + (t * 18) % 18, 0, Math.PI * 2);
            ctx.globalAlpha = 1 - ((t * 18) % 18) / 18;
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        ctx.fillStyle = city.active ? '#f2c94c' : 'rgba(210,220,214,.6)';
        ctx.beginPath();
        ctx.arc(x, y, city.active ? 5 : 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = `${city.active ? 'bold 15px' : '11px'} Vazirmatn, sans-serif`;
        ctx.fillText(city.active ? city.name : `${city.name} 🔒`, x, y - 10);
    }
}
