import { addPolygon, resolveCircle } from '../world/collision.js';
import { createState } from '../economy/gameState.js';
import { createPayment } from '../economy/payment.js';
import { createVendingMachine } from '../models/vending.js';
import { resetGarage } from './garage.js';
import { COMPANY } from '../../config/company.js';

// Brand colours for materials and canvas drawings.
const BRAND = COMPANY.colors;
/**
 * Runs the place station operation for this subsystem.
 * @param {*} context - context.
 * @param {*} def - def.
 * @param {*} pos - pos.
 * @param {*} rot - rot.
 * @returns {*} Operation result, when applicable.
 */
export function placeStation(context, def, pos, rot) {
  const model = createVendingMachine(def);
  model.group.position.set(pos.x, 0, pos.z);
  model.group.rotation.y = rot;
  context.scene.add(model.group);
  addPolygon(
    context.collision,
    [
      [-1, -0.6],
      [1, -0.6],
      [1, 0.6],
      [-1, 0.6],
    ].flatMap(([lx, lz]) => {
      const p = context.rotateLocal(lx, lz, rot);
      return [pos.x + p.x, pos.z + p.z];
    }),
  );
  const front = context.rotateLocal(0, 1.9, rot);
  return {
    def,
    model,
    x: pos.x,
    z: pos.z,
    rot,
    front: {
      x: pos.x + front.x,
      z: pos.z + front.z,
    },
  };
}
/**
 * Updates reach circles from the active simulation.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export function updateReachCircles(context) {
  const radius = context.reachRadius(),
    objective = context.real.on ? context.objectiveStation() : null;
  for (const s of context.stations) {
    s.reach.visible = context.real.on;
    if (!context.real.on) continue;
    s.reach.scale.setScalar(radius);
    s.reach.material.color.set(s === objective ? '#f2c94c' : BRAND.primary);
  }
}
// GPS test points only take part while real-world mode is on.
/**
 * Runs the reset operation for this subsystem.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export function reset(context) {
  context.state = createState();
  context.payment = createPayment();
  // The family starts in the factory yard, facing the engineering office.
  const spot = resolveCircle(
    context.collision,
    context.factory.start.x,
    context.factory.start.z,
    1,
  );
  context.player = {
    x: spot.x,
    z: spot.z,
    heading: context.factory.start.heading,
    speed: 0,
    gait: 0,
  };
  resetGarage(context);
  context.factory.reset();
  for (const t of context.factory.talks) t.done = false;
  context.mode = 'walk';
  // Camera yaw: the camera sits at target + (sin yaw, cos yaw) * distance, so it looks along (-sin, -cos).
  context.cam = {
    yaw: Math.atan2(-Math.cos(context.player.heading), Math.sin(context.player.heading)),
    pitch: 0.32,
    distance: 5.5,
    lastMouse: -10,
  };
  context.waypoint = null;
  context.route = null;
  context.routeTimer = 0;
  context.deliveryTimer = 0;
  context.ended = false;
  context.hints = {
    closed: false,
    car: false,
  };
  Object.assign(context.guideState, {
    station: null,
    t: 0,
    greeted: new Set(),
    arrived: 0,
  });
  context.ui.patch('payment', {
    hidden: true,
  });
  for (const s of context.stations) {
    s.model.delivery.visible = s.model.card.visible = false;
    s.model.flap.rotation.x = 0;
  }
  for (const id of ['shop', 'map-dialog', 'end', 'showroom', 'machine-card', 'about-board'])
    context.ui.close(id);
  context.keys.clear();
  context.refreshHUD();
}
