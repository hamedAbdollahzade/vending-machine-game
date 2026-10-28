import * as THREE from 'three';
import iran from '../../data/iran.json';
import { clearFraction } from '../world/collision.js';
import { drawIran } from '../world/mapRender.js';
/**
 * Runs the resize operation for this subsystem.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export function resize(context) {
  context.renderer.setSize(innerWidth, innerHeight);
  context.camera.aspect = innerWidth / innerHeight;
  context.camera.updateProjectionMatrix();
  context.renderMap();
}
/**
 * Updates camera from the active simulation.
 * @param {*} context - context.
 * @param {*} dt - dt.
 * @returns {*} Operation result, when applicable.
 */
export function updateCamera(context, dt) {
  const station = context.payment.station;
  if (station && context.payment.phase !== 'idle') {
    // Close-up of the card reader during payment.
    const reader = station.model.readerPoint.clone();
    station.model.group.localToWorld(reader);
    const side = context.rotateLocal(1.2, 1.9, station.rot);
    context.camTarget.set(reader.x + side.x, reader.y + 0.4, reader.z + side.z);
    context.lookAt.lerp(reader, 1 - Math.exp(-dt * 6));
  } else {
    const driving = context.mode === 'drive',
      height = driving ? 1.6 : 1.75;
    const focus = new THREE.Vector3(context.player.x, height, context.player.z);
    // Over-the-shoulder offset to the right, like a third-person shooter.
    const shoulder = driving ? 0 : 0.75;
    focus.x += Math.cos(context.cam.yaw) * shoulder;
    focus.z += -Math.sin(context.cam.yaw) * shoulder;
    let distance = context.cam.distance;
    const ox = Math.sin(context.cam.yaw) * Math.cos(context.cam.pitch),
      oz = Math.cos(context.cam.yaw) * Math.cos(context.cam.pitch);
    const free = clearFraction(
      context.collision,
      focus.x,
      focus.z,
      focus.x + ox * distance,
      focus.z + oz * distance,
      0.8,
    );
    if (context.cam.pitch < 0.9) distance = Math.max(1.6, distance * free - 0.7);
    context.camTarget.set(
      focus.x + ox * distance,
      Math.max(0.6, focus.y + Math.sin(context.cam.pitch) * distance),
      focus.z + oz * distance,
    );
    context.lookAt.lerp(focus, 1 - Math.exp(-dt * 14));
  }
  context.camPos.lerp(context.camTarget, 1 - Math.exp(-dt * 12));
  context.camera.position.copy(context.camPos);
  context.camera.lookAt(context.lookAt);
}
/**
 * Runs the frame operation for this subsystem.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export function frame(context) {
  const now = performance.now();
  context.frameId = requestAnimationFrame(context.frame);
  // The first rAF timestamp can predate `last`, so never let time run backwards. Long frames are
  // simulated in short substeps, so slow devices keep real-time speed without unstable physics.
  const dt = THREE.MathUtils.clamp((now - context.last) / 1000, 0, context.MAX_FRAME);
  context.last = now;
  context.elapsed += dt;
  const playing = context.ui.read('briefing').hidden;
  const paused =
    !playing ||
    context.ui.read('shop').open ||
    context.ui.read('map-dialog').open ||
    context.ui.read('end').open ||
    context.ui.read('showroom').open ||
    document.hidden;
  const steps = Math.max(1, Math.ceil(dt / (1 / 30))),
    step = dt / steps;
  if (!playing) {
    // Briefing: animate Iran, type the orders, slowly orbit the start point behind the overlay.
    const ic = context.$('#iran'),
      dpr = context.sizeCanvas(ic),
      c = ic.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawIran(c, iran, {
      width: ic.width / dpr,
      height: ic.height / dpr,
      t: context.elapsed,
      cities: context.CITIES,
    });
    context.briefChars = Math.min(context.BRIEF.length, context.briefChars + dt * 55);
    context.ui.patch('brief-text', {
      text:
        context.BRIEF.slice(0, Math.floor(context.briefChars)) +
        (context.briefChars < context.BRIEF.length ? '▌' : ''),
    });
  }
  if (!paused) {
    for (let i = 0; i < steps; i++) {
      context.state.minutes += (step * 10) / 60;
      if (context.real.on) context.updateReal(step);
      else if (context.mode === 'drive') context.updateDrive(step);
      else context.updateWalk(step);
      context.updatePayment(step);
      context.updateDelivery(step);
      context.traffic.update(
        step,
        [
          {
            x: context.player.x,
            z: context.player.z,
          },
          {
            x: context.car.x,
            z: context.car.z,
          },
        ],
        context.player,
      );
    }
    context.updateRoute(dt);
    context.updateHints();
    context.updateTalks();
    context.updateGuide(dt);
    if (Math.floor(context.elapsed * 2) !== Math.floor((context.elapsed - dt) * 2))
      context.checkEnd();
  } else if (context.engine && context.soundOn)
    context.engine.g.gain.setTargetAtTime(0, context.audio.currentTime, 0.1);
  if (context.mode === 'walk' && context.engine && context.soundOn)
    context.engine.g.gain.setTargetAtTime(0, context.audio.currentTime, 0.2);
  context.updateSubtitles(dt);
  context.family.group.visible = context.mode === 'walk' && !context.real.on;
  context.family.group.position.set(context.player.x, 0, context.player.z);
  context.family.group.rotation.y = context.player.heading;
  context.family.update({
    dt,
    time: context.elapsed,
    gait: context.player.gait,
    moving: context.player.speed > 0.4,
    shopping: context.state.busy || context.payment.phase !== 'idle',
    delivery: context.deliveryTimer > 0,
  });
  context.factory.update(context.elapsed, paused ? 0 : dt, context.camera.position);
  context.showroom.update({
    player: context.player,
    time: context.elapsed,
    dt,
    enabled: context.mode === 'walk' && !context.real.on,
    talking: context.ui.read('showroom').open,
  });
  context.carModel.group.position.set(context.car.x, 0, context.car.z);
  context.carModel.group.rotation.y = context.car.heading;
  for (const [i, wheel] of context.carModel.wheels.entries()) {
    wheel.rotation.z -= (context.car.speed * dt) / 0.36;
    if (i >= 2) wheel.rotation.y = -context.car.steer;
  }
  for (const s of context.stations)
    s.model.ring.material.opacity = 0.35 + Math.sin(context.elapsed * 3) * 0.25;
  context.updateReachCircles();
  if (context.routeMesh)
    context.routeMaterial.opacity = 0.55 + Math.sin(context.elapsed * 4) * 0.15;
  if (playing && context.real.on) {
    // First person: the phone is the camera, at the player's GPS position and eye height.
    context.camera.position.set(context.player.x, 1.6, context.player.z);
    if (!context.arView.update(context.camera, dt, context.stableMode ? 5 : 10)) {
      // No orientation sensor: face the compass or walking direction, or wherever the player drags.
      if (context.real.heading != null && context.elapsed - context.cam.lastMouse > 2) {
        const want = Math.atan2(
          -Math.cos(context.player.heading),
          Math.sin(context.player.heading),
        );
        context.cam.yaw +=
          Math.atan2(Math.sin(want - context.cam.yaw), Math.cos(want - context.cam.yaw)) *
          Math.min(1, dt * 3);
      }
      context.camera.rotation.set(context.cam.arPitch ?? 0, context.cam.yaw, 0, 'YXZ');
    }
    context.camPos.copy(context.camera.position);
  } else if (playing) {
    if (context.camera.fov !== 62) {
      context.camera.fov = 62;
      context.camera.updateProjectionMatrix();
    }
    context.updateCamera(dt);
  } else {
    const a = context.elapsed * 0.08;
    context.camera.position.set(
      context.player.x + Math.cos(a) * 30,
      18,
      context.player.z + Math.sin(a) * 30,
    );
    context.camera.lookAt(context.player.x, 2, context.player.z);
    context.camPos.copy(context.camera.position);
  }
  context.sun.position.set(context.player.x + 160, 230, context.player.z + 110);
  context.sun.target.position.set(context.player.x, 0, context.player.z);
  context.sky.position.copy(context.camera.position);
  context.city.update(context.camera.position);
  if (!context.arMode) context.imagery.update(context.camera.position.x, context.camera.position.z);
  if (playing) {
    context.hudTimer -= dt;
    context.updateHUD(dt);
    if (context.ui.read('map-dialog').open && context.hudTimer <= 0) {
      context.hudTimer = 0.5;
      context.renderMap();
    }
  }
  context.renderer.render(context.scene, context.camera);
}

// ?debug exposes live game state in the console for development and automated checks.
