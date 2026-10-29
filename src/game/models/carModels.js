import * as THREE from 'three';

// Detailed vehicles for the family and the factory, plus the shared helpers luxuryCars.js builds
// on. All face local +X and sit on y = 0, like createCarModel in traffic.js; `wheels` lists rear wheels first, then the two front (steering) ones.

/**
 * Runs the mat operation for this subsystem.
 * @param {*} color - color.
 * @param {*} extra - extra.
 * @returns {*} Operation result, when applicable.
 */
export const mat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.45,
    ...extra,
  });

// A side profile (x along the car, y up) extruded across its width, with rounded edges.
/**
 * Runs the extrude profile operation for this subsystem.
 * @param {*} points - points.
 * @param {*} width - width.
 * @param {*} material - material.
 * @param {*} bevel - bevel.
 * @returns {*} Operation result, when applicable.
 */
export function extrudeProfile(points, width, material, bevel = 0.1) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: width - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelSegments: 3,
    curveSegments: 6,
  });
  geometry.translate(0, 0, -(width - bevel * 2) / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

// Lower-body outline with wheel arches cut around the wheel centres.
/**
 * Runs the body outline operation for this subsystem.
 * @param {*} front - front.
 * @param {*} rear - rear.
 * @param {*} arches - arches.
 * @param {*} radius - radius.
 * @param {*} top - top.
 * @returns {*} Operation result, when applicable.
 */
export function bodyOutline(front, rear, arches, radius, top) {
  const shape = new THREE.Shape();
  shape.moveTo(rear[0][0], rear[0][1]);
  const bottom = 0.3;
  // Underside from the rear towards the front, arching over each wheel.
  for (const ax of [...arches].sort((a, b) => a - b)) {
    shape.lineTo(ax - radius, bottom);
    shape.absarc(ax, 0.36, radius, Math.PI + 0.14, -0.14, true);
  }
  for (const [x, y] of front) shape.lineTo(x, y);
  for (const [x, y] of top) shape.lineTo(x, y);
  for (const [x, y] of rear.slice(1).reverse()) shape.lineTo(x, y);
  return shape;
}
/**
 * Measures a freshly built model (not yet placed or parented) on the ground plane.
 * @param {THREE.Group} group - Model group facing local +X.
 * @returns {{halfLength: number, halfWidth: number}} Half extents along and across the body.
 */
export function measureFootprint(group) {
  const size = new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());
  return { halfLength: size.x / 2, halfWidth: size.z / 2 };
}
/**
 * Runs the add wheels operation for this subsystem.
 * @param {*} group - group.
 * @param {*} positions - positions.
 * @param {*} radius - radius.
 * @param {*} tyreWidth - tyre Width.
 * @param {*} rimColor - rim Color.
 * @param {*} spokes - spokes.
 * @returns {*} Operation result, when applicable.
 */
export function addWheels(group, positions, radius, tyreWidth, rimColor = '#c9cdd1', spokes = 5) {
  const tyre = mat('#151719', {
      roughness: 0.9,
    }),
    rim = mat(rimColor, {
      metalness: 0.85,
      roughness: 0.25,
    }),
    brake = mat('#3a3d40', {
      metalness: 0.6,
    });
  const wheels = [];
  for (const [x, z] of positions) {
    const wheel = new THREE.Group();
    wheel.position.set(x, radius, z);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, tyreWidth, 24), tyre);
    t.rotation.x = Math.PI / 2;
    t.castShadow = true;
    wheel.add(t);
    const side = Math.sign(z);
    const face = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.68, radius * 0.68, 0.02, 24),
      brake,
    );
    face.rotation.x = Math.PI / 2;
    face.position.z = side * tyreWidth * 0.44;
    wheel.add(face);
    for (let i = 0; i < spokes; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(radius * 1.25, radius * 0.16, 0.04), rim);
      spoke.position.z = side * tyreWidth * 0.5;
      spoke.rotation.z = (i * Math.PI) / spokes;
      wheel.add(spoke);
    }
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.2, radius * 0.2, 0.05, 12),
      rim,
    );
    hub.rotation.x = Math.PI / 2;
    hub.position.z = side * tyreWidth * 0.52;
    wheel.add(hub);
    group.add(wheel);
    wheels.push(wheel);
  }
  return wheels;
}

/**
 * Sports saloon in the style of a German executive car: long bonnet, twin kidney grille,
 * ring-shaped "angel eye" headlights, kinked rear side window and five-spoke rims. 4.7 m long.
 * No manufacturer badges.
 */
export function createSportSedan(color = '#1d3f78') {
  const group = new THREE.Group();
  const paint = mat(color, {
      metalness: 0.7,
      roughness: 0.28,
    }),
    glass = mat('#0f1a22', {
      metalness: 0.7,
      roughness: 0.08,
    });
  const black = mat('#0b0c0d', {
      roughness: 0.6,
    }),
    chrome = mat('#d8dcdf', {
      metalness: 0.95,
      roughness: 0.15,
    });
  const W = 1.86;
  const outline = bodyOutline(
    [
      [2.24, 0.3],
      [2.36, 0.42],
      [2.38, 0.62],
      [2.28, 0.78],
    ],
    [
      [-2.3, 0.3],
      [-2.36, 0.55],
      [-2.3, 0.86],
      [-2.12, 0.97],
    ],
    [-1.42, 1.43],
    0.41,
    [
      [1.9, 0.86],
      [0.95, 1.0],
      [-1.2, 1.0],
      [-1.6, 0.99],
    ],
  );
  const bodyGeometry = new THREE.ExtrudeGeometry(outline, {
    depth: W - 0.2,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.08,
    bevelSegments: 3,
    curveSegments: 10,
  });
  bodyGeometry.translate(0, 0, -(W - 0.2) / 2);
  const body = new THREE.Mesh(bodyGeometry, paint);
  body.castShadow = body.receiveShadow = true;
  group.add(body);
  // Greenhouse: windscreen, roof and the fast rear window, narrower than the body.
  const cabin = extrudeProfile(
    [
      [0.95, 0.98],
      [0.05, 1.39],
      [-0.9, 1.41],
      [-1.62, 1.0],
      [-1.5, 0.98],
    ],
    1.5,
    glass,
    0.08,
  );
  group.add(cabin);
  const roof = extrudeProfile(
    [
      [0.0, 1.37],
      [-0.88, 1.39],
      [-1.0, 1.32],
      [0.12, 1.32],
    ],
    1.36,
    paint,
    0.06,
  );
  roof.position.y = 0.045;
  group.add(roof);
  const pillar = new THREE.ShapeGeometry(
    new THREE.Shape([
      new THREE.Vector2(-1.05, 1.0),
      new THREE.Vector2(-1.55, 1.0),
      new THREE.Vector2(-1.08, 1.33),
      new THREE.Vector2(-0.96, 1.33),
      new THREE.Vector2(-1.18, 1.12),
    ]),
  );
  const pillarPaint = paint.clone();
  pillarPaint.side = THREE.DoubleSide;
  // Pillars and the kinked C-pillar ("Hofmeister" kink) on both sides.
  for (const side of [-1, 1]) {
    const z = side * 0.72;
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.4, 0.04), black);
    b.position.set(-0.35, 1.18, z);
    group.add(b);
    const c = new THREE.Mesh(pillar, pillarPaint);
    c.position.z = z + side * 0.035;
    group.add(c);
    // Door handles, mirror and the chrome window line.
    for (const x of [0.15, -0.75]) {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.03), chrome);
      handle.position.set(x, 0.9, side * 0.94);
      group.add(handle);
    }
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.2), paint);
    mirror.position.set(0.78, 1.05, side * 1.0);
    group.add(mirror);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.025, 0.02), chrome);
    trim.position.set(-0.3, 0.985, side * 0.76);
    group.add(trim);
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 0.04), black);
    skirt.position.set(0, 0.34, side * 0.93);
    group.add(skirt);
  }
  // Twin kidney grille with chrome surrounds.
  for (const side of [-1, 1]) {
    const surround = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.3), chrome);
    surround.position.set(2.46, 0.66, side * 0.18);
    group.add(surround);
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.25), black);
    grille.position.set(2.47, 0.66, side * 0.18);
    group.add(grille);
    for (let i = 0; i < 5; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.15, 0.012), chrome);
      bar.position.set(2.47, 0.66, side * 0.18 + (i - 2) * 0.05);
      group.add(bar);
    }
  }
  // Headlights with two light rings each, and slim L-shaped tail lights.
  const ring = mat('#eaf6ff', {
    emissive: '#cfe9ff',
    emissiveIntensity: 1.6,
  });
  const tail = mat('#9e1410', {
    emissive: '#e0261c',
    emissiveIntensity: 0.9,
  });
  for (const side of [-1, 1]) {
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.44), black);
    housing.position.set(2.42, 0.72, side * 0.6);
    group.add(housing);
    for (const dz of [-0.1, 0.1]) {
      const eye = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 18), ring);
      eye.rotation.y = Math.PI / 2;
      eye.position.set(2.48, 0.72, side * 0.6 + dz);
      group.add(eye);
    }
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.42), tail);
    tl.position.set(-2.45, 0.82, side * 0.62);
    group.add(tl);
    const tlSide = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.05), tail);
    tlSide.position.set(-2.2, 0.82, side * 0.9);
    group.add(tlSide);
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 12), chrome);
    exhaust.rotation.z = Math.PI / 2;
    exhaust.position.set(-2.44, 0.36, side * 0.45);
    group.add(exhaust);
  }
  const lowerGrille = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 1.2), black);
  lowerGrille.position.set(2.45, 0.42, 0);
  group.add(lowerGrille);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.11, 0.5), mat('#f4f4f0'));
  plate.position.set(2.47, 0.5, 0);
  group.add(plate);
  const wheels = addWheels(
    group,
    [
      [-1.42, -0.82],
      [-1.42, 0.82],
      [1.43, -0.82],
      [1.43, 0.82],
    ],
    0.36,
    0.26,
    '#b8bcc0',
    5,
  );
  return {
    group,
    wheels,
  };
}

/**
 * Flatbed delivery lorry with side rails. `bed` is a group on the load floor (local +X towards the
 * cab, origin at the bed's centre) where cargo is placed. 8 m long.
 */
export function createTruck(color = '#e9eef0') {
  const group = new THREE.Group();
  const paint = mat(color, {
      metalness: 0.35,
      roughness: 0.4,
    }),
    glass = mat('#14212b', {
      metalness: 0.6,
      roughness: 0.1,
    });
  const black = mat('#1b1d1f', {
      roughness: 0.7,
    }),
    teal = mat('#0b8f88', {
      metalness: 0.3,
      roughness: 0.4,
    });
  /**
   * Runs the box operation for this subsystem.
   * @param {*} w - w.
   * @param {*} h - h.
   * @param {*} d - d.
   * @param {*} m - m.
   * @param {*} x - x.
   * @param {*} y - y.
   * @param {*} z - z.
   * @param {*} parent - parent.
   * @returns {*} Operation result, when applicable.
   */
  const box = (w, h, d, m, x, y, z, parent = group) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  // Cab over the front axle.
  box(1.9, 2.1, 2.3, paint, 2.95, 1.95, 0);
  box(0.05, 0.9, 2.0, glass, 3.91, 2.35, 0);
  for (const side of [-1, 1]) box(1.0, 0.7, 0.04, glass, 3.1, 2.4, side * 1.16);
  box(0.08, 0.3, 2.2, teal, 3.92, 1.35, 0);
  box(0.25, 0.35, 2.36, black, 3.95, 0.85, 0);
  const lamp = mat('#eaf6ff', {
    emissive: '#cfe9ff',
    emissiveIntensity: 1,
  });
  for (const side of [-1, 1]) {
    box(0.06, 0.16, 0.3, lamp, 3.98, 1.1, side * 0.9);
    box(0.3, 0.3, 0.08, black, 3.4, 2.7, side * 1.25);
  }
  // Chassis and the flatbed with low side rails.
  box(7.6, 0.3, 1.0, black, 0, 0.75, 0);
  box(
    5.9,
    0.14,
    2.4,
    mat('#6b5a45', {
      roughness: 0.9,
    }),
    -1.05,
    1.0,
    0,
  );
  for (const side of [-1, 1]) box(5.9, 0.5, 0.06, teal, -1.05, 1.32, side * 1.19);
  box(0.06, 0.5, 2.4, teal, -4.0, 1.32, 0);
  box(0.1, 1.6, 2.4, black, 1.9, 1.85, 0);
  for (const side of [-1, 1])
    box(
      0.1,
      0.22,
      0.26,
      mat('#9e1410', {
        emissive: '#c4241b',
        emissiveIntensity: 0.6,
      }),
      -4.02,
      0.82,
      side * 0.95,
    );
  const bed = new THREE.Group();
  bed.position.set(-1.05, 1.07, 0);
  group.add(bed);
  const wheels = addWheels(
    group,
    [
      [-2.9, -1.0],
      [-2.9, 1.0],
      [2.9, -1.0],
      [2.9, 1.0],
    ],
    0.5,
    0.38,
    '#c2c6c9',
    8,
  );
  return {
    group,
    wheels,
    bed,
  };
}
