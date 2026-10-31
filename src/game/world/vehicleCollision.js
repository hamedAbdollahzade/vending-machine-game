// Oriented-box collisions between vehicles, so two bodies only touch when their outlines really
// meet. A car can therefore pass through any gap it actually fits, without slowing down.

/**
 * Builds the footprint box of a vehicle on the ground plane.
 * @param {{x: number, z: number, heading: number}} pose - Centre and heading (Three rotation.y).
 * @param {{halfLength: number, halfWidth: number}} size - Half extents along and across the body.
 * @returns {object} Box with centre, forward/side unit axes and half extents.
 */
export function vehicleBox({ x, z, heading }, { halfLength, halfWidth }) {
  return {
    x,
    z,
    // Heading h faces (cos h, -sin h); the side axis is that rotated by 90°.
    forward: { x: Math.cos(heading), z: -Math.sin(heading) },
    side: { x: Math.sin(heading), z: Math.cos(heading) },
    halfLength,
    halfWidth,
  };
}

/**
 * Half the length of a box's shadow on an axis.
 * @param {object} box - Box from vehicleBox.
 * @param {{x: number, z: number}} axis - Unit axis.
 * @returns {number} Projected radius.
 */
function projectedRadius(box, axis) {
  const along = Math.abs(box.forward.x * axis.x + box.forward.z * axis.z),
    across = Math.abs(box.side.x * axis.x + box.side.z * axis.z);
  return box.halfLength * along + box.halfWidth * across;
}

/**
 * Tests two boxes with the separating-axis theorem.
 * @param {object} a - The box to move.
 * @param {object} b - The box it hits.
 * @returns {{x: number, z: number, depth: number} | null} The shortest push that moves `a` out of
 * `b`, or null when they don't touch.
 */
export function boxOverlap(a, b) {
  const dx = b.x - a.x,
    dz = b.z - a.z;
  let best = null;
  for (const axis of [a.forward, a.side, b.forward, b.side]) {
    const distance = dx * axis.x + dz * axis.z;
    const depth = projectedRadius(a, axis) + projectedRadius(b, axis) - Math.abs(distance);
    // One gap on any axis means the boxes are apart.
    if (depth <= 0) return null;
    if (best && depth >= best.depth) continue;
    const away = distance > 0 ? -1 : 1;
    best = { x: axis.x * away * depth, z: axis.z * away * depth, depth };
  }
  return best;
}

/**
 * Pushes a walking circle (the player) out of a box.
 * @param {object} box - Box from vehicleBox.
 * @param {{x: number, z: number}} point - Circle centre.
 * @param {number} radius - Circle radius.
 * @returns {{x: number, z: number} | null} The corrected centre, or null when there is no contact.
 */
export function circleOutOfBox(box, point, radius) {
  const dx = point.x - box.x,
    dz = point.z - box.z;
  const along = dx * box.forward.x + dz * box.forward.z,
    across = dx * box.side.x + dz * box.side.z;
  const nearAlong = Math.max(-box.halfLength, Math.min(box.halfLength, along)),
    nearAcross = Math.max(-box.halfWidth, Math.min(box.halfWidth, across));
  const gapAlong = along - nearAlong,
    gapAcross = across - nearAcross,
    gap = Math.hypot(gapAlong, gapAcross);
  if (gap >= radius) return null;
  if (gap > 0) {
    const push = (radius - gap) / gap;
    return toWorld(box, along + gapAlong * push, across + gapAcross * push);
  }
  // The centre is inside the box: leave through the nearest side.
  const outAlong = box.halfLength + radius - Math.abs(along),
    outAcross = box.halfWidth + radius - Math.abs(across);
  if (outAlong < outAcross) return toWorld(box, along + Math.sign(along || 1) * outAlong, across);
  return toWorld(box, along, across + Math.sign(across || 1) * outAcross);
}

/**
 * Converts box-local coordinates back to world space.
 * @param {object} box - Box from vehicleBox.
 * @param {number} along - Distance along the forward axis.
 * @param {number} across - Distance along the side axis.
 * @returns {{x: number, z: number}} World position.
 */
function toWorld(box, along, across) {
  return {
    x: box.x + box.forward.x * along + box.side.x * across,
    z: box.z + box.forward.z * along + box.side.z * across,
  };
}
