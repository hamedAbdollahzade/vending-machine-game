import { createShowroom } from '../models/showroom.js';
import { showroomAnswer, showroomModelById } from '../../utils/showroomAnswers.js';
import { loadWorldFiles } from '../../services/worldService.js';
import * as THREE from 'three';
import { arrivalRadius, createStabilizer } from '../device/realworld.js';
import { createArView } from '../device/ar.js';
import data from '../../data/mellat.json';
import { createCity } from '../world/city.js';
import { createImagery } from '../world/imagery.js';
import { decodeBuildings } from '../world/buildingsData.js';
import { createCollisionWorld, addPolygon, resolveCircle } from '../world/collision.js';
import {
  buildGraph,
  buildSegmentIndex,
  nearestSegment,
  DRIVABLE_MAX_TYPE,
} from '../world/routing.js';
import { machines, CITY_START, FACTORY } from '../../constants/locations.js';
import { isOpen, formatClock } from '../economy/gameState.js';
import { stepTarget } from '../missions/missionProgress.js';
import { createFamily } from '../models/characters.js';
import { createFactory } from '../models/factory.js';
import { createTraffic } from '../systems/traffic.js';
import { createGarage } from './garage.js';
import { createMapAssets } from '../world/mapRender.js';
import { formatDistance, toLocal } from '../../utils/geo.js';
import { strings } from '../../i18n/fa.js';
import { COMPANY } from '../../config/company.js';
import { SHOWROOM_POINT_ID } from '../../constants/factoryPoints.js';
import {
  PIXEL_RATIO_DESKTOP,
  PIXEL_RATIO_LOW,
  PIXEL_RATIO_MOBILE,
} from '../../constants/graphics.js';
import { createObjectiveArrow } from '../models/objectiveArrow.js';

// Brand colours for materials and canvas drawings.
const BRAND = COMPANY.colors;

// City map zoom limits in metres per screen pixel (closest and furthest).
const MAP_ZOOM_MIN = 0.35;
const MAP_ZOOM_MAX = 30;
/**
 * Initializes timers in dependency order.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function initializeTimers(context) {
  context.timers = new Set();
  context.setTimeout = (callback, delay) => {
    const timer = window.setTimeout(() => {
      context.timers.delete(timer);
      if (!context.signal.aborted) callback();
    }, delay);
    context.timers.add(timer);
    return timer;
  };
  context.clearTimeout = (timer) => {
    context.timers.delete(timer);
    window.clearTimeout(timer);
  };
  context.listen = (target, type, handler, options = {}) =>
    target.addEventListener(type, handler, {
      ...options,
      signal: context.signal,
    });
  context.frameId = undefined;
  context.$ = (s) => context.root.querySelector(s);
  context.canvas = context.$('#world');
  context.renderer = undefined;
}
/**
 * Initializes renderer in dependency order.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function initializeRenderer(context) {
  try {
    // alpha: in camera AR view the phone's camera picture shows through where nothing is drawn.
    context.renderer = new THREE.WebGLRenderer({
      canvas: context.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
  } catch {
    context.ui.patch('loading', {
      text: strings.app.noWebgl,
    });
    throw new Error('WebGL unavailable');
  }
  // Low quality (no shadows, 1× pixels) for weak phones; chosen with ?quality=low or the toolbar button.
  context.quality =
    new URLSearchParams(location.search).get('quality') ??
    (() => {
      try {
        return localStorage.getItem('quality');
      } catch {
        return null;
      }
    })() ??
    (matchMedia('(pointer: coarse)').matches ? 'low' : 'high');
  const cap = matchMedia('(pointer: coarse)').matches ? PIXEL_RATIO_MOBILE : PIXEL_RATIO_DESKTOP;
  context.renderer.setPixelRatio(
    context.quality === 'low' ? PIXEL_RATIO_LOW : Math.min(devicePixelRatio, cap),
  );
}
/**
 * Initializes scene in dependency order.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function initializeScene(context) {
  context.renderer.shadowMap.enabled = context.quality !== 'low';
  context.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  context.renderer.outputColorSpace = THREE.SRGBColorSpace;
  context.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  context.renderer.toneMappingExposure = 1.05;
  context.scene = new THREE.Scene();
  context.fog = new THREE.Fog('#d8cdb4', 220, 1500);
  context.scene.fog = context.fog;
  context.camera = new THREE.PerspectiveCamera(62, 1, 0.3, 7000);
}
/**
 * Initializes sky in dependency order.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function initializeSky(context) {
  // Morning sky over Mashhad: a gradient dome, warm haze at the horizon.
  context.sky = new THREE.Mesh(
    new THREE.SphereGeometry(5000, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: {
          value: new THREE.Color('#6f9fd0'),
        },
        horizon: {
          value: new THREE.Color('#e6dbc3'),
        },
      },
      vertexShader:
        'varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader:
        'uniform vec3 top; uniform vec3 horizon; varying vec3 vPos; void main(){ float h = clamp(normalize(vPos).y * 2.2, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, h), 1.0); }',
    }),
  );
  context.scene.add(context.sky);
  context.scene.add(new THREE.HemisphereLight('#fff4dc', '#7d715d', 1.6));
  context.sun = new THREE.DirectionalLight('#ffe9c2', 3.2);
  context.sun.castShadow = true;
  context.sun.shadow.mapSize.set(2048, 2048);
}
/**
 * Initializes lighting and world files in dependency order.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function initializeLightingAndWorldFiles(context) {
  Object.assign(context.sun.shadow.camera, {
    left: -75,
    right: 75,
    top: 75,
    bottom: -75,
    near: 10,
    far: 700,
  });
  context.sun.shadow.bias = -0.0004;
  context.sun.shadow.normalBias = 0.4;
  context.scene.add(context.sun, context.sun.target);

  // ---------- World data ----------
  // Microsoft's building footprints and the satellite tile list are downloaded files, not bundled code.
  // The game still runs without them (OSM buildings and drawn roads).
  [context.buildingsFile, context.imageryIndex] = await loadWorldFiles(context.signal);
  if (context.signal.aborted) {
    context.renderer?.dispose();
    return () => {};
  }
  // Footprints reaching into the factory compound are left out: the game's own buildings stand there.
}
/**
 * Initializes collision and roads in dependency order.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function initializeCollisionAndRoads(context) {
  context.inFactory = (x, z) => {
    const dx = x - FACTORY.center.x,
      dz = z - FACTORY.center.z;
    const u = dx * FACTORY.axis.x + dz * FACTORY.axis.z,
      v = -dx * FACTORY.axis.z + dz * FACTORY.axis.x;
    return u > -112 && u < 82 && v > -52 && v < 52;
  };
  context.extraBuildings = (
    context.buildingsFile ? decodeBuildings(context.buildingsFile) : []
  ).filter((b) => {
    for (let i = 1; i < b.length; i += 2) if (context.inFactory(b[i], b[i + 1])) return false;
    return true;
  });
  context.collision = createCollisionWorld(
    [...data.buildings, ...context.extraBuildings].map((b) => b.slice(1)),
  );
  context.segments = buildSegmentIndex(data.roads);
  context.walkGraph = buildGraph(data.roads);
  context.driveGraph = buildGraph(data.roads, {
    drivable: true,
  });
  context.ROAD_HALF_WIDTH = [5.5, 5, 4.5, 4, 3.2, 3, 2.5, 2];
  context.rotateLocal = (lx, lz, rot) => ({
    x: lx * Math.cos(rot) + lz * Math.sin(rot),
    z: -lx * Math.sin(rot) + lz * Math.cos(rot),
  });
}
/**
 * Initializes factory in dependency order.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function initializeFactory(context) {
  // The game starts inside the vending-machine factory on the Mashhad–Chenaran road.
  context.factory = createFactory(context.scene);
  context.showroom = createShowroom(context.scene);
  for (const sample of context.showroom.samples) addPolygon(context.collision, sample.footprint);
  context.factory.footprints.forEach((f) => addPolygon(context.collision, f));

  // City machines stand beside their path point, on whichever side is free, facing the path;
  // the factory's demo machine has a fixed place inside the production hall.
}
/**
 * Initializes stations in dependency order.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function initializeStations(context) {
  context.stations = machines.map((def) => {
    if (def.spot) {
      // Test points: the given coordinate is where the player stands; the machine faces the factory.
      const front = toLocal(def.spot.lat, def.spot.lon);
      const dx = FACTORY.center.x - front.x,
        dz = FACTORY.center.z - front.z,
        len = Math.hypot(dx, dz) || 1;
      return context.placeStation(
        def,
        {
          x: front.x - (dx / len) * 1.9,
          z: front.z - (dz / len) * 1.9,
        },
        Math.atan2(dx, dz),
      );
    }
    if (!def.anchor)
      return context.placeStation(def, context.factory.demo, context.factory.demo.rot);
    const seg = nearestSegment(context.segments, def.anchor.x, def.anchor.z, 40) ?? {
      dx: 1,
      dz: 0,
      type: 9,
    };
    const len = Math.hypot(seg.dx, seg.dz) || 1,
      nx = -seg.dz / len,
      nz = seg.dx / len;
    const off = (seg.type <= DRIVABLE_MAX_TYPE ? context.ROAD_HALF_WIDTH[seg.type] : 1.2) + 2.4;
    let pos = null;
    for (const d of [off, -off, off + 1.5, -off - 1.5]) {
      const x = def.anchor.x + nx * d,
        z = def.anchor.z + nz * d;
      if (!resolveCircle(context.collision, x, z, 1.4).hit) {
        pos = {
          x,
          z,
        };
        break;
      }
    }
    pos ??= {
      x: def.anchor.x + nx * off,
      z: def.anchor.z + nz * off,
    };
    return context.placeStation(def, pos, Math.atan2(def.anchor.x - pos.x, def.anchor.z - pos.z));
  });
}
/**
 * Initializes station by id in dependency order.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function initializeStationById(context) {
  context.stationById = (id) => context.stations.find((s) => s.def.id === id);
  for (const s of context.stations) if (s.def.test) s.model.group.visible = false;

  // In real-world mode a circle on the ground marks how close counts as "at the machine".
  for (const s of context.stations) {
    s.reach = new THREE.Mesh(
      new THREE.RingGeometry(0.96, 1, 96),
      new THREE.MeshBasicMaterial({
        color: BRAND.primary,
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
    context.scene.add(s.reach);
  }
  // GPS test points only take part while real-world mode is on.
  context.activeStations = () => context.stations.filter((s) => !s.def.test || context.real.on);
}
/**
 * Initializes closest station in dependency order.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function initializeClosestStation(context) {
  // The closest active machine whose front is within `radius` of (x, z).
  context.closestStation = (x, z, radius) =>
    context
      .activeStations()
      .map((s) => ({
        s,
        d: Math.hypot(s.front.x - x, s.front.z - z),
      }))
      .filter(({ d }) => d < radius)
      .sort((a, b) => a.d - b.d)[0]?.s ?? null;
  context.imagery = createImagery(context.scene, context.imageryIndex ?? {}, {
    lowQuality: context.quality === 'low',
    anisotropy: Math.min(16, context.renderer.capabilities.getMaxAnisotropy()),
  });
  context.city = createCity(context.scene, data, {
    collision: context.collision,
    segments: context.segments,
    extraBuildings: context.extraBuildings,
    satellite: context.imagery.available,
    lowQuality: context.quality === 'low',
  });
  if (context.imagery.available)
    context.ui.patch('attribution', {
      text: strings.app.osmImageryCredit(context.imageryIndex.attribution),
    });
  context.traffic = createTraffic(context.scene, data, 28);
  context.mapAssets = createMapAssets(data, [context.factory.label]);
}
/**
 * Initializes park gate in dependency order.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function initializeParkGate(context) {
  // Park gate sign at the first city machine.
  context.parkGate = new THREE.Group();
}
/**
 * Runs the build park gate operation for this subsystem.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function buildParkGate(context) {
  {
    const start = context.stationById(CITY_START),
      sign = document.createElement('canvas');
    sign.width = 512;
    sign.height = 128;
    const c = sign.getContext('2d');
    c.fillStyle = '#244d2e';
    c.fillRect(0, 0, 512, 128);
    c.fillStyle = '#f4efd9';
    c.textAlign = 'center';
    c.font = 'bold 64px Vazirmatn, Tahoma, sans-serif';
    c.fillText(strings.places.parkSign, 256, 86);
    const texture = new THREE.CanvasTexture(sign);
    texture.colorSpace = THREE.SRGBColorSpace;
    const gate = context.parkGate,
      post = new THREE.MeshStandardMaterial({
        color: '#6b5a49',
      });
    for (const side of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4, 0.3), post);
      p.position.set(side * 2.6, 2, 0);
      p.castShadow = true;
      gate.add(p);
    }
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(5.6, 1.4),
      new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
      }),
    );
    board.position.y = 4;
    gate.add(board);
    const at = context.rotateLocal(-4.5, 1.5, start.rot);
    gate.position.set(start.x + at.x, 0, start.z + at.z);
    gate.rotation.y = start.rot;
    context.scene.add(gate);
  }

  // ---------- Actors ----------
}
/**
 * Initializes family in dependency order.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function initializeFamily(context) {
  context.family = createFamily();
  context.scene.add(context.family.group);
  // The Robot Market guide lives inside the machines and comes out when the family arrives.
  context.guide = createFamily({
    robot: true,
  });
  context.guide.group.visible = false;
  context.scene.add(context.guide.group);
  context.state = undefined;
  context.payment = undefined;
  context.player = undefined;
  context.car = undefined;
  context.vehicle = undefined;
  context.mode = undefined;
  context.cam = undefined;
  context.waypoint = undefined;
  context.route = undefined;
  context.routeTimer = undefined;
  context.deliveryTimer = undefined;
  context.ended = undefined;
  context.keys = new Set();
}
/**
 * Initializes spawn car in dependency order.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function initializeSpawnCar(context) {
  // The family car waits in the factory yard right beside them, pointing at the gate; the staff
  // cars are parked in front of the office.
  createGarage(context);
  // ---------- Input ----------
  context.isTouch = matchMedia('(pointer: coarse)').matches;
  context.anyDialogOpen = () =>
    context.ui.read('shop').open ||
    context.ui.read('map-dialog').open ||
    context.ui.read('end').open ||
    context.ui.read('showroom').open ||
    context.ui.read('machine-card').open ||
    context.ui.read('about-board').open ||
    !context.ui.read('landing').hidden;
  // Physical key codes, so the controls also work with a Persian keyboard layout.
  context.keyName = (e) =>
    e.code.startsWith('Key') ? e.code.slice(3).toLowerCase() : e.key.toLowerCase();
}
/**
 * Runs the register keyboard operation for this subsystem.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function registerKeyboard(context) {
  context.listen(window, 'keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    const k = context.keyName(e);
    if (k === 'm' && !e.repeat && context.ui.read('landing').hidden) {
      e.preventDefault();
      context.ui.read('map-dialog').open ? context.ui.close('map-dialog') : context.openMap();
      return;
    }
    if (context.anyDialogOpen()) return;
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'tab'].includes(k))
      e.preventDefault();
    if (e.repeat) return;
    context.keys.add(k);
    if (k === 'f') context.toggleCar();
    if (k === 'e') context.interact();
    if (k === 'q') context.openShowroom();
    if (k === 'c') context.swipe();
    if (k === 'escape' && context.payment.phase !== 'idle') context.cancel();
  });
  context.listen(window, 'keyup', (e) => context.keys.delete(context.keyName(e)));
  context.listen(window, 'blur', () => context.keys.clear());

  // Pointer lock gives a shooter-style mouse look; dragging works as a fallback and on touch.
}
/**
 * Runs the register pointer look operation for this subsystem.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function registerPointerLook(context) {
  context.listen(context.canvas, 'click', () => {
    if (
      !context.isTouch &&
      !context.anyDialogOpen() &&
      document.pointerLockElement !== context.canvas
    )
      context.canvas.requestPointerLock?.()?.catch?.(() => {});
  });
  context.listen(document, 'mousemove', (e) => {
    if (document.pointerLockElement !== context.canvas) return;
    context.look(e.movementX, e.movementY, 0.0024);
  });
  context.drag = null;
  context.listen(context.canvas, 'pointerdown', (e) => {
    if (document.pointerLockElement === context.canvas) return;
    context.drag = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
    };
    context.canvas.setPointerCapture(e.pointerId);
  });
  context.listen(context.canvas, 'pointermove', (e) => {
    if (!context.drag || context.drag.id !== e.pointerId) return;
    context.look(e.clientX - context.drag.x, e.clientY - context.drag.y, 0.005);
    context.drag.x = e.clientX;
    context.drag.y = e.clientY;
  });
}
/**
 * Runs the register camera zoom operation for this subsystem.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function registerCameraZoom(context) {
  context.listen(context.canvas, 'pointerup', () => (context.drag = null));
  context.listen(context.canvas, 'pointercancel', () => (context.drag = null));
  context.listen(
    context.canvas,
    'wheel',
    (e) => {
      context.cam.distance = THREE.MathUtils.clamp(
        context.cam.distance + Math.sign(e.deltaY) * 0.6,
        3,
        12,
      );
    },
    {
      passive: true,
    },
  );
  // Touch joystick: x steers / strafes, y walks / throttles.
  context.stick = {
    x: 0,
    y: 0,
    id: null,
  };
}
/**
 * Runs the register touch input operation for this subsystem.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function registerTouchInput(context) {
  if (context.isTouch) {
    context.ui.patch('touch', {
      hidden: false,
    });
    const pad = context.$('#stick'),
      knob = pad.querySelector('i');
    /**
     * Runs the move operation for this subsystem.
     * @param {*} e - e.
     * @returns {*} Operation result, when applicable.
     */
    const move = (e) => {
      const r = pad.getBoundingClientRect(),
        dx = e.clientX - (r.left + r.width / 2),
        dy = e.clientY - (r.top + r.height / 2);
      const len = Math.min(1, Math.hypot(dx, dy) / (r.width / 2)),
        a = Math.atan2(dy, dx);
      context.stick.x = Math.cos(a) * len;
      context.stick.y = -Math.sin(a) * len;
      knob.style.transform = `translate(${context.stick.x * 40}px, ${-context.stick.y * 40}px)`;
    };
    context.listen(pad, 'pointerdown', (e) => {
      context.stick.id = e.pointerId;
      pad.setPointerCapture(e.pointerId);
      move(e);
    });
    context.listen(pad, 'pointermove', (e) => e.pointerId === context.stick.id && move(e));
    /**
     * Runs the end operation for this subsystem.

     * @returns {*} Operation result, when applicable.
     */
    const end = () => {
      context.stick.id = null;
      context.stick.x = context.stick.y = 0;
      knob.style.transform = '';
    };
    context.listen(pad, 'pointerup', end);
    context.listen(pad, 'pointercancel', end);
    for (const k of ['shift', 'f', 'e'])
      context.ui.on(`touch-${k}`, () => {
        if (k === 'shift') {
          if (context.keys.has('shift')) context.keys.delete('shift');
          else context.keys.add('shift');
          context.ui.patch('touch-shift', {
            pressed: context.keys.has('shift'),
          });
        }
        if (k === 'f') context.toggleCar();
        if (k === 'e') context.payment.phase === 'ready' ? context.swipe() : context.interact();
      });
  }
}
/**
 * Initializes axis in dependency order.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function initializeAxis(context) {
  context.axis = (pos, neg) =>
    Number(pos.some((k) => context.keys.has(k))) - Number(neg.some((k) => context.keys.has(k)));
  // ---------- Subtitles ----------
  context.SPEAKERS = { ...strings.speakers };
  // Factory staff speak under their own names.
  for (const t of context.factory.talks) if (t.label) context.SPEAKERS[t.speaker] = t.label;
  context.lines = [];
  context.lineTimer = 0;
  context.talking = false;
  // ---------- Sound ----------
  context.audio = null;
  context.soundOn = false;
  context.engine = null;
}
/**
 * Runs the register sound control operation for this subsystem.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function registerSoundControl(context) {
  context.ui.on('sound', async () => {
    try {
      context.audio ??= new AudioContext();
      await context.audio.resume();
      context.soundOn = !context.soundOn;
      if (!context.engine) {
        const o = context.audio.createOscillator(),
          g = context.audio.createGain();
        o.type = 'sawtooth';
        g.gain.value = 0;
        o.connect(g).connect(context.audio.destination);
        o.start();
        context.engine = {
          o,
          g,
        };
      }
      context.ui.patch('sound', {
        text: context.soundOn ? strings.toolbar.soundOn : strings.toolbar.soundOff,
      });
      context.ui.patch('sound', {
        pressed: String(context.soundOn),
      });
      context.tone(700);
    } catch {
      context.ui.patch('sound', {
        text: strings.toolbar.soundUnavailable,
      });
    }
  });

  // ---------- Car ----------
}
/**
 * Initializes reach radius in dependency order.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function initializeReachRadius(context) {
  // ---------- Machines, shop and payment ----------
  // In real-world mode "at the machine" is a GPS radius, because the fix itself is off by metres.
  context.reachRadius = () =>
    context.real.on && context.real.fix ? arrivalRadius(context.real.fix.accuracy) : 3.4;
  context.nearStation = () =>
    context.mode === 'walk'
      ? context.closestStation(context.player.x, context.player.z, context.reachRadius())
      : null;
  context.hoursText = (m) =>
    m.hours[1] - m.hours[0] >= 24 * 60
      ? strings.common.allDay
      : strings.common.hours(formatClock(m.hours[0]), formatClock(m.hours[1]));
  context.shopStation = null;
  context.nearShowroom = () =>
    !context.real.on && context.mode === 'walk' ? context.showroom.nearest(context.player) : null;
  context.ui.on('showroom-select', (id) => {
    if (!context.ui.read('showroom').open || !showroomModelById(id)) return;
    context.ui.patch('showroom', {
      modelId: id,
    });
    context.ui.patch('showroom-response', {
      text: strings.showroom.whatToKnow,
    });
  });
}
/**
 * Runs the register purchase controls operation for this subsystem.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function registerPurchaseControls(context) {
  context.ui.on('showroom-open', context.openShowroom);
  context.ui.on('showroom-question', (question) => {
    if (
      !context.ui.read('showroom').open ||
      question.modelId !== context.ui.read('showroom').modelId
    )
      return;
    const answer = showroomAnswer(question);
    if (!answer) return;
    context.ui.patch('showroom-response', {
      text: strings.showroom.robotSays(answer),
    });
    context.say('robot', answer, question.topic === 'price' ? 'happy' : 'wink');
    context.reportMissionEvent({ type: 'ask', machineId: SHOWROOM_POINT_ID });
  });
  context.ui.on('showroom-order', context.orderFromShowroom);
  context.ui.on('swipe', context.swipe);
  // On phones the prompt itself is the button: tap it to buy, swipe the card, or get in/out of the car.
  context.ui.on('prompt', () => {
    if (context.nearShowroom()) {
      context.openShowroom();
      return;
    }
    const board = context.nearBoard();
    if (board) {
      context.openBoard(board);
      return;
    }
    if (context.payment.phase === 'ready') context.swipe();
    else if (context.nearStation()) context.interact();
    else context.toggleCar();
  });
  context.ui.on('cancel-payment', context.cancel);
  context.ui.on('shop-close', () => context.ui.close('shop'));
  context.ui.patch('quality', {
    text: context.quality === 'low' ? strings.toolbar.graphicsLow : strings.toolbar.graphicsHigh,
  });
}
/**
 * Runs the register preferences operation for this subsystem.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function registerPreferences(context) {
  context.ui.on('quality', () => {
    try {
      localStorage.setItem('quality', context.quality === 'low' ? 'high' : 'low');
    } catch {}
    location.replace(location.pathname);
  });
  context.ui.on('again', context.reset);
  context.ui.on('continue', () => context.ui.close('end'));
  context.ui.on('restart', context.restartGame);
  context.ui.on('back-to-menu', context.backToMenu);
  context.ui.on('machine-order', context.orderFromCard);
  context.ui.on('machine-card-close', () => context.ui.close('machine-card'));
  // The minimap is off by default to keep the screen clear; the floating menu toggles it.
  try {
    context.showMinimap = localStorage.getItem('minimap') === 'on';
  } catch {
    context.showMinimap = false;
  }
  const applyMinimap = () => {
    context.ui.patch('minimap-button', { hidden: !context.showMinimap });
    context.ui.patch('minimap-toggle', { pressed: context.showMinimap });
  };
  applyMinimap();
  context.ui.on('minimap-toggle', () => {
    context.showMinimap = !context.showMinimap;
    try {
      localStorage.setItem('minimap', context.showMinimap ? 'on' : 'off');
    } catch {}
    applyMinimap();
  });

  // ---------- Objective, route and HUD ----------
  context.objectiveStation = () => {
    if (context.waypoint) return context.pointById(context.waypoint);
    const target = stepTarget(context.state);
    if (target) return context.pointById(target);
    // Open-ended missions point to the nearest place not bought from yet.
    const visited = new Set(context.state.purchases.map((p) => p.machineId));
    return (
      context
        .activeStations()
        .filter((s) => !visited.has(s.def.id))
        .sort(
          (a, b) =>
            Math.hypot(a.x - context.player.x, a.z - context.player.z) -
            Math.hypot(b.x - context.player.x, b.z - context.player.z),
        )[0] ?? null
    );
  };
}
/**
 * Initializes route material in dependency order.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function initializeRouteMaterial(context) {
  // The gold route ribbon on the ground, rebuilt when the route changes.
  context.routeMaterial = new THREE.MeshBasicMaterial({
    color: '#f2c94c',
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -12,
    polygonOffsetUnits: -24,
  });
  context.routeMesh = null;
  context.routeTarget = null;
  // Arrow hovering over the current objective machine.
  context.objectiveArrow = createObjectiveArrow();
  context.scene.add(context.objectiveArrow.group);
  context.routeFrom = {
    x: 0,
    z: 0,
  };
  context.routeMode = null;
  context.minimap = context.$('#minimap').getContext('2d');
}
/**
 * Initializes map view in dependency order.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function initializeMapView(context) {
  // ---------- Map dialog ----------
  context.mapView = {
    cx: 0,
    cz: 0,
    mpp: 2,
  };
  context.mapCanvas = context.$('#fullmap');
  context.iranCanvas = context.$('#iran-map');
  context.selected = null;
  context.mapTab = 'city';
  context.markers = () => {
    const visited = new Set(context.state.purchases.map((p) => p.machineId)),
      objective = context.objectiveStation();
    return context.activeStations().map((s) => ({
      id: s.def.id,
      x: s.x,
      z: s.z,
      visited: visited.has(s.def.id),
      open: isOpen(s.def, context.state.minutes),
      objective: s === objective,
    }));
  };
}
/**
 * Runs the register route selection operation for this subsystem.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function registerRouteSelection(context) {
  context.ui.on('route-button', () => {
    if (!context.selected) return;
    context.waypoint = context.selected;
    context.route = null;
    context.routeTimer = 0;
    context.updateRoute(0);
    const s = context.stationById(context.selected);
    context.say(
      'father',
      strings.dialogue.routeSet(
        s.def.name,
        context.route ? formatDistance(context.route.length) : '',
      ),
    );
    context.selectMachine(context.selected);
  });
  context.ui.on('minimap-button', context.openMap);
  context.ui.on('map-close', () => context.ui.close('map-dialog'));
}
/**
 * Runs the register map tabs operation for this subsystem.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function registerMapTabs(context) {
  for (const tab of ['city', 'iran'])
    context.ui.on(`tab-${tab}`, () => {
      context.mapTab = tab;
      context.ui.patch('tab-city', {
        selected: tab === 'city',
      });
      context.ui.patch('tab-iran', {
        selected: tab === 'iran',
      });
      context.ui.patch('fullmap', {
        hidden: tab !== 'city',
      });
      context.ui.patch('iran-map', {
        hidden: tab !== 'iran',
      });
      context.renderMap();
    });
  context.ui.on('select-machine', (id) => context.selectMachine(id, true));
  context.ui.on('select-product', context.startPayment);
  context.mapDrag = null;
}
/**
 * Runs the register map dragging operation for this subsystem.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function registerMapDragging(context) {
  // Every finger (or the mouse) on the map, so two fingers can pinch to zoom on phones.
  context.mapPointers = new Map();
  context.mapPinch = null;
  context.listen(context.mapCanvas, 'pointerdown', (e) => {
    context.mapPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    context.mapCanvas.setPointerCapture(e.pointerId);
    // A second finger turns the gesture into a pinch; it never counts as a tap on a machine.
    if (context.mapPointers.size > 1) {
      context.mapDrag = null;
      context.mapPinch = pointerSpread(context.mapPointers);
      return;
    }
    context.mapDrag = { x: e.clientX, y: e.clientY, moved: 0 };
  });
  context.listen(context.mapCanvas, 'pointermove', (e) => {
    if (!context.mapPointers.has(e.pointerId)) return;
    context.mapPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (context.mapPinch) pinchMap(context);
    else if (context.mapDrag) dragMap(context, e);
  });
  const release = (e) => {
    context.mapPointers.delete(e.pointerId);
    if (context.mapPointers.size < 2) context.mapPinch = null;
  };
  context.listen(context.mapCanvas, 'pointercancel', (e) => {
    release(e);
    context.mapDrag = null;
  });
  context.mapRelease = release;
}
/**
 * Measures the distance between the first two pointers on the map.
 * @param {Map<number, {x: number, y: number}>} pointers - Active pointers by id.
 * @returns {number} Distance in CSS pixels.
 */
function pointerSpread(pointers) {
  const [a, b] = [...pointers.values()];
  return Math.hypot(a.x - b.x, a.y - b.y) || 1;
}
/**
 * Zooms the city map by how much the two fingers spread or closed since the last move.
 * @param {*} context - Game context with the map view and active pointers.
 */
function pinchMap(context) {
  const spread = pointerSpread(context.mapPointers);
  context.mapView.mpp = THREE.MathUtils.clamp(
    (context.mapView.mpp * context.mapPinch) / spread,
    MAP_ZOOM_MIN,
    MAP_ZOOM_MAX,
  );
  context.mapPinch = spread;
  context.renderMap();
}
/**
 * Pans the city map with a one-finger or mouse drag.
 * @param {*} context - Game context with the map view and drag state.
 * @param {PointerEvent} e - The move event.
 */
function dragMap(context, e) {
  context.mapView.cx -= (e.clientX - context.mapDrag.x) * context.mapView.mpp;
  context.mapView.cz -= (e.clientY - context.mapDrag.y) * context.mapView.mpp;
  context.mapDrag.moved +=
    Math.abs(e.clientX - context.mapDrag.x) + Math.abs(e.clientY - context.mapDrag.y);
  context.mapDrag.x = e.clientX;
  context.mapDrag.y = e.clientY;
  context.renderMap();
}
/**
 * Runs the register map selection and zoom operation for this subsystem.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function registerMapSelectionAndZoom(context) {
  context.listen(context.mapCanvas, 'pointerup', (e) => {
    if (context.mapDrag && context.mapDrag.moved < 6) {
      const r = context.mapCanvas.getBoundingClientRect();
      const wx = context.mapView.cx + (e.clientX - r.left - r.width / 2) * context.mapView.mpp,
        wz = context.mapView.cz + (e.clientY - r.top - r.height / 2) * context.mapView.mpp;
      const hit = context
        .activeStations()
        .find((s) => Math.hypot(s.x - wx, s.z - wz) < 14 * context.mapView.mpp);
      if (hit) context.selectMachine(hit.def.id);
    }
    context.mapDrag = null;
    context.mapRelease(e);
  });
  context.listen(
    context.mapCanvas,
    'wheel',
    (e) => {
      e.preventDefault();
      context.mapView.mpp = THREE.MathUtils.clamp(
        context.mapView.mpp * (e.deltaY > 0 ? 1.15 : 1 / 1.15),
        MAP_ZOOM_MIN,
        MAP_ZOOM_MAX,
      );
      context.renderMap();
    },
    {
      passive: false,
    },
  );

  // ---------- Briefing ----------
}
/**
 * Initializes cities in dependency order.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function initializeCities(context) {
  context.CITIES = [
    {
      name: strings.cities.mashhad,
      lat: 36.3,
      lon: 59.6,
      active: true,
    },
    {
      name: strings.cities.tehran,
      lat: 35.69,
      lon: 51.39,
    },
    {
      name: strings.cities.isfahan,
      lat: 32.65,
      lon: 51.67,
    },
    {
      name: strings.cities.shiraz,
      lat: 29.59,
      lon: 52.58,
    },
    {
      name: strings.cities.tabriz,
      lat: 38.08,
      lon: 46.29,
    },
    {
      name: strings.cities.ahvaz,
      lat: 31.32,
      lon: 48.67,
    },
    {
      name: strings.cities.kerman,
      lat: 30.28,
      lon: 57.08,
    },
    {
      name: strings.cities.rasht,
      lat: 37.28,
      lon: 49.58,
    },
    {
      name: strings.cities.yazd,
      lat: 31.9,
      lon: 54.37,
    },
    {
      name: strings.cities.zahedan,
      lat: 29.5,
      lon: 60.86,
    },
    {
      name: strings.cities.kermanshah,
      lat: 34.31,
      lon: 47.07,
    },
    {
      name: strings.cities.bandarAbbas,
      lat: 27.18,
      lon: 56.27,
    },
  ];
}
/**
 * Initializes briefing and tracking in dependency order.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function initializeBriefingAndTracking(context) {
  context.ui.on('start', (mode) => context.startGame(mode));
  context.ui.on('gps-offline', context.switchToOffline);
  context.ui.on('gps-fallback-close', () => context.ui.close('gps-fallback'));

  // ---------- Real-world (GPS) mode ----------
  // The family mirrors the phone's position on the real map of Mashhad. Walking to a real place where
  // a machine stands lets the player buy there, with a bonus.
  context.real = {
    on: false,
    fix: null,
    heading: null,
    error: null,
    waiting: null,
    stop: null,
    stabilizer: createStabilizer(),
  };
  // ---------- First-person real-world view ----------
  // The view stands at the GPS position at eye height and turns with the phone. With the camera
  // picture on (AR) the city model is hidden and only the machines, their reach circles, the route
  // and the robot are drawn over the real street; with it off, the 3D city is shown first person.
  context.arView = createArView(context.$('#camera'));
}
/**
 * Initializes ar mode in dependency order.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function initializeArMode(context) {
  context.arMode = false;
  context.stableMode = true;
  context.hiddenInAr = () => [
    context.sky,
    context.city.group,
    context.imagery.group,
    context.factory.group,
    context.traffic.group,
    context.garage.group,
    context.parkGate,
    ...context.showroom.samples.map((sample) => sample.machine.group),
  ];
  context.ui.on('ar-toggle', () => context.setArMode(!context.arMode));
  context.ui.on('stable-toggle', () => {
    context.stableMode = !context.stableMode;
    context.real.stabilizer.stable = context.stableMode;
    context.ui.classState('stable-toggle', 'on', context.stableMode);
    context.ui.patch('stable-toggle', {
      text: context.stableMode ? strings.toolbar.stableOn : strings.toolbar.stableOff,
    });
  });

  // The safety notice comes first; permissions are requested from the tap on its button (iOS needs that).

  context.ui.on('real-mode', () => context.askRealMode(true));
  context.ui.on('gps-toggle', () => context.askRealMode(false));
  context.ui.on('real-cancel', () => context.ui.close('real-intro'));
  // ---------- Loop ----------
  context.camPos = new THREE.Vector3();
  context.camTarget = new THREE.Vector3();
  context.lookAt = new THREE.Vector3();
  context.elapsed = 0;
}
/**
 * Initializes last in dependency order.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function initializeLast(context) {
  context.last = performance.now();
  context.hudTimer = 0;
  context.streetTimer = 0;
  // Debug runs (headless checks render ~1 fps) may simulate a whole second per frame, still in substeps.
  context.MAX_FRAME = new URLSearchParams(location.search).has('debug') ? 1 : 0.25;
  context.listen(window, 'resize', context.resize);
  // Collision log for ?debug runs; trimmed so it never grows without bound.
  context.debugHits = [];
  context.hints = {
    closed: false,
    car: false,
  };
  // ---------- Robot guide ----------
  // When the family walks up to a machine the robot pops out of it, greets them and explains what to
  // do; when they leave it goes back inside. It is never a walking companion.
  context.guideState = {
    station: null,
    t: 0,
    greeted: new Set(),
    arrived: 0,
  };
  context.guideOut = () => context.guideState.t >= 1;
  context.easeOutBack = (t) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;
}
/**
 * Runs the expose debug tools operation for this subsystem.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function exposeDebugTools(context) {
  // ?debug exposes live game state in the console for development and automated checks.
  if (new URLSearchParams(location.search).has('debug'))
    window.game = {
      get state() {
        return context.state;
      },
      get player() {
        return context.player;
      },
      get cam() {
        return context.cam;
      },
      factory: context.factory,
      get points() {
        return context.factoryPoints;
      },
      get car() {
        return context.car;
      },
      get mode() {
        return context.mode;
      },
      get payment() {
        return context.payment;
      },
      get elapsed() {
        return context.elapsed;
      },
      get route() {
        return context.route;
      },
      setWaypoint(id) {
        context.waypoint = id;
        context.route = null;
        context.routeTimer = 0;
      },
      get arMode() {
        return context.arMode;
      },
      arView: context.arView,
      setArMode: context.setArMode,
      debugHits: context.debugHits,
      nearestRoad: (x, z) => nearestSegment(context.segments, x, z, 40, (s) => s[4] <= 3),
      stations: context.stations,
      guideState: context.guideState,
      real: context.real,
      keys: context.keys,
      traffic: context.traffic,
      garage: context.garage,
      get vehicle() {
        return context.vehicle;
      },
    };
}
/**
 * Runs the start game loop operation for this subsystem.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function startGameLoop(context) {
  context.reset();
  context.resize();
  context.ui.patch('loading', {
    hidden: true,
  });
  context.frameId = requestAnimationFrame(context.frame);
  // An embedding page may ask for a mode directly (CompanyGame's startMode, or ?mode=). Real-world
  // play still shows its safety notice first, and asks for location from the tap on it.
  if (context.requestedMode === 'real') context.askRealMode(true);
  else if (context.requestedMode) context.startGame(context.requestedMode);
}
/**
 * Initializes dispose in dependency order.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export async function initializeDispose(context) {
  context.dispose = () => {
    cancelAnimationFrame(context.frameId);
    context.timers?.forEach(window.clearTimeout);
    context.real?.stop?.();
    context.arView?.stop();
    context.arView?.stopSensors();
    context.imagery?.dispose?.();
    context.audio?.close();
    const geometries = new Set(),
      materials = new Set(),
      textures = new Set();
    context.scene?.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      const list = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of list) {
        if (!material) continue;
        materials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      }
    });
    geometries.forEach((item) => item.dispose());
    materials.forEach((item) => item.dispose());
    textures.forEach((item) => item.dispose());
    context.renderer?.dispose();
    if (document.pointerLockElement === context.canvas) document.exitPointerLock?.();
    if (window.game) delete window.game;
    context.ui.clearActions();
  };
}
