import * as THREE from 'three';
import { routeBetween } from '../world/routing.js';
import { FACTORY } from '../../constants/locations.js';
import { isOpen, formatClock, fa } from '../economy/gameState.js';
import { rankFor, activeMission, MISSIONS } from '../economy/scoring.js';
import { kmh } from '../systems/vehicle.js';
import { nearestRide } from './garage.js';
import { drawMinimap } from '../world/mapRender.js';
import { bearing, formatDistance } from '../../utils/geo.js';
import { strings } from '../../i18n/fa.js';
import { COMPANY } from '../../config/company.js';

// Brand colours for materials and canvas drawings.
const BRAND = COMPANY.colors;
/**
 * Runs the rebuild route mesh operation for this subsystem.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export function rebuildRouteMesh(context) {
  if (context.routeMesh) {
    context.scene.remove(context.routeMesh);
    context.routeMesh.geometry.dispose();
    context.routeMesh = null;
  }
  if (!context.route) return;
  const pts = [],
    pos = [],
    idx = [];
  let total = 0;
  for (const p of context.route.points) {
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
      w = context.mode === 'drive' ? 1.1 : 0.55;
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
  context.routeMesh = new THREE.Mesh(g, context.routeMaterial);
  context.scene.add(context.routeMesh);
}
/**
 * Updates route from the active simulation.
 * @param {*} context - context.
 * @param {*} dt - dt.
 * @returns {*} Operation result, when applicable.
 */
export function updateRoute(context, dt) {
  context.routeTimer -= dt;
  const target = context.objectiveStation();
  if (!target) {
    if (context.route) {
      context.route = null;
      context.rebuildRouteMesh();
    }
    return;
  }
  const pos = context.mode === 'drive' ? context.car : context.player;
  const changed =
    target !== context.routeTarget || context.routeMode !== context.mode || !context.route;
  if (
    !changed &&
    (context.routeTimer > 0 ||
      Math.hypot(pos.x - context.routeFrom.x, pos.z - context.routeFrom.z) < 10)
  )
    return;
  context.routeTimer = 1.2;
  context.routeTarget = target;
  context.routeMode = context.mode;
  context.routeFrom = {
    x: pos.x,
    z: pos.z,
  };
  // Close targets are reached directly; the street network would detour out of buildings.
  const direct = Math.hypot(target.front.x - pos.x, target.front.z - pos.z);
  context.route =
    direct < 60
      ? {
          points: [
            {
              x: pos.x,
              z: pos.z,
            },
            {
              x: target.front.x,
              z: target.front.z,
            },
          ],
          length: direct,
        }
      : routeBetween(
          context.mode === 'drive' ? context.driveGraph : context.walkGraph,
          pos.x,
          pos.z,
          target.front.x,
          target.front.z,
        );
  context.rebuildRouteMesh();
}
/**
 * Updates the objective chip: what to do next, how far it is, and an arrow that points at it
 * relative to where the camera looks (0° = straight ahead).
 * @param {object} context - Game context.
 * @param {{objective: object | null, pos: {x: number, z: number}, headingDeg: number}} view -
 * Objective station, player position and camera bearing.
 */
function updateObjectiveChip(context, { objective, pos, headingDeg }) {
  const mission = activeMission(context.state);
  // A route the player picked on the map shows the place; otherwise show the mission itself.
  const ownRoute = context.waypoint && context.waypoint !== mission?.target;
  const title = ownRoute ? objective?.def.name : (mission?.title ?? objective?.def.name);
  context.ui.patch('objective', { hidden: !title });
  if (!title) return;
  context.ui.patch('objective-title', { text: title });
  context.ui.patch('objective-distance', {
    text: objective ? formatDistance(Math.hypot(objective.x - pos.x, objective.z - pos.z)) : '',
  });
  if (!objective) return;
  const turn = bearing(objective.x - pos.x, objective.z - pos.z) - headingDeg;
  context.ui.style('objective-arrow', { transform: `rotate(${Math.round(turn)}deg)` });
}
/**
 * Runs the refresh hud operation for this subsystem.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export function refreshHUD(context) {
  context.ui.patch('balance', {
    text: fa(context.state.balance),
  });
  const rank = rankFor(context.state.xp);
  context.ui.patch('rank-name', {
    text: rank.name,
  });
  context.ui.patch('xp', {
    text: rank.next
      ? `${fa(context.state.xp)} / ${fa(rank.next)} XP`
      : `${fa(context.state.xp)} XP`,
  });
  context.ui.style('xp-bar', {
    width: `${Math.round(rank.progress * 100)}%`,
  });
  const active = activeMission(context.state);
  context.ui.patch('mission-list', {
    items: MISSIONS.map((m) => ({
      id: m.id,
      title: m.title,
      done: context.state.missionsDone.includes(m.id),
      active: m === active,
    })),
  });
  context.ui.publishGame(context.state);
  context.ui.patch('speed-stat', {
    hidden: context.mode !== 'drive',
  });
}
/**
 * Updates prompt from the active simulation.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export function updatePrompt(context) {
  const sample = context.nearShowroom();
  if (sample && !context.state.busy && context.payment.phase === 'idle') {
    context.ui.patch('prompt', {
      text: strings.prompts.showroom(sample.model.name),
      hidden: false,
    });
    return;
  }
  let text = '';
  const station = context.nearStation();
  const ride = context.mode === 'walk' ? nearestRide(context) : null;
  if (!context.state.busy && context.payment.phase === 'idle') {
    if (station)
      text = isOpen(station.def, context.state.minutes)
        ? strings.prompts.buy(station.def.name)
        : strings.prompts.closed(context.hoursText(station.def));
    else if (ride) text = strings.prompts.getIn(ride.label);
    else if (
      context.mode === 'drive' &&
      Math.abs(context.car.speed) < 1 &&
      context.stations.some(
        (s) => Math.hypot(s.front.x - context.car.x, s.front.z - context.car.z) < 25,
      )
    )
      text = strings.prompts.getOutNearMachine;
  }
  context.ui.patch('prompt', {
    text,
    hidden: !text,
  });
}

// ---------- Map dialog ----------
/**
 * Updates hud from the active simulation.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export function updateHUD(context) {
  context.ui.patch('showroom-open', {
    hidden:
      context.real.on ||
      context.mode !== 'walk' ||
      Math.hypot(context.player.x - FACTORY.center.x, context.player.z - FACTORY.center.z) >= 130,
  });
  const pos = context.mode === 'drive' ? context.car : context.player;
  context.ui.patch('clock', {
    text: formatClock(context.state.minutes),
  });
  if (context.mode === 'drive')
    context.ui.patch('speed', {
      text: fa(kmh(context.car)),
    });
  // Where the camera actually looks: the orbit camera, or the phone itself in AR view.
  const look3 = context.camera.getWorldDirection(new THREE.Vector3()),
    flat = Math.hypot(look3.x, look3.z);
  const forward =
    flat > 0.05
      ? {
          x: look3.x / flat,
          z: look3.z / flat,
        }
      : {
          x: -Math.sin(context.cam.yaw),
          z: -Math.cos(context.cam.yaw),
        };
  const headingDeg = bearing(forward.x, forward.z);
  const objective = context.objectiveStation();
  updateObjectiveChip(context, { objective, pos, headingDeg });
  // The minimap is optional (floating menu); skip drawing it while it is hidden.
  if (context.showMinimap)
    drawMinimap(context.minimap, context.mapAssets, {
      size: 220,
      x: pos.x,
      z: pos.z,
      heading: context.mode === 'drive' ? context.car.heading : context.player.heading,
      camForward: forward,
      radius: context.mode === 'drive' ? 650 : 200,
      markers: context.markers(),
      route: context.route?.points,
    });
  // Objective marker above the machine, clamped to the screen edge when off-screen.
  context.ui.patch('waypoint', {
    hidden: !objective,
  });
  if (objective) {
    const d = Math.hypot(objective.x - pos.x, objective.z - pos.z),
      p = new THREE.Vector3(objective.x, 3.4, objective.z).project(context.camera);
    let sx = (p.x * 0.5 + 0.5) * innerWidth,
      sy = (-p.y * 0.5 + 0.5) * innerHeight;
    if (p.z > 1) {
      sx = innerWidth - sx;
      sy = innerHeight - 60;
    }
    context.ui.style('waypoint', {
      left: `${THREE.MathUtils.clamp(sx, 60, innerWidth - 60)}px`,
    });
    context.ui.style('waypoint', {
      top: `${THREE.MathUtils.clamp(sy, 90, innerHeight - 130)}px`,
    });
    context.ui.patch('waypoint-name', {
      text: objective.def.name,
    });
    context.ui.patch('waypoint-distance', {
      text: formatDistance(d),
    });
    context.ui.patch('waypoint', {
      hidden: d < 6,
    });
    for (const s of context.stations) {
      const isObjective = s === objective;
      s.model.beacon.material.color.set(isObjective ? '#f2c94c' : BRAND.primary);
      s.model.beacon.material.opacity =
        (isObjective ? 0.32 : 0.14) * Math.min(1, Math.hypot(s.x - pos.x, s.z - pos.z) / 40);
    }
  }
  context.updatePrompt();
}
