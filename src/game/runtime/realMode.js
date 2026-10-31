import {
  startTracking,
  requestCompass,
  insideWorld,
  createStabilizer,
  MAX_WALKING_SPEED,
} from '../device/realworld.js';
import data from '../../data/mellat.json';
import { resolveCircle } from '../world/collision.js';
import { fa } from '../economy/gameState.js';
import { formatDistance } from '../../utils/geo.js';
import { strings } from '../../i18n/fa.js';
/**
 * Runs the set real mode operation for this subsystem.
 * @param {*} context - context.
 * @param {*} on - on.
 * @returns {*} Operation result, when applicable.
 */
export function setRealMode(context, on) {
  if (on === context.real.on) return;
  context.real.stop?.();
  Object.assign(context.real, {
    on,
    fix: null,
    heading: null,
    error: null,
    waiting: null,
    stop: null,
  });
  for (const s of context.stations) if (s.def.test) s.model.group.visible = on;
  context.ui.classState('gps-toggle', 'on', on);
  context.ui.patch('gps-status', {
    hidden: !on,
  });
  context.ui.patch('ar-toggle', {
    hidden: context.ui.patch('stable-toggle', {
      hidden: !on,
    }),
  });
  // Real-world mode is first person: the player is where the phone is and sees what it faces.
  context.ui.classState('body', 'real', on);
  if (!on) {
    context.setArMode(false);
    context.arView.stopSensors();
    return;
  }
  context.arView.startSensors();
  context.cam.arPitch = 0;
  context.cam.yaw = Math.atan2(-Math.cos(context.player.heading), Math.sin(context.player.heading));
  if (context.mode === 'drive') context.toggleCar();
  context.mode = 'walk';
  context.real.stop = startTracking({
    onFix: (fix) => {
      context.real.fix = fix;
      context.real.error = null;
    },
    onHeading: (heading) => (context.real.heading = heading),
    onError: (message) => (context.real.error = message),
    onStatus: (message) => (context.real.waiting = message),
    stabilizer: (context.real.stabilizer = createStabilizer()),
  });
  context.real.stabilizer.stable = context.stableMode;
  context.say('father', strings.real.on);
  context.setArMode(true);
}

// ---------- First-person real-world view ----------
// The view stands at the GPS position at eye height and turns with the phone. With the camera
// picture on (AR) the city model is hidden and only the machines, their reach circles, the route
// and the robot are drawn over the real street; with it off, the 3D city is shown first person.
/**
 * Runs the set ar mode operation for this subsystem.
 * @param {*} context - context.
 * @param {*} on - on.
 * @returns {*} Operation result, when applicable.
 */
export async function setArMode(context, on) {
  if (on && !context.arMode) {
    const problem = await context.arView.start();
    if (problem) {
      context.say('father', strings.real.cameraFailed(problem));
      return;
    }
    if (!context.real.on) {
      context.arView.stop();
      return;
    }
    context.say('robot', strings.real.cameraOn, 'excited');
    context.setTimeout(() => {
      if (context.real.on && !context.arView.hasOrientation)
        context.say('father', strings.real.noOrientation);
    }, 3000);
  } else if (!on && context.arMode) context.arView.stop();
  else return;
  context.arMode = on;
  for (const object of context.hiddenInAr()) object.visible = !on;
  context.scene.fog = on ? null : context.fog;
  context.ui.classState('body', 'ar', on);
  context.ui.classState('ar-toggle', 'on', on);
}
/**
 * Runs the ask real mode operation for this subsystem.
 * @param {*} context - context.
 * @param {*} thenStart - then Start.
 * @returns {*} Operation result, when applicable.
 */
export // The safety notice comes first; permissions are requested from the tap on its button (iOS needs that).
function askRealMode(context, thenStart) {
  if (context.real.on) {
    context.setRealMode(false);
    return;
  }
  context.ui.open('real-intro');
  context.ui.on('real-go', async () => {
    context.ui.close('real-intro');
    await requestCompass();
    context.setRealMode(true);
    if (thenStart) context.startMission();
  });
}
/**
 * Updates real from the active simulation.
 * @param {*} context - context.
 * @param {*} dt - dt.
 * @returns {*} Operation result, when applicable.
 */
export function updateReal(context, dt) {
  let uiStatus;
  if (context.real.error) uiStatus = `⚠ ${context.real.error}`;
  else if (!context.real.fix) uiStatus = `📍 ${context.real.waiting ?? strings.real.locating}`;
  else if (!insideWorld(data.bounds, context.real.fix.x, context.real.fix.z)) {
    const nearest = Math.min(
      ...context
        .activeStations()
        .map((s) => Math.hypot(s.x - context.real.fix.x, s.z - context.real.fix.z)),
    );
    uiStatus = strings.real.outOfArea(formatDistance(nearest));
  } else
    uiStatus = strings.real.accuracy(
      fa(Math.round(context.real.fix.accuracy)),
      context.real.fix.speed > MAX_WALKING_SPEED,
    );
  context.ui.patch('gps-status', {
    text: uiStatus,
  });
  if (!context.real.fix || !insideWorld(data.bounds, context.real.fix.x, context.real.fix.z)) {
    context.player.speed = 0;
    return;
  }
  // Walk the avatar towards the (building-free) GPS point instead of teleporting it.
  const target = resolveCircle(context.collision, context.real.fix.x, context.real.fix.z, 1);
  const dx = target.x - context.player.x,
    dz = target.z - context.player.z,
    d = Math.hypot(dx, dz);
  if (d > 150)
    Object.assign(context.player, {
      x: target.x,
      z: target.z,
    });
  const speed = d > 0.5 ? Math.min(8, Math.max(1.2, d * 1.5)) : 0;
  context.player.speed += (speed - context.player.speed) * Math.min(1, dt * 6);
  if (d > 0.5) {
    const step = Math.min(d, context.player.speed * dt);
    context.player.x += (dx / d) * step;
    context.player.z += (dz / d) * step;
  }
  const want = context.real.heading ?? (d > 0.5 ? Math.atan2(-dz, dx) : context.player.heading);
  // Stable mode also calms the compass, which jitters near cars and metal.
  context.player.heading +=
    Math.atan2(Math.sin(want - context.player.heading), Math.cos(want - context.player.heading)) *
    Math.min(1, dt * (context.stableMode ? 2 : 5));
  context.player.gait += dt * context.player.speed * 1.9;
}

// ---------- Loop ----------
