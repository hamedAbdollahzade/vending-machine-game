import * as THREE from 'three';
import data from '../../data/mellat.json';
import { resolveCircle } from '../world/collision.js';
import { stepCar } from '../systems/vehicle.js';
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
 * Runs the toggle car operation for this subsystem.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export // ---------- Car ----------
function toggleCar(context) {
  if (context.payment.phase !== 'idle' || context.state.busy) return;
  if (context.real.on) {
    context.say('father', 'توی حالت دنیای واقعی پیاده راه می‌ریم؛ ماشین مجازی لازم نیست.');
    return;
  }
  if (context.mode === 'walk') {
    if (Math.hypot(context.car.x - context.player.x, context.car.z - context.player.z) > 4.5)
      return;
    context.mode = 'drive';
    context.cam.distance = Math.max(context.cam.distance, 8);
    context.tone(320, 0.2, 0.05, 'square');
    context.say('father', 'کمربندها رو ببندیم! مسیر طلایی روی زمین راه رو نشون می‌ده.');
  } else {
    if (Math.abs(context.car.speed) > 3) {
      context.say('father', 'اول ماشین را نگه دار، بعد پیاده می‌شویم.');
      return;
    }
    // Step out on the driver's (left) side, or wherever is free.
    const left = {
      x: -Math.sin(context.car.heading),
      z: -Math.cos(context.car.heading),
    };
    const spot = resolveCircle(
      context.collision,
      context.car.x + left.x * 2.8,
      context.car.z + left.z * 2.8,
      1,
    );
    Object.assign(context.player, {
      x: spot.x,
      z: spot.z,
      heading: context.car.heading,
    });
    context.car.speed = 0;
    context.mode = 'walk';
    context.cam.distance = 5.5;
    context.tone(260, 0.2, 0.05, 'square');
  }
  context.refreshHUD();
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
  const p = resolveCircle(context.collision, context.player.x + mx, context.player.z + mz, 1);
  const { minX, minZ, maxX, maxZ } = data.bounds;
  context.player.x = THREE.MathUtils.clamp(p.x, minX + 15, maxX - 15);
  context.player.z = THREE.MathUtils.clamp(p.z, minZ + 15, maxZ - 15);
  context.player.gait += dt * context.player.speed * 1.9;
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
  // tunnel through a thin wall or fence.
  const slices = Math.max(1, Math.ceil((Math.abs(context.car.speed) * dt) / 0.6));
  for (let i = 0; i < slices; i++) {
    stepCar(
      context.car,
      {
        throttle,
        steer,
        handbrake: context.keys.has(' '),
      },
      dt / slices,
    );
    // Two collision circles along the body keep the nose and tail out of buildings.
    for (const along of [1.3, -1.3]) {
      const cx = context.car.x + Math.cos(context.car.heading) * along,
        cz = context.car.z - Math.sin(context.car.heading) * along;
      const p = resolveCircle(context.collision, cx, cz, 1.05);
      if (p.hit) {
        context.debugHits.push({
          kind: 'building',
          x: Math.round(cx),
          z: Math.round(cz),
          v: +context.car.speed.toFixed(1),
        });
        context.car.x += p.x - cx;
        context.car.z += p.z - cz;
        if (Math.abs(context.car.speed) > 4) context.tone(90, 0.2, 0.08, 'square');
        context.car.speed *= 0.35;
      }
    }
  }
  // Bumping a traffic car slows you down but never throws you backwards. If you stay pressed
  // against one, it pulls away (respawns out of sight) so you can never get stuck behind it.
  for (const npc of context.traffic.cars) {
    const dx = context.car.x - npc.x,
      dz = context.car.z - npc.z,
      d = Math.hypot(dx, dz);
    if (d >= 3.4 || d === 0) {
      if (npc.contact) npc.contact = 0;
      continue;
    }
    context.debugHits.push({
      kind: 'traffic',
      x: Math.round(context.car.x),
      z: Math.round(context.car.z),
      v: +context.car.speed.toFixed(1),
      npcDir: npc.dir,
    });
    context.car.x = npc.x + (dx / d) * 3.4;
    context.car.z = npc.z + (dz / d) * 3.4;
    const towards =
      (Math.cos(context.car.heading) * -dx - Math.sin(context.car.heading) * -dz) *
        Math.sign(context.car.speed) >
      0;
    if (towards && Math.abs(context.car.speed) > 4) context.tone(110, 0.25, 0.08, 'square');
    if (towards) context.car.speed *= 0.4;
    npc.contact = (npc.contact ?? 0) + dt;
    if (npc.contact > 0.8) {
      npc.contact = 0;
      context.traffic.remove(npc);
    }
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
