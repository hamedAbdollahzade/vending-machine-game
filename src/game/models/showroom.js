import { FACTORY } from '../../constants/locations.js';
import { SHOWROOM_CATALOG, SHOWROOM_REACH } from '../../constants/showroomCatalog.js';
import { createVendingMachine } from './vending.js';
import { createFamily } from './characters.js';

/** Projects factory-local coordinates into the shared world metre system.
 * @param {number} u - Position along the factory axis.
 * @param {number} v - Position normal to the factory axis.
 * @returns {{x:number,z:number}} World position.
 */
function showroomPosition(u, v) {
  return {
    x: FACTORY.center.x + FACTORY.axis.x * u - FACTORY.axis.z * v,
    z: FACTORY.center.z + FACTORY.axis.z * u + FACTORY.axis.x * v,
  };
}

/** Creates one display-only sample, with a footprint and interaction position.
 * @param {{scene:object,model:object,index:number}} options - Sample placement context.
 * @returns {object} Sample data and model references.
 */
function createSample({ scene, model, index }) {
  const u = -12 + index * 4,
    v = -15;
  const machine = createVendingMachine({
    name: model.shortLabel,
    channels: model.channels,
    products: ['water', 'juice', 'biscuit', 'chocolate'],
  });
  const position = showroomPosition(u, v),
    front = showroomPosition(u, v + 2);
  machine.group.name = `showroom-${model.id}`;
  machine.group.position.set(position.x, 0, position.z);
  machine.group.rotation.y = Math.atan2(-FACTORY.axis.z, FACTORY.axis.x);
  machine.beacon.visible = machine.ring.visible = false;
  scene.add(machine.group);
  const footprint = [
    [-1, -0.6],
    [1, -0.6],
    [1, 0.6],
    [-1, 0.6],
  ].flatMap(([x, z]) => Object.values(showroomPosition(u + x, v + z)));
  return {
    model,
    machine,
    front,
    position,
    footprint,
  };
}

/** Builds the factory sample row and its robot host; it does not register retail stations.
 * @param {object} scene - Parent Three.js scene.
 * @returns {object} Display samples, nearest lookup, and host update.
 */
export function createShowroom(scene) {
  const samples = SHOWROOM_CATALOG.map((model, index) =>
    createSample({
      scene,
      model,
      index,
    }),
  );
  const host = createFamily({
    robot: true,
  });
  scene.add(host.group);
  host.group.visible = false;
  return {
    samples,
    nearest(player) {
      return (
        samples
          .map((sample) => ({
            sample,
            distance: Math.hypot(sample.front.x - player.x, sample.front.z - player.z),
          }))
          .filter((item) => item.distance < SHOWROOM_REACH)
          .sort((a, b) => a.distance - b.distance)[0]?.sample ?? null
      );
    },
    update({ player, time, dt, enabled, talking }) {
      const sample = this.nearest(player);
      host.group.visible = Boolean(sample && enabled);
      if (!sample || !enabled) return;
      host.group.position.set(sample.position.x - 1.5, 0, sample.position.z + 1.5);
      host.group.rotation.y = Math.atan2(
        -(player.z - host.group.position.z),
        player.x - host.group.position.x,
      );
      host.update({
        dt,
        time,
        gait: 0,
        moving: false,
        talking,
        wave: !talking,
        point: talking,
      });
    },
  };
}
