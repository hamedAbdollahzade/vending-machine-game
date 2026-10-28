import * as THREE from 'three';
import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/600.css';
import '@fontsource/vazirmatn/800.css';
import './style.css';
import { setupPwa } from './pwa.js';
import {
  startTracking,
  requestCompass,
  arrivalRadius,
  insideWorld,
  createStabilizer,
  MAX_WALKING_SPEED,
} from './realworld.js';
import { createArView } from './ar.js';
import data from './data/mellat.json';
import iran from './data/iran.json';
import { createCity } from './city.js';
import { createImagery } from './imagery.js';
import { decodeBuildings } from './buildings-data.js';
import { createCollisionWorld, addPolygon, resolveCircle, clearFraction } from './collision.js';
import {
  buildGraph,
  routeBetween,
  buildSegmentIndex,
  nearestSegment,
  DRIVABLE_MAX_TYPE,
} from './routing.js';
import { machines, CATEGORIES, CITY_START, FACTORY, lockedPlaces } from './locations.js';
import {
  createState,
  catalog,
  priceAt,
  isOpen,
  purchaseBlocker,
  formatHetoman,
  formatClock,
  fa,
  canAffordAnything,
} from './game-state.js';
import {
  createPayment,
  beginPayment,
  readyPayment,
  swipePayment,
  cancelPayment,
} from './payment.js';
import { awardsFor, rankFor, completeMissions, activeMission, MISSIONS } from './scoring.js';
import { createFamily } from './characters.js';
import { createVendingMachine } from './vending.js';
import { createFactory } from './factory.js';
import { createCar, stepCar, kmh } from './vehicle.js';
import { createTraffic } from './traffic.js';
import { createSportSedan } from './car-models.js';
import { createMapAssets, drawMinimap, drawFullMap, drawIran } from './map-render.js';
import { bearing, formatDistance, toLocal } from './geo.js';

const $ = (s) => document.querySelector(s);
const canvas = $('#world');
let renderer;
try {
  // alpha: in camera AR view the phone's camera picture shows through where nothing is drawn.
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
} catch {
  $('#loading').textContent =
    'مرورگر شما گرافیک سه‌بعدی (WebGL) را اجرا نمی‌کند. شتاب‌دهی گرافیکی را فعال کنید.';
  throw new Error('WebGL unavailable');
}
// Low quality (no shadows, 1× pixels) for weak phones; chosen with ?quality=low or the toolbar button.
const quality =
  new URLSearchParams(location.search).get('quality') ??
  (() => {
    try {
      return localStorage.getItem('quality');
    } catch {
      return null;
    }
  })() ??
  (matchMedia('(pointer: coarse)').matches ? 'low' : 'high');
renderer.setPixelRatio(quality === 'low' ? 1 : Math.min(devicePixelRatio, 1.75));
renderer.shadowMap.enabled = quality !== 'low';
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const fog = new THREE.Fog('#d8cdb4', 220, 1500);
scene.fog = fog;
const camera = new THREE.PerspectiveCamera(62, 1, 0.3, 7000);

// Morning sky over Mashhad: a gradient dome, warm haze at the horizon.
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(5000, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color('#6f9fd0') },
      horizon: { value: new THREE.Color('#e6dbc3') },
    },
    vertexShader:
      'varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader:
      'uniform vec3 top; uniform vec3 horizon; varying vec3 vPos; void main(){ float h = clamp(normalize(vPos).y * 2.2, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, h), 1.0); }',
  }),
);
scene.add(sky);
scene.add(new THREE.HemisphereLight('#fff4dc', '#7d715d', 1.6));
const sun = new THREE.DirectionalLight('#ffe9c2', 3.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {
  left: -75,
  right: 75,
  top: 75,
  bottom: -75,
  near: 10,
  far: 700,
});
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.4;
scene.add(sun, sun.target);

// ---------- World data ----------
// Microsoft's building footprints and the satellite tile list are downloaded files, not bundled code.
// The game still runs without them (OSM buildings and drawn roads).
const loadFile = (path, read) =>
  fetch(path)
    .then((r) => (r.ok ? r[read]() : null))
    .catch(() => null);
const [buildingsFile, imageryIndex] = await Promise.all([
  loadFile('./data/buildings.bin', 'arrayBuffer'),
  loadFile('./imagery/index.json', 'json'),
]);
// Footprints reaching into the factory compound are left out: the game's own buildings stand there.
const inFactory = (x, z) => {
  const dx = x - FACTORY.center.x,
    dz = z - FACTORY.center.z;
  const u = dx * FACTORY.axis.x + dz * FACTORY.axis.z,
    v = -dx * FACTORY.axis.z + dz * FACTORY.axis.x;
  return u > -112 && u < 82 && v > -52 && v < 52;
};
const extraBuildings = (buildingsFile ? decodeBuildings(buildingsFile) : []).filter((b) => {
  for (let i = 1; i < b.length; i += 2) if (inFactory(b[i], b[i + 1])) return false;
  return true;
});
const collision = createCollisionWorld(
  [...data.buildings, ...extraBuildings].map((b) => b.slice(1)),
);
const segments = buildSegmentIndex(data.roads);
const walkGraph = buildGraph(data.roads),
  driveGraph = buildGraph(data.roads, { drivable: true });
const ROAD_HALF_WIDTH = [5.5, 5, 4.5, 4, 3.2, 3, 2.5, 2];

const rotateLocal = (lx, lz, rot) => ({
  x: lx * Math.cos(rot) + lz * Math.sin(rot),
  z: -lx * Math.sin(rot) + lz * Math.cos(rot),
});

// The game starts inside the vending-machine factory on the Mashhad–Chenaran road.
const factory = createFactory(scene);
factory.footprints.forEach((f) => addPolygon(collision, f));

// City machines stand beside their path point, on whichever side is free, facing the path;
// the factory's demo machine has a fixed place inside the production hall.
const stations = machines.map((def) => {
  if (def.spot) {
    // Test points: the given coordinate is where the player stands; the machine faces the factory.
    const front = toLocal(def.spot.lat, def.spot.lon);
    const dx = FACTORY.center.x - front.x,
      dz = FACTORY.center.z - front.z,
      len = Math.hypot(dx, dz) || 1;
    return placeStation(
      def,
      { x: front.x - (dx / len) * 1.9, z: front.z - (dz / len) * 1.9 },
      Math.atan2(dx, dz),
    );
  }
  if (!def.anchor) return placeStation(def, factory.demo, factory.demo.rot);
  const seg = nearestSegment(segments, def.anchor.x, def.anchor.z, 40) ?? { dx: 1, dz: 0, type: 9 };
  const len = Math.hypot(seg.dx, seg.dz) || 1,
    nx = -seg.dz / len,
    nz = seg.dx / len;
  const off = (seg.type <= DRIVABLE_MAX_TYPE ? ROAD_HALF_WIDTH[seg.type] : 1.2) + 2.4;
  let pos = null;
  for (const d of [off, -off, off + 1.5, -off - 1.5]) {
    const x = def.anchor.x + nx * d,
      z = def.anchor.z + nz * d;
    if (!resolveCircle(collision, x, z, 1.4).hit) {
      pos = { x, z };
      break;
    }
  }
  pos ??= { x: def.anchor.x + nx * off, z: def.anchor.z + nz * off };
  return placeStation(def, pos, Math.atan2(def.anchor.x - pos.x, def.anchor.z - pos.z));
});

function placeStation(def, pos, rot) {
  const model = createVendingMachine(def);
  model.group.position.set(pos.x, 0, pos.z);
  model.group.rotation.y = rot;
  scene.add(model.group);
  addPolygon(
    collision,
    [
      [-1, -0.6],
      [1, -0.6],
      [1, 0.6],
      [-1, 0.6],
    ].flatMap(([lx, lz]) => {
      const p = rotateLocal(lx, lz, rot);
      return [pos.x + p.x, pos.z + p.z];
    }),
  );
  const front = rotateLocal(0, 1.9, rot);
  return { def, model, x: pos.x, z: pos.z, rot, front: { x: pos.x + front.x, z: pos.z + front.z } };
}

const stationById = (id) => stations.find((s) => s.def.id === id);
for (const s of stations) if (s.def.test) s.model.group.visible = false;

// In real-world mode a circle on the ground marks how close counts as "at the machine".
for (const s of stations) {
  s.reach = new THREE.Mesh(
    new THREE.RingGeometry(0.96, 1, 96),
    new THREE.MeshBasicMaterial({
      color: '#3ee0c9',
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      fog: false,
      side: THREE.DoubleSide,
    }),
  );
  s.reach.rotation.x = -Math.PI / 2;
  s.reach.position.set(s.front.x, 0.08, s.front.z);
  s.reach.visible = false;
  scene.add(s.reach);
}

function updateReachCircles() {
  const radius = reachRadius(),
    objective = real.on ? objectiveStation() : null;
  for (const s of stations) {
    s.reach.visible = real.on;
    if (!real.on) continue;
    s.reach.scale.setScalar(radius);
    s.reach.material.color.set(s === objective ? '#f2c94c' : '#3ee0c9');
  }
}
// GPS test points only take part while real-world mode is on.
const activeStations = () => stations.filter((s) => !s.def.test || real.on);
// The closest active machine whose front is within `radius` of (x, z).
const closestStation = (x, z, radius) =>
  activeStations()
    .map((s) => ({ s, d: Math.hypot(s.front.x - x, s.front.z - z) }))
    .filter(({ d }) => d < radius)
    .sort((a, b) => a.d - b.d)[0]?.s ?? null;

const imagery = createImagery(scene, imageryIndex ?? {}, {
  lowQuality: quality === 'low',
  anisotropy: Math.min(16, renderer.capabilities.getMaxAnisotropy()),
});
const city = createCity(scene, data, {
  collision,
  segments,
  extraBuildings,
  satellite: imagery.available,
  lowQuality: quality === 'low',
});
if (imagery.available)
  $('#attribution').textContent += ` · تصویر ماهواره‌ای: ${imageryIndex.attribution}`;
const traffic = createTraffic(scene, data, 28);
const mapAssets = createMapAssets(data, [factory.label]);

// Park gate sign at the first city machine.
const parkGate = new THREE.Group();
{
  const start = stationById(CITY_START),
    sign = document.createElement('canvas');
  sign.width = 512;
  sign.height = 128;
  const c = sign.getContext('2d');
  c.fillStyle = '#244d2e';
  c.fillRect(0, 0, 512, 128);
  c.fillStyle = '#f4efd9';
  c.textAlign = 'center';
  c.font = 'bold 64px Vazirmatn, Tahoma, sans-serif';
  c.fillText('بوستان ملت', 256, 86);
  const texture = new THREE.CanvasTexture(sign);
  texture.colorSpace = THREE.SRGBColorSpace;
  const gate = parkGate,
    post = new THREE.MeshStandardMaterial({ color: '#6b5a49' });
  for (const side of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4, 0.3), post);
    p.position.set(side * 2.6, 2, 0);
    p.castShadow = true;
    gate.add(p);
  }
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(5.6, 1.4),
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
  );
  board.position.y = 4;
  gate.add(board);
  const at = rotateLocal(-4.5, 1.5, start.rot);
  gate.position.set(start.x + at.x, 0, start.z + at.z);
  gate.rotation.y = start.rot;
  scene.add(gate);
}

// ---------- Actors ----------
const family = createFamily();
scene.add(family.group);
// The Robot Market guide lives inside the machines and comes out when the family arrives.
const guide = createFamily({ robot: true });
guide.group.visible = false;
scene.add(guide.group);
const carModel = createSportSedan('#1d3f78');
scene.add(carModel.group);

let state, payment, player, car, mode, cam, waypoint, route, routeTimer, deliveryTimer, ended;
const keys = new Set();

// The family car waits in the factory yard right beside them, pointing at the gate.
const spawnCar = () => createCar(factory.car.x, factory.car.z, factory.car.heading);

function reset() {
  state = createState();
  payment = createPayment();
  // The family starts in the factory yard, facing the engineering office.
  const spot = resolveCircle(collision, factory.start.x, factory.start.z, 1);
  player = { x: spot.x, z: spot.z, heading: factory.start.heading, speed: 0, gait: 0 };
  factory.reset();
  for (const t of factory.talks) t.done = false;
  car = spawnCar();
  mode = 'walk';
  // Camera yaw: the camera sits at target + (sin yaw, cos yaw) * distance, so it looks along (-sin, -cos).
  cam = {
    yaw: Math.atan2(-Math.cos(player.heading), Math.sin(player.heading)),
    pitch: 0.32,
    distance: 5.5,
    lastMouse: -10,
  };
  waypoint = null;
  route = null;
  routeTimer = 0;
  deliveryTimer = 0;
  ended = false;
  hints = { closed: false, car: false };
  Object.assign(guideState, { station: null, t: 0, greeted: new Set(), arrived: 0 });
  $('#payment').hidden = true;
  for (const s of stations) {
    s.model.delivery.visible = s.model.card.visible = false;
    s.model.flap.rotation.x = 0;
  }
  for (const d of ['#shop', '#map-dialog', '#end']) if ($(d).open) $(d).close();
  keys.clear();
  refreshHUD();
}

// ---------- Input ----------
const isTouch = matchMedia('(pointer: coarse)').matches;
const anyDialogOpen = () =>
  $('#shop').open || $('#map-dialog').open || $('#end').open || !$('#briefing').hidden;
// Physical key codes, so the controls also work with a Persian keyboard layout.
const keyName = (e) =>
  e.code.startsWith('Key') ? e.code.slice(3).toLowerCase() : e.key.toLowerCase();
window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  const k = keyName(e);
  if (k === 'm' && !e.repeat && $('#briefing').hidden) {
    e.preventDefault();
    $('#map-dialog').open ? $('#map-dialog').close() : openMap();
    return;
  }
  if (anyDialogOpen()) return;
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'tab'].includes(k))
    e.preventDefault();
  if (e.repeat) return;
  keys.add(k);
  if (k === 'f') toggleCar();
  if (k === 'e') interact();
  if (k === 'c') swipe();
  if (k === 'escape' && payment.phase !== 'idle') cancel();
});
window.addEventListener('keyup', (e) => keys.delete(keyName(e)));
window.addEventListener('blur', () => keys.clear());

// Pointer lock gives a shooter-style mouse look; dragging works as a fallback and on touch.
canvas.addEventListener('click', () => {
  if (!isTouch && !anyDialogOpen() && document.pointerLockElement !== canvas)
    canvas.requestPointerLock?.()?.catch?.(() => {});
});
document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== canvas) return;
  look(e.movementX, e.movementY, 0.0024);
});
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  if (document.pointerLockElement === canvas) return;
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag || drag.id !== e.pointerId) return;
  look(e.clientX - drag.x, e.clientY - drag.y, 0.005);
  drag.x = e.clientX;
  drag.y = e.clientY;
});
canvas.addEventListener('pointerup', () => (drag = null));
canvas.addEventListener('pointercancel', () => (drag = null));
canvas.addEventListener(
  'wheel',
  (e) => {
    cam.distance = THREE.MathUtils.clamp(cam.distance + Math.sign(e.deltaY) * 0.6, 3, 12);
  },
  { passive: true },
);

function look(dx, dy, k) {
  // In AR view the phone's orientation aims the camera; dragging only helps when there is no sensor.
  if (real.on) {
    if (arView.hasOrientation) return;
    cam.yaw -= dx * k;
    cam.arPitch = THREE.MathUtils.clamp((cam.arPitch ?? 0) - dy * k * 0.8, -1.2, 1.2);
    cam.lastMouse = elapsed;
    return;
  }
  cam.yaw -= dx * k;
  cam.pitch = THREE.MathUtils.clamp(cam.pitch + dy * k * 0.8, -0.15, 1.15);
  cam.lastMouse = elapsed;
}

// Touch joystick: x steers / strafes, y walks / throttles.
const stick = { x: 0, y: 0, id: null };
if (isTouch) {
  $('#touch').hidden = false;
  const pad = $('#stick'),
    knob = pad.querySelector('i');
  const move = (e) => {
    const r = pad.getBoundingClientRect(),
      dx = e.clientX - (r.left + r.width / 2),
      dy = e.clientY - (r.top + r.height / 2);
    const len = Math.min(1, Math.hypot(dx, dy) / (r.width / 2)),
      a = Math.atan2(dy, dx);
    stick.x = Math.cos(a) * len;
    stick.y = -Math.sin(a) * len;
    knob.style.transform = `translate(${stick.x * 40}px, ${-stick.y * 40}px)`;
  };
  pad.addEventListener('pointerdown', (e) => {
    stick.id = e.pointerId;
    pad.setPointerCapture(e.pointerId);
    move(e);
  });
  pad.addEventListener('pointermove', (e) => e.pointerId === stick.id && move(e));
  const end = () => {
    stick.id = null;
    stick.x = stick.y = 0;
    knob.style.transform = '';
  };
  pad.addEventListener('pointerup', end);
  pad.addEventListener('pointercancel', end);
  for (const b of document.querySelectorAll('.touch-buttons button'))
    b.addEventListener('click', () => {
      const k = b.dataset.key;
      if (k === 'shift')
        b.classList.toggle(
          'on',
          keys.has('shift') ? (keys.delete('shift'), false) : (keys.add('shift'), true),
        );
      if (k === 'f') toggleCar();
      if (k === 'e') payment.phase === 'ready' ? swipe() : interact();
    });
}

const axis = (pos, neg) =>
  Number(pos.some((k) => keys.has(k))) - Number(neg.some((k) => keys.has(k)));

// ---------- Subtitles ----------
const SPEAKERS = { robot: 'روبات', father: 'پدر', child: 'بچه' };
// Factory staff speak under their own names.
for (const t of factory.talks) if (t.label) SPEAKERS[t.speaker] = t.label;
let lines = [],
  lineTimer = 0,
  talking = false;

// `face` picks the robot's expression portrait (public/robot/<face>.webp).
function say(speaker, text, face = 'happy', seconds = Math.max(2.6, text.length * 0.06)) {
  if (lines.some((l) => l.text === text)) return;
  lines.push({ speaker, text, face, seconds });
}

function updateSubtitles(dt) {
  lineTimer -= dt;
  if (lineTimer > 0) return;
  const next = lines.shift();
  $('#subtitle').hidden = !next;
  talking = next?.speaker === 'robot';
  if (!next) return;
  $('#subtitle-speaker').textContent = `${SPEAKERS[next.speaker]}:`;
  $('#subtitle-speaker').className = ['robot', 'father', 'child'].includes(next.speaker)
    ? next.speaker
    : 'staff';
  $('#subtitle-text').textContent = next.text;
  $('#subtitle-face').hidden = next.speaker !== 'robot';
  if (next.speaker === 'robot') $('#subtitle-face').src = `./robot/${next.face}.webp`;
  lineTimer = next.seconds;
}

// ---------- Sound ----------
let audio = null,
  soundOn = false,
  engine = null;

function tone(freq, duration = 0.12, volume = 0.05, type = 'sine') {
  if (!soundOn) return;
  const o = audio.createOscillator(),
    g = audio.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, audio.currentTime);
  o.frequency.exponentialRampToValueAtTime(freq * 0.7, audio.currentTime + duration);
  g.gain.setValueAtTime(volume, audio.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
  o.connect(g).connect(audio.destination);
  o.start();
  o.stop(audio.currentTime + duration);
}

$('#sound').onclick = async () => {
  try {
    audio ??= new AudioContext();
    await audio.resume();
    soundOn = !soundOn;
    if (!engine) {
      const o = audio.createOscillator(),
        g = audio.createGain();
      o.type = 'sawtooth';
      g.gain.value = 0;
      o.connect(g).connect(audio.destination);
      o.start();
      engine = { o, g };
    }
    $('#sound').textContent = soundOn ? 'صدا: روشن' : 'صدا: خاموش';
    $('#sound').setAttribute('aria-pressed', String(soundOn));
    tone(700);
  } catch {
    $('#sound').textContent = 'صدا در دسترس نیست';
  }
};

// ---------- Car ----------
function toggleCar() {
  if (payment.phase !== 'idle' || state.busy) return;
  if (real.on) {
    say('father', 'توی حالت دنیای واقعی پیاده راه می‌ریم؛ ماشین مجازی لازم نیست.');
    return;
  }
  if (mode === 'walk') {
    if (Math.hypot(car.x - player.x, car.z - player.z) > 4.5) return;
    mode = 'drive';
    cam.distance = Math.max(cam.distance, 8);
    tone(320, 0.2, 0.05, 'square');
    say('father', 'کمربندها رو ببندیم! مسیر طلایی روی زمین راه رو نشون می‌ده.');
  } else {
    if (Math.abs(car.speed) > 3) {
      say('father', 'اول ماشین را نگه دار، بعد پیاده می‌شویم.');
      return;
    }
    // Step out on the driver's (left) side, or wherever is free.
    const left = { x: -Math.sin(car.heading), z: -Math.cos(car.heading) };
    const spot = resolveCircle(collision, car.x + left.x * 2.8, car.z + left.z * 2.8, 1);
    Object.assign(player, { x: spot.x, z: spot.z, heading: car.heading });
    car.speed = 0;
    mode = 'walk';
    cam.distance = 5.5;
    tone(260, 0.2, 0.05, 'square');
  }
  refreshHUD();
}

// ---------- Machines, shop and payment ----------
// In real-world mode "at the machine" is a GPS radius, because the fix itself is off by metres.
const reachRadius = () => (real.on && real.fix ? arrivalRadius(real.fix.accuracy) : 3.4);
const nearStation = () =>
  mode === 'walk' ? closestStation(player.x, player.z, reachRadius()) : null;
const hoursText = (m) =>
  m.hours[1] - m.hours[0] >= 24 * 60
    ? 'شبانه‌روزی'
    : `${formatClock(m.hours[0])} تا ${formatClock(m.hours[1])}`;
let shopStation = null;

function interact() {
  const station = nearStation();
  if (!station || state.busy || payment.phase !== 'idle' || ended) return;
  if (real.on && (real.fix?.speed ?? 0) > MAX_WALKING_SPEED) {
    say('father', 'داریم سریع حرکت می‌کنیم؛ اول بایستیم، بعد خرید کنیم.');
    return;
  }
  if (!isOpen(station.def, state.minutes)) {
    say(
      guideOut() ? 'robot' : 'father',
      `این دستگاه الان بسته است. ساعت کاری: ${hoursText(station.def)}.`,
      'serious',
    );
    return;
  }
  shopStation = station;
  renderShop();
  document.exitPointerLock?.();
  keys.clear();
  $('#shop').showModal();
  tone(750);
}

function renderShop() {
  const def = shopStation.def;
  $('#shop-category').textContent =
    `${CATEGORIES[def.category].icon} ${CATEGORIES[def.category].label} · ساعت کاری ${hoursText(def)}`;
  $('#shop-name').textContent = `روبات مارکت · ${def.name}`;
  $('#shop-address').textContent = def.address;
  $('#shop-note').textContent = `${def.note} · موجودی شما: ${formatHetoman(state.balance)}`;
  $('#products').replaceChildren(
    ...def.products.map((id) => {
      const p = catalog[id],
        price = priceAt(def, id),
        b = document.createElement('button');
      b.type = 'button';
      const blocker = purchaseBlocker(state, def, id);
      b.disabled = Boolean(blocker);
      b.innerHTML = `<span class="icon">${p.icon}</span><b>${p.name}</b><span class="price">${formatHetoman(price)}</span>${price !== p.cost ? `<s>${formatHetoman(p.cost)}</s>` : ''}<small>${p.type === 'drink' ? 'نوشیدنی' : 'خوراکی'}${blocker === 'funds' ? ' · موجودی کافی نیست' : ''}</small>`;
      b.onclick = () => startPayment(id);
      return b;
    }),
  );
}

function startPayment(productId) {
  if (!beginPayment(state, payment, shopStation.def, productId)) return;
  payment.station = shopStation;
  payment.timer = 0;
  $('#shop').close();
  const p = catalog[productId];
  $('#payment').hidden = false;
  $('#payment-title').textContent =
    `${p.icon} ${p.name} · ${formatHetoman(priceAt(shopStation.def, productId))}`;
  $('#payment-step').textContent = 'در حال نزدیک شدن به کارت‌خوان…';
  $('#swipe').disabled = true;
  $('#cancel-payment').hidden = false;
  say('child', 'بابا، کارت رو بده من بکشم!');
}

function swipe() {
  if (!swipePayment(state, payment)) return;
  payment.timer = 0;
  payment.station.model.card.visible = true;
  $('#swipe').disabled = true;
  $('#cancel-payment').hidden = true;
  $('#payment-step').textContent = 'پرداخت موفق ✓ محصول در حال تحویل است';
  tone(1100, 0.3);
  refreshHUD();
}

function cancel() {
  if (!cancelPayment(state, payment)) return;
  $('#payment').hidden = true;
}

$('#swipe').onclick = swipe;
// On phones the prompt itself is the button: tap it to buy, swipe the card, or get in/out of the car.
$('#prompt').onclick = () => {
  if (payment.phase === 'ready') swipe();
  else if (nearStation()) interact();
  else toggleCar();
};
$('#cancel-payment').onclick = cancel;
$('#shop-close').onclick = () => $('#shop').close();

function updatePayment(dt) {
  if (payment.phase === 'idle') return;
  payment.timer += dt;
  const model = payment.station.model;
  if (payment.phase === 'approaching' && payment.timer > 1) {
    readyPayment(payment);
    $('#swipe').disabled = false;
    $('#payment-step').textContent = 'کارت را بکشید: دکمهٔ «کشیدن کارت» یا کلید C';
  }
  if (payment.phase === 'approved') {
    const t = Math.min(1, payment.timer);
    model.card.position.set(0.95 - t * 0.25, 1.7 - t * 0.1, 0.66);
    if (payment.timer > 1.2) {
      model.card.visible = false;
      $('#payment').hidden = true;
      model.setDelivery(payment.productId);
      deliveryTimer = 2.6;
      payment.delivering = { station: payment.station, record: payment.record };
      Object.assign(payment, createPayment());
    }
  }
}

function updateDelivery(dt) {
  if (deliveryTimer <= 0) return;
  deliveryTimer = Math.max(0, deliveryTimer - dt);
  const { station, record } = payment.delivering,
    model = station.model,
    t = 2.6 - deliveryTimer;
  const slot = record ? catalog[record.productId] : null;
  model.delivery.visible = t < 2.4;
  // Falls from a shelf, waits in the tray, then lifts toward the child's hands.
  const shelf = new THREE.Vector3(
    -0.5 + (record.price % 7) * 0.1,
    1.2 + (record.price % 5) * 0.15,
    0.45,
  );
  if (t < 0.8) model.delivery.position.lerpVectors(shelf, model.slotPoint, t / 0.8);
  else
    model.delivery.position
      .copy(model.slotPoint)
      .add(new THREE.Vector3(0, Math.max(0, t - 1.6) * 0.6, Math.max(0, t - 1.6) * 0.8));
  model.flap.rotation.x = t > 0.7 && t < 2 ? -1 : 0;
  if (deliveryTimer > 0) return;
  model.flap.rotation.x = 0;
  state.busy = false;
  tone(980, 0.18);
  reward(record, slot);
}

function reward(record, product) {
  const awards = awardsFor(state.purchases.slice(0, -1), record),
    rankBefore = rankFor(state.xp).index;
  if (real.on) awards.push({ label: 'خرید در دنیای واقعی', points: 200 });
  const total = awards.reduce((s, a) => s + a.points, 0);
  state.xp += total;
  $('#awards').replaceChildren(
    Object.assign(document.createElement('div'), {
      className: 'total',
      textContent: `+${fa(total)}`,
    }),
    ...awards.map((a, i) => {
      const line = document.createElement('div');
      line.className = 'line';
      line.style.animationDelay = `${i * 0.12}s`;
      line.innerHTML = `${a.label}<b>+${fa(a.points)}</b>`;
      return line;
    }),
  );
  clearTimeout(reward.timeout);
  reward.timeout = setTimeout(() => $('#awards').replaceChildren(), 3200);
  say('child', `${product.icon} ${product.name} گرفتم! مرسی بابا.`);
  const done = completeMissions(state);
  for (const m of done) {
    showBanner('مأموریت انجام شد', m.title, `+${fa(m.xp)} XP · +${formatHetoman(m.hetoman)} پاداش`);
    tone(660, 0.5);
  }
  if (rankFor(state.xp).index > rankBefore)
    setTimeout(
      () => showBanner('ارتقای درجه', rankFor(state.xp).name, 'دستگاه‌های بیشتری پیدا کن'),
      done.length ? 3400 : 0,
    );
  const next = activeMission(state);
  if (next) {
    waypoint = null;
    route = null;
    setTimeout(
      () => say(guideOut() ? 'robot' : 'father', `مأموریت بعدی: ${next.title}`, 'wink'),
      1500,
    );
  }
  refreshHUD();
  checkEnd();
}

function showBanner(tag, title, sub) {
  const b = $('#banner');
  b.innerHTML = `<small>${tag}</small><strong>${title}</strong><span>${sub}</span>`;
  b.hidden = false;
  b.style.animation = 'none';
  void b.offsetWidth;
  b.style.animation = '';
  clearTimeout(showBanner.timeout);
  showBanner.timeout = setTimeout(() => (b.hidden = true), 3200);
}

function checkEnd() {
  const allDone = state.missionsDone.length === MISSIONS.length;
  if (ended || (!allDone && canAffordAnything(state, machines))) return;
  ended = true;
  document.exitPointerLock?.();
  $('#end-tag').textContent = allDone ? 'عملیات موفق' : 'پایان بودجه';
  $('#end-title').textContent = allDone ? 'عملیات مشهد کامل شد!' : 'بودجهٔ امروز تمام شد';
  $('#end-text').textContent = allDone
    ? 'همهٔ مأموریت‌های محدودهٔ بوستان ملت انجام شد. مناطق دیگر مشهد به‌زودی باز می‌شوند.'
    : 'دیگر نمی‌توانید از دستگاه‌ها خرید کنید. امتیاز امروز:';
  const places = new Set(state.purchases.map((p) => p.machineId)).size;
  $('#end-stats').innerHTML = [
    ['امتیاز', `${fa(state.xp)} XP`],
    ['درجه', rankFor(state.xp).name],
    ['خریدها', fa(state.purchases.length)],
    ['مکان‌های کشف‌شده', `${fa(places)} از ${fa(machines.length)}`],
    ['مأموریت‌ها', `${fa(state.missionsDone.length)} از ${fa(MISSIONS.length)}`],
    ['باقی‌مانده', formatHetoman(state.balance)],
  ]
    .map(([k, v]) => `<li><span>${k}</span><b>${v}</b></li>`)
    .join('');
  $('#continue').hidden = !allDone;
  $('#end').showModal();
}

$('#quality').textContent = quality === 'low' ? 'گرافیک: سبک' : 'گرافیک: کامل';
$('#quality').onclick = () => {
  try {
    localStorage.setItem('quality', quality === 'low' ? 'high' : 'low');
  } catch {}
  location.replace(location.pathname);
};
$('#again').onclick = reset;
$('#continue').onclick = () => $('#end').close();
$('#restart').onclick = reset;

// ---------- Objective, route and HUD ----------
const objectiveStation = () => {
  if (waypoint) return stationById(waypoint);
  const mission = activeMission(state);
  if (mission?.target) return stationById(mission.target);
  // Open-ended missions point to the nearest place not bought from yet.
  const visited = new Set(state.purchases.map((p) => p.machineId));
  return (
    activeStations()
      .filter((s) => !visited.has(s.def.id))
      .sort(
        (a, b) =>
          Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z),
      )[0] ?? null
  );
};

// The gold route ribbon on the ground, rebuilt when the route changes.
const routeMaterial = new THREE.MeshBasicMaterial({
  color: '#f2c94c',
  transparent: true,
  opacity: 0.75,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -12,
  polygonOffsetUnits: -24,
});
let routeMesh = null;

function rebuildRouteMesh() {
  if (routeMesh) {
    scene.remove(routeMesh);
    routeMesh.geometry.dispose();
    routeMesh = null;
  }
  if (!route) return;
  const pts = [],
    pos = [],
    idx = [];
  let total = 0;
  for (const p of route.points) {
    if (pts.length) total += Math.hypot(p.x - pts.at(-1).x, p.z - pts.at(-1).z);
    if (total > 700) break;
    pts.push(p);
  }
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)],
      b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b.x - a.x,
      dz = b.z - a.z,
      len = Math.hypot(dx, dz) || 1,
      w = mode === 'drive' ? 1.1 : 0.55;
    pos.push(
      pts[i].x - (dz / len) * w,
      0.14,
      pts[i].z + (dx / len) * w,
      pts[i].x + (dz / len) * w,
      0.14,
      pts[i].z - (dx / len) * w,
    );
    if (i) idx.push((i - 1) * 2, i * 2, (i - 1) * 2 + 1, (i - 1) * 2 + 1, i * 2, i * 2 + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  routeMesh = new THREE.Mesh(g, routeMaterial);
  scene.add(routeMesh);
}

let routeTarget = null,
  routeFrom = { x: 0, z: 0 },
  routeMode = null;

function updateRoute(dt) {
  routeTimer -= dt;
  const target = objectiveStation();
  if (!target) {
    if (route) {
      route = null;
      rebuildRouteMesh();
    }
    return;
  }
  const pos = mode === 'drive' ? car : player;
  const changed = target !== routeTarget || routeMode !== mode || !route;
  if (!changed && (routeTimer > 0 || Math.hypot(pos.x - routeFrom.x, pos.z - routeFrom.z) < 10))
    return;
  routeTimer = 1.2;
  routeTarget = target;
  routeMode = mode;
  routeFrom = { x: pos.x, z: pos.z };
  // Close targets are reached directly; the street network would detour out of buildings.
  const direct = Math.hypot(target.front.x - pos.x, target.front.z - pos.z);
  route =
    direct < 60
      ? {
          points: [
            { x: pos.x, z: pos.z },
            { x: target.front.x, z: target.front.z },
          ],
          length: direct,
        }
      : routeBetween(
          mode === 'drive' ? driveGraph : walkGraph,
          pos.x,
          pos.z,
          target.front.x,
          target.front.z,
        );
  rebuildRouteMesh();
}

const compass = $('#compass').getContext('2d'),
  minimap = $('#minimap').getContext('2d');

function drawCompass(headingDeg, markers) {
  const w = 560,
    h = 44;
  compass.clearRect(0, 0, w, h);
  compass.fillStyle = 'rgba(10,16,14,.45)';
  compass.fillRect(0, 10, w, 24);
  compass.textAlign = 'center';
  compass.textBaseline = 'middle';
  const labels = { 0: 'شمال', 90: 'شرق', 180: 'جنوب', 270: 'غرب' };
  for (let d = -100; d <= 100; d += 5) {
    const deg = (((Math.round(headingDeg / 5) * 5 + d) % 360) + 360) % 360,
      x = w / 2 + ((deg - headingDeg + 540) % 360) * 2.6 - 180 * 2.6;
    if (x < 10 || x > w - 10) continue;
    compass.fillStyle = 'rgba(236,242,238,.8)';
    if (labels[deg] !== undefined) {
      compass.font = 'bold 13px Vazirmatn, sans-serif';
      compass.fillStyle = deg === 0 ? '#f2c94c' : '#ecf2ee';
      compass.fillText(labels[deg], x, 22);
    } else if (deg % 15 === 0) {
      compass.font = '10px Vazirmatn, sans-serif';
      compass.fillText(fa(deg), x, 22);
    } else compass.fillRect(x - 0.5, 18, 1, 8);
  }
  for (const m of markers) {
    const x = w / 2 + (((m.bearing - headingDeg + 540) % 360) - 180) * 2.6;
    if (x < 10 || x > w - 10) continue;
    compass.save();
    compass.translate(x, 6);
    compass.rotate(Math.PI / 4);
    compass.fillStyle = m.color;
    compass.fillRect(-4, -4, 8, 8);
    compass.restore();
  }
  compass.fillStyle = '#ecf2ee';
  compass.fillRect(w / 2 - 1, 34, 2, 8);
  compass.font = 'bold 11px Vazirmatn, sans-serif';
  compass.fillText(fa(Math.round(headingDeg) % 360), w / 2, 6);
}

function refreshHUD() {
  $('#balance').textContent = fa(state.balance);
  const rank = rankFor(state.xp);
  $('#rank-name').textContent = rank.name;
  $('#xp').textContent = rank.next ? `${fa(state.xp)} / ${fa(rank.next)} XP` : `${fa(state.xp)} XP`;
  $('#xp-bar').style.width = `${Math.round(rank.progress * 100)}%`;
  const active = activeMission(state);
  $('#mission-list').innerHTML = MISSIONS.map((m) => {
    const done = state.missionsDone.includes(m.id);
    return `<li class="${done ? 'done' : m === active ? 'active' : ''}">${m.title}</li>`;
  }).join('');
  $('#mode-label').textContent = mode === 'drive' ? 'در ماشین · F برای پیاده شدن' : 'پیاده';
  $('#speed-stat').hidden = mode !== 'drive';
}

function updatePrompt() {
  let html = '';
  const station = nearStation();
  // The payment panel carries its own swipe button, so no prompt while paying or collecting.
  if (state.busy || payment.phase !== 'idle') html = '';
  else if (station)
    html = isOpen(station.def, state.minutes)
      ? `<kbd>E</kbd>خرید از روبات مارکت · ${station.def.name}`
      : `دستگاه بسته است · ${hoursText(station.def)}`;
  else if (mode === 'walk' && Math.hypot(car.x - player.x, car.z - player.z) < 4.5)
    html = '<kbd>F</kbd>سوار ماشین شو';
  else if (
    mode === 'drive' &&
    Math.abs(car.speed) < 1 &&
    stations.some((s) => Math.hypot(s.front.x - car.x, s.front.z - car.z) < 25)
  )
    html = '<kbd>F</kbd>پیاده شو؛ دستگاه نزدیک است';
  $('#prompt').hidden = !html;
  if ($('#prompt').innerHTML !== html) $('#prompt').innerHTML = html;
}

// ---------- Map dialog ----------
const mapView = { cx: 0, cz: 0, mpp: 2 },
  mapCanvas = $('#fullmap'),
  iranCanvas = $('#iran-map');
let selected = null,
  mapTab = 'city';
const markers = () => {
  const visited = new Set(state.purchases.map((p) => p.machineId)),
    objective = objectiveStation();
  return activeStations().map((s) => ({
    id: s.def.id,
    x: s.x,
    z: s.z,
    visited: visited.has(s.def.id),
    open: isOpen(s.def, state.minutes),
    objective: s === objective,
  }));
};

function sizeCanvas(c) {
  const r = c.getBoundingClientRect(),
    dpr = Math.min(devicePixelRatio, 2);
  c.width = Math.max(1, r.width * dpr);
  c.height = Math.max(1, r.height * dpr);
  return dpr;
}

function renderMap() {
  if (!$('#map-dialog').open) return;
  if (mapTab === 'city') {
    const dpr = sizeCanvas(mapCanvas);
    const pos = mode === 'drive' ? car : player;
    drawFullMap(mapCanvas.getContext('2d'), mapAssets, mapView, {
      dpr,
      markers: markers(),
      route: route?.points,
      selected,
      player: { x: pos.x, z: pos.z, heading: mode === 'drive' ? car.heading : player.heading },
    });
  } else {
    const dpr = sizeCanvas(iranCanvas),
      c = iranCanvas.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawIran(c, iran, {
      width: iranCanvas.width / dpr,
      height: iranCanvas.height / dpr,
      t: elapsed,
      cities: CITIES,
    });
  }
}

function renderMachineList() {
  const pos = mode === 'drive' ? car : player,
    visited = new Set(state.purchases.map((p) => p.machineId));
  const items = activeStations().map((s) => {
    const li = document.createElement('li'),
      b = document.createElement('button'),
      open = isOpen(s.def, state.minutes);
    b.type = 'button';
    b.className = s.def.id === selected ? 'selected' : '';
    b.innerHTML = `<span>${CATEGORIES[s.def.category].icon}</span><span>${s.def.name}${visited.has(s.def.id) ? ' ✓' : ''}<span class="meta">${CATEGORIES[s.def.category].label} · ${open ? 'باز' : 'بسته'}</span></span><span class="dist">${formatDistance(Math.hypot(s.x - pos.x, s.z - pos.z))}</span>`;
    b.onclick = () => selectMachine(s.def.id, true);
    li.append(b);
    return li;
  });
  for (const place of lockedPlaces) {
    const li = document.createElement('li');
    li.innerHTML = `<button type="button" class="locked" disabled><span>🔒</span><span>${place.name}<span class="meta">${place.note}</span></span><span></span></button>`;
    items.push(li);
  }
  $('#machine-list').replaceChildren(...items);
}

function selectMachine(id, center = false) {
  selected = id;
  const s = stationById(id),
    def = s.def;
  if (center) {
    mapView.cx = s.x;
    mapView.cz = s.z;
    mapView.mpp = Math.min(mapView.mpp, 1.4);
  }
  $('#machine-detail').hidden = false;
  $('#detail-name').textContent = `${CATEGORIES[def.category].icon} ${def.name}`;
  $('#detail-address').textContent = `📍 ${def.address}`;
  $('#detail-meta').textContent =
    `🕒 ${hoursText(def)} · ${isOpen(def, state.minutes) ? 'الان باز است' : 'الان بسته است'} · ${def.note}`;
  $('#detail-products').textContent = def.products
    .map((id) => `${catalog[id].icon} ${catalog[id].name} ${fa(priceAt(def, id))}`)
    .join(' · ');
  $('#route-button').textContent = waypoint === id ? 'مسیر فعال است ✓' : 'مسیریابی تا اینجا';
  renderMachineList();
  renderMap();
}

$('#route-button').onclick = () => {
  if (!selected) return;
  waypoint = selected;
  route = null;
  routeTimer = 0;
  updateRoute(0);
  const s = stationById(selected);
  say(
    'father',
    `مسیر تا ${s.def.name} رو گذاشتم؛ ${route ? formatDistance(route.length) : ''}. دنبال خط طلایی بریم.`,
  );
  selectMachine(selected);
};

function openMap() {
  if (anyDialogOpen()) return;
  document.exitPointerLock?.();
  keys.clear();
  const pos = mode === 'drive' ? car : player;
  Object.assign(mapView, { cx: pos.x, cz: pos.z, mpp: 2.2 });
  $('#map-dialog').showModal();
  selected ??= objectiveStation()?.def.id ?? null;
  if (selected) selectMachine(selected);
  renderMachineList();
  renderMap();
}

$('#minimap-button').onclick = openMap;
$('#map-close').onclick = () => $('#map-dialog').close();
for (const tab of document.querySelectorAll('.tabs button'))
  tab.onclick = () => {
    mapTab = tab.dataset.tab;
    document
      .querySelectorAll('.tabs button')
      .forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
    mapCanvas.hidden = mapTab !== 'city';
    iranCanvas.hidden = mapTab !== 'iran';
    renderMap();
  };
let mapDrag = null;
mapCanvas.addEventListener('pointerdown', (e) => {
  mapDrag = { x: e.clientX, y: e.clientY, moved: 0 };
  mapCanvas.setPointerCapture(e.pointerId);
});
mapCanvas.addEventListener('pointermove', (e) => {
  if (!mapDrag) return;
  mapView.cx -= (e.clientX - mapDrag.x) * mapView.mpp;
  mapView.cz -= (e.clientY - mapDrag.y) * mapView.mpp;
  mapDrag.moved += Math.abs(e.clientX - mapDrag.x) + Math.abs(e.clientY - mapDrag.y);
  mapDrag.x = e.clientX;
  mapDrag.y = e.clientY;
  renderMap();
});
mapCanvas.addEventListener('pointerup', (e) => {
  if (mapDrag && mapDrag.moved < 6) {
    const r = mapCanvas.getBoundingClientRect();
    const wx = mapView.cx + (e.clientX - r.left - r.width / 2) * mapView.mpp,
      wz = mapView.cz + (e.clientY - r.top - r.height / 2) * mapView.mpp;
    const hit = activeStations().find((s) => Math.hypot(s.x - wx, s.z - wz) < 14 * mapView.mpp);
    if (hit) selectMachine(hit.def.id);
  }
  mapDrag = null;
});
mapCanvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    mapView.mpp = THREE.MathUtils.clamp(mapView.mpp * (e.deltaY > 0 ? 1.15 : 1 / 1.15), 0.35, 30);
    renderMap();
  },
  { passive: false },
);

// ---------- Briefing ----------
const CITIES = [
  { name: 'مشهد', lat: 36.3, lon: 59.6, active: true },
  { name: 'تهران', lat: 35.69, lon: 51.39 },
  { name: 'اصفهان', lat: 32.65, lon: 51.67 },
  { name: 'شیراز', lat: 29.59, lon: 52.58 },
  { name: 'تبریز', lat: 38.08, lon: 46.29 },
  { name: 'اهواز', lat: 31.32, lon: 48.67 },
  { name: 'کرمان', lat: 30.28, lon: 57.08 },
  { name: 'رشت', lat: 37.28, lon: 49.58 },
  { name: 'یزد', lat: 31.9, lon: 54.37 },
  { name: 'زاهدان', lat: 29.5, lon: 60.86 },
  { name: 'کرمانشاه', lat: 34.31, lon: 47.07 },
  { name: 'بندرعباس', lat: 27.18, lon: 56.27 },
];
const BRIEF = [
  `نقطهٔ شروع: ${FACTORY.name}، بزرگراه مشهد–چناران`,
  'تیم: پدر و فرزند · روبات راهنما در دستگاه‌ها منتظر شماست',
  'هدف: از کارخانه تا بوستان ملت و دانشگاه فردوسی (حدود ۲۰ کیلومتر) بروید و دستگاه‌های روبات مارکت را در پارک، مدرسه، دانشگاه، ایستگاه مترو و مرکز خرید پیدا کنید.',
  'هر خرید امتیاز دارد؛ کشف مکان تازه و ترکیب نوشیدنی و خوراکی امتیاز بیشتری دارد.',
  'بودجه: ۵۰۰ هتومان · مأموریت‌ها پاداش نقدی دارند.',
  'رفت‌وآمد: پیاده یا با ماشین. نقشهٔ گوشهٔ صفحه را بزنید تا آدرس دستگاه‌ها را ببینید.',
].join('\n');
let briefChars = 0;

function startMission() {
  $('#briefing').hidden = true;
  $('#hud').hidden = false;
  say('child', 'بابا، اینجا همون کارخونه‌ایه که دستگاه‌های روبات مارکت رو می‌سازه؟');
  say('father', 'آره! سالن تولید اون‌وره؛ دستگاه وندینگ هم توی دفتر فنی مهندسیه. بریم ببینیم!');
  say('child', 'اون وانت سفیده کیه داره میاد تو؟');
  say('father', 'آقای محمدیه، مدیر شرکت. بعداً بریم اتاقش سلام کنیم.');
  if (!isTouch && !real.on) canvas.requestPointerLock?.()?.catch?.(() => {});
}

$('#start-mission').onclick = startMission;

// ---------- Real-world (GPS) mode ----------
// The family mirrors the phone's position on the real map of Mashhad. Walking to a real place where
// a machine stands lets the player buy there, with a bonus.
const real = {
  on: false,
  fix: null,
  heading: null,
  error: null,
  waiting: null,
  stop: null,
  stabilizer: createStabilizer(),
};

function setRealMode(on) {
  if (on === real.on) return;
  real.stop?.();
  Object.assign(real, { on, fix: null, heading: null, error: null, waiting: null, stop: null });
  for (const s of stations) if (s.def.test) s.model.group.visible = on;
  $('#gps-toggle').classList.toggle('on', on);
  $('#gps-status').hidden = !on;
  $('#ar-toggle').hidden = $('#stable-toggle').hidden = !on;
  // Real-world mode is first person: the player is where the phone is and sees what it faces.
  document.body.classList.toggle('real', on);
  if (!on) {
    setArMode(false);
    arView.stopSensors();
    return;
  }
  arView.startSensors();
  cam.arPitch = 0;
  cam.yaw = Math.atan2(-Math.cos(player.heading), Math.sin(player.heading));
  if (mode === 'drive') toggleCar();
  mode = 'walk';
  real.stop = startTracking({
    onFix: (fix) => {
      real.fix = fix;
      real.error = null;
    },
    onHeading: (heading) => (real.heading = heading),
    onError: (message) => (real.error = message),
    onStatus: (message) => (real.waiting = message),
    stabilizer: (real.stabilizer = createStabilizer()),
  });
  real.stabilizer.stable = stableMode;
  say(
    'father',
    'حالت دنیای واقعی روشن شد؛ از چشم خودمون می‌بینیم و هر جا راه بریم، توی بازی هم همون‌جاییم.',
  );
  setArMode(true);
}

// ---------- First-person real-world view ----------
// The view stands at the GPS position at eye height and turns with the phone. With the camera
// picture on (AR) the city model is hidden and only the machines, their reach circles, the route
// and the robot are drawn over the real street; with it off, the 3D city is shown first person.
const arView = createArView($('#camera'));
let arMode = false,
  stableMode = true;
const hiddenInAr = () => [
  sky,
  city.group,
  imagery.group,
  factory.group,
  traffic.group,
  carModel.group,
  parkGate,
];

async function setArMode(on) {
  if (on && !arMode) {
    const problem = await arView.start();
    if (problem) {
      say('father', `${problem} فعلاً شهر سه‌بعدی رو از چشم خودمون می‌بینیم.`);
      return;
    }
    if (!real.on) {
      arView.stop();
      return;
    }
    say(
      'robot',
      'دوربین روشن شد! گوشی رو صاف جلوی خودت بگیر؛ ستون نورانی طلایی جای دستگاهه.',
      'excited',
    );
    setTimeout(() => {
      if (real.on && !arView.hasOrientation)
        say('father', 'حسگر جهت گوشی جواب نمی‌ده؛ برای چرخیدن، صفحه رو با انگشت بکش.');
    }, 3000);
  } else if (!on && arMode) arView.stop();
  else return;
  arMode = on;
  for (const object of hiddenInAr()) object.visible = !on;
  scene.fog = on ? null : fog;
  document.body.classList.toggle('ar', on);
  $('#ar-toggle').classList.toggle('on', on);
}

$('#ar-toggle').onclick = () => setArMode(!arMode);
$('#stable-toggle').onclick = () => {
  stableMode = !stableMode;
  real.stabilizer.stable = stableMode;
  $('#stable-toggle').classList.toggle('on', stableMode);
  $('#stable-toggle').textContent = stableMode ? '🎯 پایدار: روشن' : '🎯 پایدار: خاموش';
};

// The safety notice comes first; permissions are requested from the tap on its button (iOS needs that).
function askRealMode(thenStart) {
  if (real.on) {
    setRealMode(false);
    return;
  }
  $('#real-intro').showModal();
  $('#real-go').onclick = async () => {
    $('#real-intro').close();
    await requestCompass();
    setRealMode(true);
    if (thenStart) startMission();
  };
}

$('#real-mode').onclick = () => askRealMode(true);
$('#gps-toggle').onclick = () => askRealMode(false);
$('#real-cancel').onclick = () => $('#real-intro').close();

function updateReal(dt) {
  const status = $('#gps-status');
  if (real.error) status.textContent = `⚠ ${real.error}`;
  else if (!real.fix) status.textContent = `📍 ${real.waiting ?? 'در حال یافتن موقعیت…'}`;
  else if (!insideWorld(data.bounds, real.fix.x, real.fix.z)) {
    const nearest = Math.min(
      ...activeStations().map((s) => Math.hypot(s.x - real.fix.x, s.z - real.fix.z)),
    );
    status.textContent = `📍 خارج از محدودهٔ بازی · ${formatDistance(nearest)} تا نزدیک‌ترین دستگاه`;
  } else
    status.textContent = `📍 GPS ±${fa(Math.round(real.fix.accuracy))} متر${real.fix.speed > MAX_WALKING_SPEED ? ' · حرکت سریع' : ''}`;
  if (!real.fix || !insideWorld(data.bounds, real.fix.x, real.fix.z)) {
    player.speed = 0;
    return;
  }
  // Walk the avatar towards the (building-free) GPS point instead of teleporting it.
  const target = resolveCircle(collision, real.fix.x, real.fix.z, 1);
  const dx = target.x - player.x,
    dz = target.z - player.z,
    d = Math.hypot(dx, dz);
  if (d > 150) Object.assign(player, { x: target.x, z: target.z });
  const speed = d > 0.5 ? Math.min(8, Math.max(1.2, d * 1.5)) : 0;
  player.speed += (speed - player.speed) * Math.min(1, dt * 6);
  if (d > 0.5) {
    const step = Math.min(d, player.speed * dt);
    player.x += (dx / d) * step;
    player.z += (dz / d) * step;
  }
  const want = real.heading ?? (d > 0.5 ? Math.atan2(-dz, dx) : player.heading);
  // Stable mode also calms the compass, which jitters near cars and metal.
  player.heading +=
    Math.atan2(Math.sin(want - player.heading), Math.cos(want - player.heading)) *
    Math.min(1, dt * (stableMode ? 2 : 5));
  player.gait += dt * player.speed * 1.9;
}

// ---------- Loop ----------
const camPos = new THREE.Vector3(),
  camTarget = new THREE.Vector3(),
  lookAt = new THREE.Vector3();
let elapsed = 0,
  last = performance.now(),
  hudTimer = 0,
  streetTimer = 0;
// Debug runs (headless checks render ~1 fps) may simulate a whole second per frame, still in substeps.
const MAX_FRAME = new URLSearchParams(location.search).has('debug') ? 1 : 0.25;

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderMap();
}

window.addEventListener('resize', resize);

function updateWalk(dt) {
  const forward = { x: -Math.sin(cam.yaw), z: -Math.cos(cam.yaw) },
    right = { x: Math.cos(cam.yaw), z: -Math.sin(cam.yaw) };
  const iy = axis(['w', 'arrowup'], ['s', 'arrowdown']) + stick.y,
    ix = axis(['d', 'arrowright'], ['a', 'arrowleft']) + stick.x;
  const frozen = state.busy || payment.phase !== 'idle';
  let dx = forward.x * iy + right.x * ix,
    dz = forward.z * iy + right.z * ix;
  const len = Math.hypot(dx, dz);
  const run = keys.has('shift');
  const target = frozen || len < 0.1 ? 0 : (run ? 6.5 : 3.4) * Math.min(1, len);
  player.speed += (target - player.speed) * Math.min(1, dt * 8);
  if (len > 0.1 && !frozen) {
    dx /= len;
    dz /= len;
    const want = Math.atan2(-dz, dx);
    player.heading +=
      Math.atan2(Math.sin(want - player.heading), Math.cos(want - player.heading)) *
      Math.min(1, dt * 9);
  }
  // Face the machine while buying.
  const station = payment.station ?? payment.delivering?.station;
  if (frozen && station) {
    const want = Math.atan2(-(station.z - player.z), station.x - player.x);
    player.heading +=
      Math.atan2(Math.sin(want - player.heading), Math.cos(want - player.heading)) *
      Math.min(1, dt * 6);
  }
  const mx = Math.cos(player.heading) * player.speed * dt,
    mz = -Math.sin(player.heading) * player.speed * dt;
  const p = resolveCircle(collision, player.x + mx, player.z + mz, 1);
  const { minX, minZ, maxX, maxZ } = data.bounds;
  player.x = THREE.MathUtils.clamp(p.x, minX + 15, maxX - 15);
  player.z = THREE.MathUtils.clamp(p.z, minZ + 15, maxZ - 15);
  player.gait += dt * player.speed * 1.9;
}

// Collision log for ?debug runs; trimmed so it never grows without bound.
const debugHits = [];

function updateDrive(dt) {
  if (debugHits.length > 200) debugHits.splice(0, 100);
  const throttle = THREE.MathUtils.clamp(
    axis(['w', 'arrowup'], ['s', 'arrowdown']) + stick.y,
    -1,
    1,
  );
  const steer = THREE.MathUtils.clamp(
    axis(['d', 'arrowright'], ['a', 'arrowleft']) + stick.x,
    -1,
    1,
  );
  // At top speed the car covers almost 2 m per step, so move it in short slices that can't
  // tunnel through a thin wall or fence.
  const slices = Math.max(1, Math.ceil((Math.abs(car.speed) * dt) / 0.6));
  for (let i = 0; i < slices; i++) {
    stepCar(car, { throttle, steer, handbrake: keys.has(' ') }, dt / slices);
    // Two collision circles along the body keep the nose and tail out of buildings.
    for (const along of [1.3, -1.3]) {
      const cx = car.x + Math.cos(car.heading) * along,
        cz = car.z - Math.sin(car.heading) * along;
      const p = resolveCircle(collision, cx, cz, 1.05);
      if (p.hit) {
        debugHits.push({
          kind: 'building',
          x: Math.round(cx),
          z: Math.round(cz),
          v: +car.speed.toFixed(1),
        });
        car.x += p.x - cx;
        car.z += p.z - cz;
        if (Math.abs(car.speed) > 4) tone(90, 0.2, 0.08, 'square');
        car.speed *= 0.35;
      }
    }
  }
  // Bumping a traffic car slows you down but never throws you backwards. If you stay pressed
  // against one, it pulls away (respawns out of sight) so you can never get stuck behind it.
  for (const npc of traffic.cars) {
    const dx = car.x - npc.x,
      dz = car.z - npc.z,
      d = Math.hypot(dx, dz);
    if (d >= 3.4 || d === 0) {
      if (npc.contact) npc.contact = 0;
      continue;
    }
    debugHits.push({
      kind: 'traffic',
      x: Math.round(car.x),
      z: Math.round(car.z),
      v: +car.speed.toFixed(1),
      npcDir: npc.dir,
    });
    car.x = npc.x + (dx / d) * 3.4;
    car.z = npc.z + (dz / d) * 3.4;
    const towards =
      (Math.cos(car.heading) * -dx - Math.sin(car.heading) * -dz) * Math.sign(car.speed) > 0;
    if (towards && Math.abs(car.speed) > 4) tone(110, 0.25, 0.08, 'square');
    if (towards) car.speed *= 0.4;
    npc.contact = (npc.contact ?? 0) + dt;
    if (npc.contact > 0.8) {
      npc.contact = 0;
      traffic.remove(npc);
    }
  }
  const { minX, minZ, maxX, maxZ } = data.bounds;
  car.x = THREE.MathUtils.clamp(car.x, minX + 15, maxX - 15);
  car.z = THREE.MathUtils.clamp(car.z, minZ + 15, maxZ - 15);
  Object.assign(player, { x: car.x, z: car.z, heading: car.heading });
  // Chase camera swings back behind the car when the mouse is idle.
  if (elapsed - cam.lastMouse > 1.4 && Math.abs(car.speed) > 1) {
    const want =
      Math.atan2(-Math.cos(car.heading), Math.sin(car.heading)) + (car.speed < 0 ? Math.PI : 0);
    cam.yaw +=
      Math.atan2(Math.sin(want - cam.yaw), Math.cos(want - cam.yaw)) * Math.min(1, dt * 2.2);
    cam.pitch += (0.28 - cam.pitch) * Math.min(1, dt * 1.5);
  }
  if (engine && soundOn) {
    engine.o.frequency.setTargetAtTime(
      45 + Math.abs(car.speed) * 5 + Math.max(0, throttle) * 15,
      audio.currentTime,
      0.1,
    );
    engine.g.gain.setTargetAtTime(0.025, audio.currentTime, 0.2);
  }
}

function updateCamera(dt) {
  const station = payment.station;
  if (station && payment.phase !== 'idle') {
    // Close-up of the card reader during payment.
    const reader = station.model.readerPoint.clone();
    station.model.group.localToWorld(reader);
    const side = rotateLocal(1.2, 1.9, station.rot);
    camTarget.set(reader.x + side.x, reader.y + 0.4, reader.z + side.z);
    lookAt.lerp(reader, 1 - Math.exp(-dt * 6));
  } else {
    const driving = mode === 'drive',
      height = driving ? 1.6 : 1.75;
    const focus = new THREE.Vector3(player.x, height, player.z);
    // Over-the-shoulder offset to the right, like a third-person shooter.
    const shoulder = driving ? 0 : 0.75;
    focus.x += Math.cos(cam.yaw) * shoulder;
    focus.z += -Math.sin(cam.yaw) * shoulder;
    let distance = cam.distance;
    const ox = Math.sin(cam.yaw) * Math.cos(cam.pitch),
      oz = Math.cos(cam.yaw) * Math.cos(cam.pitch);
    const free = clearFraction(
      collision,
      focus.x,
      focus.z,
      focus.x + ox * distance,
      focus.z + oz * distance,
      0.8,
    );
    if (cam.pitch < 0.9) distance = Math.max(1.6, distance * free - 0.7);
    camTarget.set(
      focus.x + ox * distance,
      Math.max(0.6, focus.y + Math.sin(cam.pitch) * distance),
      focus.z + oz * distance,
    );
    lookAt.lerp(focus, 1 - Math.exp(-dt * 14));
  }
  camPos.lerp(camTarget, 1 - Math.exp(-dt * 12));
  camera.position.copy(camPos);
  camera.lookAt(lookAt);
}

function updateHUD(dt) {
  const pos = mode === 'drive' ? car : player;
  $('#clock').textContent = formatClock(state.minutes);
  if (mode === 'drive') $('#speed').textContent = fa(kmh(car));
  // Where the camera actually looks: the orbit camera, or the phone itself in AR view.
  const look3 = camera.getWorldDirection(new THREE.Vector3()),
    flat = Math.hypot(look3.x, look3.z);
  const forward =
    flat > 0.05
      ? { x: look3.x / flat, z: look3.z / flat }
      : { x: -Math.sin(cam.yaw), z: -Math.cos(cam.yaw) };
  const headingDeg = bearing(forward.x, forward.z);
  const objective = objectiveStation();
  drawCompass(
    headingDeg,
    objective
      ? [{ bearing: bearing(objective.x - pos.x, objective.z - pos.z), color: '#f2c94c' }]
      : [],
  );
  drawMinimap(minimap, mapAssets, {
    size: 220,
    x: pos.x,
    z: pos.z,
    heading: mode === 'drive' ? car.heading : player.heading,
    camForward: forward,
    radius: mode === 'drive' ? 650 : 200,
    markers: markers(),
    route: route?.points,
  });
  // Objective marker above the machine, clamped to the screen edge when off-screen.
  const wp = $('#waypoint');
  wp.hidden = !objective;
  if (objective) {
    const d = Math.hypot(objective.x - pos.x, objective.z - pos.z),
      p = new THREE.Vector3(objective.x, 3.4, objective.z).project(camera);
    let sx = (p.x * 0.5 + 0.5) * innerWidth,
      sy = (-p.y * 0.5 + 0.5) * innerHeight;
    if (p.z > 1) {
      sx = innerWidth - sx;
      sy = innerHeight - 60;
    }
    $('#waypoint').style.left = `${THREE.MathUtils.clamp(sx, 60, innerWidth - 60)}px`;
    $('#waypoint').style.top = `${THREE.MathUtils.clamp(sy, 90, innerHeight - 130)}px`;
    $('#waypoint-name').textContent = objective.def.name;
    $('#waypoint-distance').textContent = formatDistance(d);
    wp.hidden = d < 6;
    for (const s of stations) {
      const isObjective = s === objective;
      s.model.beacon.material.color.set(isObjective ? '#f2c94c' : '#3ee0c9');
      s.model.beacon.material.opacity =
        (isObjective ? 0.32 : 0.14) * Math.min(1, Math.hypot(s.x - pos.x, s.z - pos.z) / 40);
    }
  }
  streetTimer -= dt;
  if (streetTimer <= 0) {
    streetTimer = 0.6;
    const street = nearestSegment(segments, pos.x, pos.z, 35, (s) => s[5] >= 0);
    const inFactory = Math.hypot(pos.x - FACTORY.center.x, pos.z - FACTORY.center.z) < 130;
    $('#street').textContent = inFactory
      ? `کارخانهٔ ${FACTORY.name}`
      : street
        ? `مشهد · ${data.names[street.name]}`
        : 'حومهٔ مشهد';
  }
  updatePrompt();
}

let hints = { closed: false, car: false };

// People in the factory say their lines once, when the family walks up to them.
function updateTalks() {
  if (mode !== 'walk' || real.on || lines.length > 2) return;
  for (const t of factory.talks) {
    if (t.done || (t.ready && !t.ready())) continue;
    const p = t.pos();
    if (Math.hypot(p.x - player.x, p.z - player.z) > t.radius) continue;
    t.done = true;
    for (const text of t.lines) say(t.speaker, text);
    return;
  }
}

// ---------- Robot guide ----------
// When the family walks up to a machine the robot pops out of it, greets them and explains what to
// do; when they leave it goes back inside. It is never a walking companion.
const guideState = { station: null, t: 0, greeted: new Set(), arrived: 0 };
const guideOut = () => guideState.t >= 1;
const easeOutBack = (t) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;

function greet(station) {
  const def = station.def,
    first = !guideState.greeted.has(def.id);
  guideState.greeted.add(def.id);
  if (def.id === 'factory' && first) {
    say(
      'robot',
      'سلام! من روبات راهنمای روبات مارکتم؛ تو دستگاه دفتر فنی زندگی می‌کنم!',
      'excited',
    );
    say(
      'robot',
      `به ${FACTORY.name} خوش اومدین. بچه‌های همین دفتر نرم‌افزار دستگاه‌ها رو می‌نویسن.`,
      'happy',
    );
    say('robot', 'اول از همین دستگاه یه چیزی بخرین؛ کلید E رو بزنین.', 'wink');
    say(
      'robot',
      'ماشینتون جلوی همین ساختمونه. با F سوار شین و برین بوستان ملت؛ من توی همهٔ دستگاه‌ها منتظرتونم!',
      'love',
    );
    return;
  }
  if (!isOpen(def, state.minutes)) {
    say(
      'robot',
      `سلام! متأسفم، این دستگاه الان بسته است. ساعت کاری: ${hoursText(def)}.`,
      'serious',
    );
    return;
  }
  if (first) {
    say('robot', `سلام دوباره! به دستگاه ${def.name} خوش اومدین.`, 'excited');
    say('robot', `${def.note}. برای خرید E رو بزنین.`, 'happy');
  } else say('robot', 'باز هم خوش اومدین! برای خرید E رو بزنین.', 'wink');
}

function updateGuide(dt) {
  const near =
    mode === 'walk' ? closestStation(player.x, player.z, Math.max(9, reachRadius())) : null;
  // The robot only moves to another machine after it has gone back into the previous one.
  if (near && !guideState.station) guideState.station = near;
  const s = guideState.station,
    wasOut = guideOut();
  if (!s) return;
  guideState.t = THREE.MathUtils.clamp(guideState.t + (near === s ? dt : -dt) / 1.1, 0, 1);
  if (guideOut() && !wasOut) {
    guideState.arrived = elapsed;
    greet(s);
    tone(990, 0.15);
    tone(1320, 0.2);
  }
  if (wasOut && near !== s) say('robot', 'خداحافظ! مسیر طلایی رو دنبال کنین.', 'happy');
  if (!guideState.t) {
    guideState.station = null;
    guide.group.visible = false;
    return;
  }
  // From inside the machine front out to its left side (the card reader is on the right).
  const e = easeOutBack(guideState.t),
    from = { x: -0.2, y: 0.9, z: 0.2 },
    to = { x: -1.7, y: 0, z: 1.3 };
  const local = rotateLocal(from.x + (to.x - from.x) * e, from.z + (to.z - from.z) * e, s.rot);
  guide.group.visible = true;
  guide.group.position.set(s.x + local.x, from.y + (to.y - from.y) * e, s.z + local.z);
  guide.group.scale.setScalar(0.15 + 0.85 * Math.min(1, e));
  // Face the family (the rig looks along its local +X).
  guide.group.rotation.y = Math.atan2(
    -(player.z - guide.group.position.z),
    player.x - guide.group.position.x,
  );
  if (!state.busy && payment.phase === 'idle') s.model.flap.rotation.x = guideState.t < 1 ? -1 : 0;
  guide.update({
    dt,
    time: elapsed,
    gait: 0,
    moving: false,
    talking,
    wave: elapsed - guideState.arrived < 2.5 || !guideOut(),
    point: talking && guideOut(),
  });
}

function updateHints() {
  const target = objectiveStation();
  if (target && !isOpen(target.def, state.minutes) && !hints.closed) {
    hints.closed = true;
    say(
      'robot',
      `${target.def.name} الان بسته است (${hoursText(target.def)}). از نقشه مقصد دیگری انتخاب کن.`,
    );
  }
  if (route && route.length > 900 && mode === 'walk' && !hints.car) {
    hints.car = true;
    say('father', 'راه طولانیه؛ بهتره با ماشین بریم.');
  }
}

function frame() {
  const now = performance.now();
  requestAnimationFrame(frame);
  // The first rAF timestamp can predate `last`, so never let time run backwards. Long frames are
  // simulated in short substeps, so slow devices keep real-time speed without unstable physics.
  const dt = THREE.MathUtils.clamp((now - last) / 1000, 0, MAX_FRAME);
  last = now;
  elapsed += dt;
  const playing = $('#briefing').hidden;
  const paused =
    !playing || $('#shop').open || $('#map-dialog').open || $('#end').open || document.hidden;
  const steps = Math.max(1, Math.ceil(dt / (1 / 30))),
    step = dt / steps;
  if (!playing) {
    // Briefing: animate Iran, type the orders, slowly orbit the start point behind the overlay.
    const ic = $('#iran'),
      dpr = sizeCanvas(ic),
      c = ic.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawIran(c, iran, {
      width: ic.width / dpr,
      height: ic.height / dpr,
      t: elapsed,
      cities: CITIES,
    });
    briefChars = Math.min(BRIEF.length, briefChars + dt * 55);
    $('#brief-text').textContent =
      BRIEF.slice(0, Math.floor(briefChars)) + (briefChars < BRIEF.length ? '▌' : '');
  }
  if (!paused) {
    for (let i = 0; i < steps; i++) {
      state.minutes += (step * 10) / 60;
      if (real.on) updateReal(step);
      else if (mode === 'drive') updateDrive(step);
      else updateWalk(step);
      updatePayment(step);
      updateDelivery(step);
      traffic.update(
        step,
        [
          { x: player.x, z: player.z },
          { x: car.x, z: car.z },
        ],
        player,
      );
    }
    updateRoute(dt);
    updateHints();
    updateTalks();
    updateGuide(dt);
    if (Math.floor(elapsed * 2) !== Math.floor((elapsed - dt) * 2)) checkEnd();
  } else if (engine && soundOn) engine.g.gain.setTargetAtTime(0, audio.currentTime, 0.1);
  if (mode === 'walk' && engine && soundOn)
    engine.g.gain.setTargetAtTime(0, audio.currentTime, 0.2);
  updateSubtitles(dt);

  family.group.visible = mode === 'walk' && !real.on;
  family.group.position.set(player.x, 0, player.z);
  family.group.rotation.y = player.heading;
  family.update({
    dt,
    time: elapsed,
    gait: player.gait,
    moving: player.speed > 0.4,
    shopping: state.busy || payment.phase !== 'idle',
    delivery: deliveryTimer > 0,
  });
  factory.update(elapsed, paused ? 0 : dt, camera.position);
  carModel.group.position.set(car.x, 0, car.z);
  carModel.group.rotation.y = car.heading;
  for (const [i, wheel] of carModel.wheels.entries()) {
    wheel.rotation.z -= (car.speed * dt) / 0.36;
    if (i >= 2) wheel.rotation.y = -car.steer;
  }
  for (const s of stations) s.model.ring.material.opacity = 0.35 + Math.sin(elapsed * 3) * 0.25;
  updateReachCircles();
  if (routeMesh) routeMaterial.opacity = 0.55 + Math.sin(elapsed * 4) * 0.15;

  if (playing && real.on) {
    // First person: the phone is the camera, at the player's GPS position and eye height.
    camera.position.set(player.x, 1.6, player.z);
    if (!arView.update(camera, dt, stableMode ? 5 : 10)) {
      // No orientation sensor: face the compass or walking direction, or wherever the player drags.
      if (real.heading != null && elapsed - cam.lastMouse > 2) {
        const want = Math.atan2(-Math.cos(player.heading), Math.sin(player.heading));
        cam.yaw +=
          Math.atan2(Math.sin(want - cam.yaw), Math.cos(want - cam.yaw)) * Math.min(1, dt * 3);
      }
      camera.rotation.set(cam.arPitch ?? 0, cam.yaw, 0, 'YXZ');
    }
    camPos.copy(camera.position);
  } else if (playing) {
    if (camera.fov !== 62) {
      camera.fov = 62;
      camera.updateProjectionMatrix();
    }
    updateCamera(dt);
  } else {
    const a = elapsed * 0.08;
    camera.position.set(player.x + Math.cos(a) * 30, 18, player.z + Math.sin(a) * 30);
    camera.lookAt(player.x, 2, player.z);
    camPos.copy(camera.position);
  }
  sun.position.set(player.x + 160, 230, player.z + 110);
  sun.target.position.set(player.x, 0, player.z);
  sky.position.copy(camera.position);
  city.update(camera.position);
  if (!arMode) imagery.update(camera.position.x, camera.position.z);
  if (playing) {
    hudTimer -= dt;
    updateHUD(dt);
    if ($('#map-dialog').open && hudTimer <= 0) {
      hudTimer = 0.5;
      renderMap();
    }
  }
  renderer.render(scene, camera);
}

// ?debug exposes live game state in the console for development and automated checks.
if (new URLSearchParams(location.search).has('debug'))
  window.game = {
    get state() {
      return state;
    },
    get player() {
      return player;
    },
    get cam() {
      return cam;
    },
    factory,
    get car() {
      return car;
    },
    get mode() {
      return mode;
    },
    get payment() {
      return payment;
    },
    get elapsed() {
      return elapsed;
    },
    get route() {
      return route;
    },
    setWaypoint(id) {
      waypoint = id;
      route = null;
      routeTimer = 0;
    },
    get arMode() {
      return arMode;
    },
    arView,
    setArMode,
    debugHits,
    nearestRoad: (x, z) => nearestSegment(segments, x, z, 40, (s) => s[4] <= 3),
    stations,
    guideState,
    real,
    keys,
    traffic,
  };
reset();
resize();
setupPwa();
$('#loading').remove();
requestAnimationFrame(frame);
