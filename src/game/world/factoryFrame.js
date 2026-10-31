import { FACTORY } from '../../constants/locations.js';

// The factory's local frame: u runs along the driveway towards the gate, v across it. Things placed
// in the yard outside the factory model (product samples, information boards) use it too.

/**
 * Projects factory-local coordinates into world metres.
 * @param {number} u - Position along the factory axis.
 * @param {number} v - Position across the factory axis.
 * @returns {{x: number, z: number}} World position.
 */
export function factoryToWorld(u, v) {
  return {
    x: FACTORY.center.x + FACTORY.axis.x * u - FACTORY.axis.z * v,
    z: FACTORY.center.z + FACTORY.axis.z * u + FACTORY.axis.x * v,
  };
}

/**
 * Collision outline of a rectangle in the factory frame.
 * @param {{u: number, v: number, halfU: number, halfV: number}} box - Centre and half sizes.
 * @returns {number[]} Flat world ring [x0, z0, x1, z1, …] for the collision world.
 */
export function factoryFootprint({ u, v, halfU, halfV }) {
  return [
    [-halfU, -halfV],
    [halfU, -halfV],
    [halfU, halfV],
    [-halfU, halfV],
  ].flatMap(([du, dv]) => Object.values(factoryToWorld(u + du, v + dv)));
}

// Rotation (Three rotation.y) that turns a model's local +X along the factory axis, so its local
// +Z faces +v.
export const FACTORY_ROTATION = Math.atan2(-FACTORY.axis.z, FACTORY.axis.x);
