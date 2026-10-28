// Tactical 2D maps drawn from the same OSM data as the 3D city. The region is too large for one
// raster, so detail is drawn in lazily rendered, cached tiles and an overview covers zoomed-out views.
const SCALE = 0.75; // tile pixels per metre
const TILE_PX = 512,
  TILE_M = TILE_PX / SCALE,
  MAX_TILES = 48;
const OVERVIEW_SCALE = 0.07;
const AREA = {
  campus: '#28322c',
  park: '#2c4a32',
  grass: '#30503a',
  forest: '#27432e',
  pitch: '#33603c',
  water: '#2b5b6e',
  industrial: '#262c29',
  farmland: '#2a3326',
};
const ROAD_WIDTH = [11, 10, 9, 8, 6.5, 6, 5, 4, 4, 2.4, 2, 1.6, 3, 2.2];
/**
 * Runs the road color operation for this subsystem.
 * @param {*} type - type.
 * @returns {*} Operation result, when applicable.
 */
const roadColor = (type) => (type <= 2 ? '#d7dcd3' : type <= 7 ? '#8e9891' : '#5f6b63');
/**
 * Runs the tile key operation for this subsystem.
 * @param {*} tx - tx.
 * @param {*} tz - tz.
 * @returns {*} Operation result, when applicable.
 */
const tileKey = (tx, tz) => tx * 100003 + tz;
/**
 * Runs the path operation for this subsystem.
 * @param {*} c - c.
 * @param {*} pts - pts.
 * @returns {*} Operation result, when applicable.
 */
function path(c, pts) {
  c.beginPath();
  c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
}

// Draws features in world metres; the caller sets up the transform. Minor roads go first.
/**
 * Runs the draw features operation for this subsystem.
 * @param {*} c - c.
 * @param {*} options1 - Operation options.
 * @param {*} data - data.
 * @param {*} minWidth - min Width.
 * @returns {*} Operation result, when applicable.
 */
function drawFeatures(c, { areas, roads, buildings }, data, minWidth) {
  for (const area of areas) {
    c.fillStyle = AREA[data.areaKinds[area[0]]];
    path(c, area.slice(1));
    c.fill();
  }
  c.lineCap = c.lineJoin = 'round';
  for (const road of roads) {
    c.strokeStyle = roadColor(road[0]);
    c.lineWidth = Math.max(minWidth, ROAD_WIDTH[road[0]]);
    path(c, road.slice(2));
    c.stroke();
  }
  c.fillStyle = '#3c4943';
  for (const b of buildings) {
    path(c, b.slice(1));
    c.fill();
  }
}
/**
 * Creates map assets resources for the game.
 * @param {*} data - data.
 * @param {*} extraLabels - extra Labels.
 * @returns {*} Operation result, when applicable.
 */
export function createMapAssets(data, extraLabels = []) {
  const { minX, minZ, maxX, maxZ } = data.bounds;
  // Bin every feature into the tiles its bounding box touches.
  const bins = new Map();
  /**
   * Runs the bin operation for this subsystem.
   * @param {*} list - list.
   * @param {*} feature - feature.
   * @param {*} first - first.
   * @returns {*} Operation result, when applicable.
   */
  const bin = (list, feature, first) => {
    let x0 = Infinity,
      z0 = Infinity,
      x1 = -Infinity,
      z1 = -Infinity;
    for (let i = first; i < feature.length; i += 2) {
      x0 = Math.min(x0, feature[i]);
      x1 = Math.max(x1, feature[i]);
      z0 = Math.min(z0, feature[i + 1]);
      z1 = Math.max(z1, feature[i + 1]);
    }
    for (let tx = Math.floor((x0 - 8) / TILE_M); tx <= Math.floor((x1 + 8) / TILE_M); tx++)
      for (let tz = Math.floor((z0 - 8) / TILE_M); tz <= Math.floor((z1 + 8) / TILE_M); tz++) {
        const k = tileKey(tx, tz);
        if (!bins.has(k))
          bins.set(k, {
            areas: [],
            roads: [],
            buildings: [],
          });
        bins.get(k)[list].push(feature);
      }
  };
  data.areas.forEach((a) => bin('areas', a, 1));
  [...data.roads].sort((a, b) => b[0] - a[0]).forEach((r) => bin('roads', r, 2));
  data.buildings.forEach((b) => bin('buildings', b, 1));
  const cache = new Map();
  /**
   * Runs the tile operation for this subsystem.
   * @param {*} tx - tx.
   * @param {*} tz - tz.
   * @returns {*} Operation result, when applicable.
   */
  function tile(tx, tz) {
    const k = tileKey(tx, tz);
    if (cache.has(k)) {
      const canvas = cache.get(k);
      cache.delete(k);
      cache.set(k, canvas);
      return canvas;
    }
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = TILE_PX;
    const c = canvas.getContext('2d');
    c.fillStyle = '#1b231f';
    c.fillRect(0, 0, TILE_PX, TILE_PX);
    c.setTransform(SCALE, 0, 0, SCALE, -tx * TILE_M * SCALE, -tz * TILE_M * SCALE);
    drawFeatures(
      c,
      bins.get(k) ?? {
        areas: [],
        roads: [],
        buildings: [],
      },
      data,
      1.6,
    );
    cache.set(k, canvas);
    if (cache.size > MAX_TILES) cache.delete(cache.keys().next().value);
    return canvas;
  }
  const overview = document.createElement('canvas');
  overview.width = Math.ceil((maxX - minX) * OVERVIEW_SCALE);
  overview.height = Math.ceil((maxZ - minZ) * OVERVIEW_SCALE);
  const o = overview.getContext('2d');
  o.fillStyle = '#1b231f';
  o.fillRect(0, 0, overview.width, overview.height);
  o.setTransform(
    OVERVIEW_SCALE,
    0,
    0,
    OVERVIEW_SCALE,
    -minX * OVERVIEW_SCALE,
    -minZ * OVERVIEW_SCALE,
  );
  drawFeatures(
    o,
    {
      areas: data.areas,
      roads: data.roads.filter((r) => r[0] <= 5).sort((a, b) => b[0] - a[0]),
      buildings: [],
    },
    data,
    14,
  );

  // One label per named boulevard, at the middle of its longest way.
  const streets = new Map();
  for (const road of data.roads) {
    if (road[1] < 0 || road[0] > 3) continue;
    let len = 0;
    for (let i = 4; i < road.length; i += 2)
      len += Math.hypot(road[i] - road[i - 2], road[i + 1] - road[i - 1]);
    const name = data.names[road[1]];
    if ((streets.get(name)?.len ?? 0) < len) {
      const mid = Math.floor((road.length - 2) / 4) * 2 + 2;
      const angle = Math.atan2(
        road[Math.min(mid + 3, road.length - 1)] - road[mid - 1],
        road[Math.min(mid + 2, road.length - 2)] - road[mid - 2],
      );
      streets.set(name, {
        name,
        len,
        x: road[mid],
        z: road[mid + 1],
        angle,
      });
    }
  }
  return {
    tile,
    overview,
    bounds: data.bounds,
    labels: [...data.labels, ...extraLabels],
    streets: [...streets.values()].filter((s) => s.len > 150),
  };
}

// Paints the map for the world rectangle x0..x1, z0..z1 into a context already transformed to world
// metres; pxPerMetre decides between detailed tiles and the overview.
/**
 * Runs the paint world operation for this subsystem.
 * @param {*} c - c.
 * @param {*} assets - assets.
 * @param {*} x0 - x0.
 * @param {*} z0 - z0.
 * @param {*} x1 - x1.
 * @param {*} z1 - z1.
 * @param {*} pxPerMetre - px Per Metre.
 * @returns {*} Operation result, when applicable.
 */
function paintWorld(c, assets, x0, z0, x1, z1, pxPerMetre) {
  const { minX, minZ } = assets.bounds;
  c.fillStyle = '#141b18';
  c.fillRect(x0, z0, x1 - x0, z1 - z0);
  if (pxPerMetre < 0.22) {
    c.drawImage(
      assets.overview,
      minX,
      minZ,
      assets.overview.width / OVERVIEW_SCALE,
      assets.overview.height / OVERVIEW_SCALE,
    );
    return;
  }
  for (let tx = Math.floor(x0 / TILE_M); tx <= Math.floor(x1 / TILE_M); tx++)
    for (let tz = Math.floor(z0 / TILE_M); tz <= Math.floor(z1 / TILE_M); tz++)
      c.drawImage(assets.tile(tx, tz), tx * TILE_M, tz * TILE_M, TILE_M + 0.5, TILE_M + 0.5);
}
/**
 * Runs the rotate point operation for this subsystem.
 * @param {*} x - x.
 * @param {*} z - z.
 * @param {*} cx - cx.
 * @param {*} cz - cz.
 * @param {*} angle - angle.
 * @param {*} k - k.
 * @returns {*} Operation result, when applicable.
 */
function rotatePoint(x, z, cx, cz, angle, k) {
  const dx = (x - cx) * k,
    dz = (z - cz) * k,
    cos = Math.cos(angle),
    sin = Math.sin(angle);
  return [dx * cos - dz * sin, dx * sin + dz * cos];
}
/**
 * Runs the machine icon operation for this subsystem.
 * @param {*} c - c.
 * @param {*} x - x.
 * @param {*} y - y.
 * @param {*} options3 - Operation options.
 * @returns {*} Operation result, when applicable.
 */
function machineIcon(c, x, y, { objective, visited, open }) {
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
/**
 * Runs the draw minimap operation for this subsystem.
 * @param {*} ctx - ctx.
 * @param {*} assets - assets.
 * @param {*} view - view.
 * @returns {*} Operation result, when applicable.
 */
export function drawMinimap(ctx, assets, view) {
  const { size, x, z, heading, camForward, radius, markers, route } = view;
  const r = size / 2,
    k = r / radius,
    angle = -Math.PI / 2 - Math.atan2(camForward.z, camForward.x);
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
  ctx.scale(k, k);
  ctx.translate(-x, -z);
  paintWorld(
    ctx,
    assets,
    x - radius * 1.5,
    z - radius * 1.5,
    x + radius * 1.5,
    z + radius * 1.5,
    k,
  );
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
  ctx.fillText('ش', (nx / nl) * (r - 12), (ny / nl) * (r - 12));
  ctx.restore();
  ctx.strokeStyle = 'rgba(230,240,235,.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(r, r, r - 2, 0, Math.PI * 2);
  ctx.stroke();
}

// Full-screen city map. view = {cx, cz, mpp} (centre in metres, metres per CSS pixel).
/**
 * Runs the draw full map operation for this subsystem.
 * @param {*} ctx - ctx.
 * @param {*} assets - assets.
 * @param {*} view - view.
 * @param {*} state - state.
 * @returns {*} Operation result, when applicable.
 */
export function drawFullMap(ctx, assets, view, state) {
  const { width, height } = ctx.canvas,
    dpr = state.dpr,
    w = width / dpr,
    h = height / dpr;
  /**
   * Runs the to screen operation for this subsystem.
   * @param {*} x - x.
   * @param {*} z - z.
   * @returns {*} Operation result, when applicable.
   */
  const toScreen = (x, z) => [(x - view.cx) / view.mpp + w / 2, (z - view.cz) / view.mpp + h / 2];
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#101614';
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(1 / view.mpp, 1 / view.mpp);
  ctx.translate(-view.cx, -view.cz);
  paintWorld(
    ctx,
    assets,
    view.cx - (w / 2) * view.mpp,
    view.cz - (h / 2) * view.mpp,
    view.cx + (w / 2) * view.mpp,
    view.cz + (h / 2) * view.mpp,
    1 / view.mpp,
  );
  ctx.restore();
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
    if (l.kind === 'industrial' && view.mpp > 6) continue;
    ctx.fillStyle = {
      park: '#9fd49a',
      university: '#c9b6f2',
      school: '#e8c79a',
      metro: '#ff8a80',
      mall: '#f5b8d9',
      industrial: '#a9b2ad',
      factory: '#3ee0c9',
    }[l.kind];
    if (l.kind === 'factory') ctx.font = 'bold 14px Vazirmatn, sans-serif';
    ctx.fillText(
      l.kind === 'metro' ? `Ⓜ ${l.name.replace('ایستگاه مترو ', '')}` : l.name,
      sx,
      sy + 14,
    );
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
  ctx.rotate(
    Math.atan2(-Math.sin(state.player.heading), Math.cos(state.player.heading)) + Math.PI / 2,
  );
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
/**
 * Runs the draw iran operation for this subsystem.
 * @param {*} ctx - ctx.
 * @param {*} iran - iran.
 * @param {*} options2 - Operation options.
 * @returns {*} Operation result, when applicable.
 */
export function drawIran(
  ctx,
  iran,
  { width, height, t = 0, highlight = 'Razavi Khorasan', cities = [] },
) {
  const lon0 = 43.8,
    lon1 = 63.6,
    lat0 = 24.8,
    lat1 = 40;
  const kx = 0.84,
    k = Math.min(width / ((lon1 - lon0) * kx), height / (lat1 - lat0)) * 0.94;
  const offX = (width - (lon1 - lon0) * kx * k) / 2,
    offY = (height - (lat1 - lat0) * k) / 2;
  /**
   * Runs the p operation for this subsystem.
   * @param {*} lon - lon.
   * @param {*} lat - lat.
   * @returns {*} Operation result, when applicable.
   */
  const p = (lon, lat) => [offX + (lon - lon0) * kx * k, offY + (lat1 - lat) * k];
  ctx.clearRect(0, 0, width, height);
  for (const province of iran.provinces) {
    const active = province.id === highlight;
    ctx.fillStyle = active
      ? `rgba(62,224,201,${0.35 + Math.sin(t * 3) * 0.12})`
      : 'rgba(40,56,50,.85)';
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
      ctx.arc(x, y, 6 + ((t * 18) % 18), 0, Math.PI * 2);
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
