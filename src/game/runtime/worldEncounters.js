import * as THREE from 'three';
import { FACTORY } from '../../constants/locations.js';
import { isOpen } from '../economy/gameState.js';
import { strings } from '../../i18n/fa.js';
/**
 * Updates talks from the active simulation.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export // People in the factory say their lines once, when the family walks up to them.
function updateTalks(context) {
  if (context.mode !== 'walk' || context.real.on || context.lines.length > 2) return;
  for (const t of context.factory.talks) {
    if (t.done || (t.ready && !t.ready())) continue;
    const p = t.pos();
    if (Math.hypot(p.x - context.player.x, p.z - context.player.z) > t.radius) continue;
    t.done = true;
    for (const text of t.lines) context.say(t.speaker, text);
    return;
  }
}

// ---------- Robot guide ----------
// When the family walks up to a machine the robot pops out of it, greets them and explains what to
// do; when they leave it goes back inside. It is never a walking companion.
/**
 * Runs the greet operation for this subsystem.
 * @param {*} context - context.
 * @param {*} station - station.
 * @returns {*} Operation result, when applicable.
 */
export function greet(context, station) {
  const def = station.def,
    first = !context.guideState.greeted.has(def.id);
  context.guideState.greeted.add(def.id);
  if (def.id === 'factory' && first) {
    context.say('robot', strings.dialogue.robotHello, 'excited');
    context.say('robot', strings.dialogue.robotWelcome(FACTORY.name), 'happy');
    context.say('robot', strings.dialogue.robotFirstBuy, 'wink');
    context.say('robot', strings.dialogue.robotGoToPark, 'love');
    return;
  }
  if (!isOpen(def, context.state.minutes)) {
    context.say('robot', strings.dialogue.robotClosed(context.hoursText(def)), 'serious');
    return;
  }
  if (first) {
    context.say('robot', strings.dialogue.robotWelcomeBack(def.name), 'excited');
    context.say('robot', strings.dialogue.robotNote(def.note), 'happy');
  } else context.say('robot', strings.dialogue.robotAgain, 'wink');
}
/**
 * Updates guide from the active simulation.
 * @param {*} context - context.
 * @param {*} dt - dt.
 * @returns {*} Operation result, when applicable.
 */
export function updateGuide(context, dt) {
  const near =
    context.mode === 'walk'
      ? context.closestStation(
          context.player.x,
          context.player.z,
          Math.max(9, context.reachRadius()),
        )
      : null;
  // The robot only moves to another machine after it has gone back into the previous one.
  if (near && !context.guideState.station) context.guideState.station = near;
  const s = context.guideState.station,
    wasOut = context.guideOut();
  if (!s) return;
  context.guideState.t = THREE.MathUtils.clamp(
    context.guideState.t + (near === s ? dt : -dt) / 1.1,
    0,
    1,
  );
  if (context.guideOut() && !wasOut) {
    context.guideState.arrived = context.elapsed;
    context.greet(s);
    context.tone(990, 0.15);
    context.tone(1320, 0.2);
  }
  if (wasOut && near !== s) context.say('robot', strings.dialogue.robotBye, 'happy');
  if (!context.guideState.t) {
    context.guideState.station = null;
    context.guide.group.visible = false;
    return;
  }
  // From inside the machine front out to its left side (the card reader is on the right).
  const e = context.easeOutBack(context.guideState.t),
    from = {
      x: -0.2,
      y: 0.9,
      z: 0.2,
    },
    to = {
      x: -1.7,
      y: 0,
      z: 1.3,
    };
  const local = context.rotateLocal(
    from.x + (to.x - from.x) * e,
    from.z + (to.z - from.z) * e,
    s.rot,
  );
  context.guide.group.visible = true;
  context.guide.group.position.set(s.x + local.x, from.y + (to.y - from.y) * e, s.z + local.z);
  context.guide.group.scale.setScalar(0.15 + 0.85 * Math.min(1, e));
  // Face the family (the rig looks along its local +X).
  context.guide.group.rotation.y = Math.atan2(
    -(context.player.z - context.guide.group.position.z),
    context.player.x - context.guide.group.position.x,
  );
  if (!context.state.busy && context.payment.phase === 'idle')
    s.model.flap.rotation.x = context.guideState.t < 1 ? -1 : 0;
  context.guide.update({
    dt,
    time: context.elapsed,
    gait: 0,
    moving: false,
    talking: context.talking,
    wave: context.elapsed - context.guideState.arrived < 2.5 || !context.guideOut(),
    point: context.talking && context.guideOut(),
  });
}
/**
 * Updates hints from the active simulation.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export function updateHints(context) {
  const target = context.objectiveStation();
  if (target && !isOpen(target.def, context.state.minutes) && !context.hints.closed) {
    context.hints.closed = true;
    context.say(
      'robot',
      strings.dialogue.targetClosed(target.def.name, context.hoursText(target.def)),
    );
  }
  if (
    context.route &&
    context.route.length > 900 &&
    context.mode === 'walk' &&
    !context.hints.car
  ) {
    context.hints.car = true;
    context.say('father', strings.dialogue.longWay);
  }
}
