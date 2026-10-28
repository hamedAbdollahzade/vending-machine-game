import * as THREE from 'three';
import data from '../../data/mellat.json';
import { routeBetween, nearestSegment } from '../world/routing.js';
import { FACTORY } from '../../constants/locations.js';
import { isOpen, formatClock, fa } from '../economy/gameState.js';
import { rankFor, activeMission, MISSIONS } from '../economy/scoring.js';
import { kmh } from '../systems/vehicle.js';
import { drawMinimap } from '../world/mapRender.js';
import { bearing, formatDistance } from '../../utils/geo.js';
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
 * Runs the draw compass operation for this subsystem.
 * @param {*} context - context.
 * @param {*} headingDeg - heading Deg.
 * @param {*} markers - markers.
 * @returns {*} Operation result, when applicable.
 */
export function drawCompass(context, headingDeg, markers) {
  const w = 560,
    h = 44;
  context.compass.clearRect(0, 0, w, h);
  context.compass.fillStyle = 'rgba(10,16,14,.45)';
  context.compass.fillRect(0, 10, w, 24);
  context.compass.textAlign = 'center';
  context.compass.textBaseline = 'middle';
  const labels = {
    0: 'شمال',
    90: 'شرق',
    180: 'جنوب',
    270: 'غرب',
  };
  for (let d = -100; d <= 100; d += 5) {
    const deg = (((Math.round(headingDeg / 5) * 5 + d) % 360) + 360) % 360,
      x = w / 2 + ((deg - headingDeg + 540) % 360) * 2.6 - 180 * 2.6;
    if (x < 10 || x > w - 10) continue;
    context.compass.fillStyle = 'rgba(236,242,238,.8)';
    if (labels[deg] !== undefined) {
      context.compass.font = 'bold 13px Vazirmatn, sans-serif';
      context.compass.fillStyle = deg === 0 ? '#f2c94c' : '#ecf2ee';
      context.compass.fillText(labels[deg], x, 22);
    } else if (deg % 15 === 0) {
      context.compass.font = '10px Vazirmatn, sans-serif';
      context.compass.fillText(fa(deg), x, 22);
    } else context.compass.fillRect(x - 0.5, 18, 1, 8);
  }
  for (const m of markers) {
    const x = w / 2 + (((m.bearing - headingDeg + 540) % 360) - 180) * 2.6;
    if (x < 10 || x > w - 10) continue;
    context.compass.save();
    context.compass.translate(x, 6);
    context.compass.rotate(Math.PI / 4);
    context.compass.fillStyle = m.color;
    context.compass.fillRect(-4, -4, 8, 8);
    context.compass.restore();
  }
  context.compass.fillStyle = '#ecf2ee';
  context.compass.fillRect(w / 2 - 1, 34, 2, 8);
  context.compass.font = 'bold 11px Vazirmatn, sans-serif';
  context.compass.fillText(fa(Math.round(headingDeg) % 360), w / 2, 6);
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
  context.ui.patch('mode-label', {
    text: context.mode === 'drive' ? 'در ماشین · F برای پیاده شدن' : 'پیاده',
  });
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
      text: `Q · معرفی ${sample.model.name} و پرسیدن قیمت`,
      hidden: false,
    });
    return;
  }
  let text = '';
  const station = context.nearStation();
  if (!context.state.busy && context.payment.phase === 'idle') {
    if (station)
      text = isOpen(station.def, context.state.minutes)
        ? `E · خرید از روبات مارکت · ${station.def.name}`
        : `دستگاه بسته است · ${context.hoursText(station.def)}`;
    else if (
      context.mode === 'walk' &&
      Math.hypot(context.car.x - context.player.x, context.car.z - context.player.z) < 4.5
    )
      text = 'F · سوار ماشین شو';
    else if (
      context.mode === 'drive' &&
      Math.abs(context.car.speed) < 1 &&
      context.stations.some(
        (s) => Math.hypot(s.front.x - context.car.x, s.front.z - context.car.z) < 25,
      )
    )
      text = 'F · پیاده شو؛ دستگاه نزدیک است';
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
 * @param {*} dt - dt.
 * @returns {*} Operation result, when applicable.
 */
export function updateHUD(context, dt) {
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
  context.drawCompass(
    headingDeg,
    objective
      ? [
          {
            bearing: bearing(objective.x - pos.x, objective.z - pos.z),
            color: '#f2c94c',
          },
        ]
      : [],
  );
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
      s.model.beacon.material.color.set(isObjective ? '#f2c94c' : '#3ee0c9');
      s.model.beacon.material.opacity =
        (isObjective ? 0.32 : 0.14) * Math.min(1, Math.hypot(s.x - pos.x, s.z - pos.z) / 40);
    }
  }
  context.streetTimer -= dt;
  if (context.streetTimer <= 0) {
    context.streetTimer = 0.6;
    const street = nearestSegment(context.segments, pos.x, pos.z, 35, (s) => s[5] >= 0);
    const inFactory = Math.hypot(pos.x - FACTORY.center.x, pos.z - FACTORY.center.z) < 130;
    context.ui.patch('street', {
      text: inFactory
        ? `کارخانهٔ ${FACTORY.name}`
        : street
          ? `مشهد · ${data.names[street.name]}`
          : 'حومهٔ مشهد',
    });
  }
  context.updatePrompt();
}
