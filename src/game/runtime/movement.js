import * as THREE from 'three';
import data from '../../data/mellat.json';
import { resolveCircle } from '../world/collision.js';
import { stepCar } from '../systems/vehicle.js';
import { EXIT_MAX_SPEED } from '../../constants/vehicles.js';
import { collideDriving, nearestRide, takeRide, walkAroundVehicles } from './garage.js';
import { strings } from '../../i18n/fa.js';
/**
 * Runs the look operation for this subsystem.
 * @param {*} context - context.
 * @param {*} dx - dx.
 * @param {*} dy - dy.
 * @param {*} k - k.
 * @returns {*} Operation result, when applicable.
 */
export function look(context, dx, dy, k) {
  // In AR view the phone's orientation aims the camera; dragging only helps when there is no sensor.
  if (context.real.on) {
    if (context.arView.hasOrientation) return;
    context.cam.yaw -= dx * k;
    context.cam.arPitch = THREE.MathUtils.clamp(
      (context.cam.arPitch ?? 0) - dy * k * 0.8,
      -1.2,
      1.2,
    );
    context.cam.lastMouse = context.elapsed;
    return;
  }
  context.cam.yaw -= dx * k;
  context.cam.pitch = THREE.MathUtils.clamp(context.cam.pitch + dy * k * 0.8, -0.15, 1.15);
  context.cam.lastMouse = context.elapsed;
}

// Touch joystick: x steers / strafes, y walks / throttles.
/**
 * Gets the player into the nearest vehicle, or out of the current one.
 * @param {object} context - Game context.
 */
export // ---------- Car ----------
function toggleCar(context) {
  if (context.payment.phase !== 'idle' || context.state.busy) return;
  if (context.real.on) {
    context.say('father', strings.real.noVirtualCar);
    return;
  }
  if (context.mode === 'walk') getIn(context);
  else getOut(context);
  context.refreshHUD();
}

/**
 * Gets into the closest vehicle within reach, if there is one.
 * @param {object} context - Game context.
 */
function getIn(context) {
  const ride = nearestRide(context);
  if (!ride) return;
  takeRide(context, ride);
  context.mode = 'drive';
  context.cam.distance = Math.max(context.cam.distance, 8);
  context.tone(320, 0.2, 0.05, 'square');
  context.say('father', strings.dialogue.carOn);
}

/**
 * Steps out of the current vehicle on its left side, or wherever is free.
 * @param {object} context - Game context.
 */
function getOut(context) {
  const { state, spec } = context.vehicle;
  if (Math.abs(state.speed) > EXIT_MAX_SPEED) {
    context.say('father', strings.dialogue.stopFirst);
    return;
  }
  const left = { x: -Math.sin(state.heading), z: -Math.cos(state.heading) };
  const step = spec.halfWidth + 1.8;
  const spot = resolveCircle(
    context.collision,
    state.x + left.x * step,
    state.z + left.z * step,
    1,
  );
  Object.assign(context.player, { x: spot.x, z: spot.z, heading: state.heading });
  state.speed = 0;
  context.mode = 'walk';
  context.cam.distance = 5.5;
  context.tone(260, 0.2, 0.05, 'square');
}

// ---------- Machines, shop and payment ----------
// In real-world mode "at the machine" is a GPS radius, because the fix itself is off by metres.
/**
 * Updates walk from the active simulation.
 * @param {*} context - context.
 * @param {*} dt - dt.
 * @returns {*} Operation result, when applicable.
 */
export function updateWalk(context, dt) {
  const forward = {
      x: -Math.sin(context.cam.yaw),
      z: -Math.cos(context.cam.yaw),
    },
    right = {
      x: Math.cos(context.cam.yaw),
      z: -Math.sin(context.cam.yaw),
    };
  const iy = context.axis(['w', 'arrowup'], ['s', 'arrowdown']) + context.stick.y,
    ix = context.axis(['d', 'arrowright'], ['a', 'arrowleft']) + context.stick.x;
  const frozen = context.state.busy || context.payment.phase !== 'idle';
  let dx = forward.x * iy + right.x * ix,
    dz = forward.z * iy + right.z * ix;
  const len = Math.hypot(dx, dz);
  const run = context.keys.has('shift');
  const target = frozen || len < 0.1 ? 0 : (run ? 6.5 : 3.4) * Math.min(1, len);
  context.player.speed += (target - context.player.speed) * Math.min(1, dt * 8);
  if (len > 0.1 && !frozen) {
    dx /= len;
    dz /= len;
    const want = Math.atan2(-dz, dx);
    context.player.heading +=
      Math.atan2(Math.sin(want - context.player.heading), Math.cos(want - context.player.heading)) *
      Math.min(1, dt * 9);
  }
  // Face the machine while buying.
  const station = context.payment.station ?? context.payment.delivering?.station;
  if (frozen && station) {
    const want = Math.atan2(-(station.z - context.player.z), station.x - context.player.x);
    context.player.heading +=
      Math.atan2(Math.sin(want - context.player.heading), Math.cos(want - context.player.heading)) *
      Math.min(1, dt * 6);
  }
  const mx = Math.cos(context.player.heading) * context.player.speed * dt,
    mz = -Math.sin(context.player.heading) * context.player.speed * dt;
  const p = walkAroundVehicles(
    context,
    resolveCircle(context.collision, context.player.x + mx, context.player.z + mz, 1),
  );
  const { minX, minZ, maxX, maxZ } = data.bounds;
  context.player.x = THREE.MathUtils.clamp(p.x, minX + 15, maxX - 15);
  context.player.z = THREE.MathUtils.clamp(p.z, minZ + 15, maxZ - 15);
  context.player.gait += dt * context.player.speed * 1.9;
}

/**
 * Pushes the driven vehicle out of buildings using the circles along its body.
 * @param {object} context - Game context.
 */
function keepOutOfBuildings(context) {
  const car = context.car;
  for (const { along, radius } of context.vehicle.spec.probes) {
    const cx = car.x + Math.cos(car.heading) * along,
      cz = car.z - Math.sin(car.heading) * along;
    const p = resolveCircle(context.collision, cx, cz, radius);
    if (!p.hit) continue;
    context.debugHits.push({
      kind: 'building',
      x: Math.round(cx),
      z: Math.round(cz),
      v: +car.speed.toFixed(1),
    });
    car.x += p.x - cx;
    car.z += p.z - cz;
    if (Math.abs(car.speed) > 4) context.tone(90, 0.2, 0.08, 'square');
    car.speed *= 0.35;
  }
}

// Collision log for ?debug runs; trimmed so it never grows without bound.
/**
 * Updates drive from the active simulation.
 * @param {*} context - context.
 * @param {*} dt - dt.
 * @returns {*} Operation result, when applicable.
 */
export function updateDrive(context, dt) {
  if (context.debugHits.length > 200) context.debugHits.splice(0, 100);
  const throttle = THREE.MathUtils.clamp(
    context.axis(['w', 'arrowup'], ['s', 'arrowdown']) + context.stick.y,
    -1,
    1,
  );
  const steer = THREE.MathUtils.clamp(
    context.axis(['d', 'arrowright'], ['a', 'arrowleft']) + context.stick.x,
    -1,
    1,
  );
  // At top speed the car covers almost 2 m per step, so move it in short slices that can't
  // tunnel through a thin wall, a fence or another vehicle.
  const slices = Math.max(1, Math.ceil((Math.abs(context.car.speed) * dt) / 0.6));
  for (let i = 0; i < slices; i++) {
    stepCar(
      context.car,
      { throttle, steer, handbrake: context.keys.has(' ') },
      dt / slices,
      context.vehicle.spec,
    );
    keepOutOfBuildings(context);
    collideDriving(context, dt / slices);
  }
  const { minX, minZ, maxX, maxZ } = data.bounds;
  context.car.x = THREE.MathUtils.clamp(context.car.x, minX + 15, maxX - 15);
  context.car.z = THREE.MathUtils.clamp(context.car.z, minZ + 15, maxZ - 15);
  Object.assign(context.player, {
    x: context.car.x,
    z: context.car.z,
    heading: context.car.heading,
  });
  // Chase camera swings back behind the car when the mouse is idle.
  if (context.elapsed - context.cam.lastMouse > 1.4 && Math.abs(context.car.speed) > 1) {
    const want =
      Math.atan2(-Math.cos(context.car.heading), Math.sin(context.car.heading)) +
      (context.car.speed < 0 ? Math.PI : 0);
    context.cam.yaw +=
      Math.atan2(Math.sin(want - context.cam.yaw), Math.cos(want - context.cam.yaw)) *
      Math.min(1, dt * 2.2);
    context.cam.pitch += (0.28 - context.cam.pitch) * Math.min(1, dt * 1.5);
  }
  if (context.engine && context.soundOn) {
    context.engine.o.frequency.setTargetAtTime(
      45 + Math.abs(context.car.speed) * 5 + Math.max(0, throttle) * 15,
      context.audio.currentTime,
      0.1,
    );
    context.engine.g.gain.setTargetAtTime(0.025, context.audio.currentTime, 0.2);
  }
}
