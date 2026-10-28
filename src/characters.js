import * as THREE from 'three';

// Lightweight articulated characters; all coordinates below are in the group.
// createFamily() builds the father and child; createFamily({robot: true}) builds the Robot Market guide alone.
export function createFamily({ robot: robotOnly = false } = {}) {
  const group = new THREE.Group();
  const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.82 });
  const skin = mat('#edbd98'),
    hair = mat('#49382d'),
    shoes = mat('#273c36');

  function shape(parent, geometry, material, position) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(...position);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  function sphere(parent, r, material, pos, scale = [1, 1, 1]) {
    const m = shape(parent, new THREE.SphereGeometry(r, 16, 12), material, pos);
    m.scale.set(...scale);
    return m;
  }

  function segment(parent, a, b, r, material) {
    const mesh = shape(parent, new THREE.CylinderGeometry(r, r, 1, 10), material, [0, 0, 0]);
    return { mesh, a, b };
  }

  function updateSegment(bone, a, b) {
    const delta = b.clone().sub(a);
    bone.mesh.position.copy(a).add(b).multiplyScalar(0.5);
    bone.mesh.scale.y = delta.length();
    bone.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  }

  // Procedural Robot Market mascot: a hovering guide that follows the father and child.
  function makeRobot(z) {
    const scale = 0.69,
      root = new THREE.Group(),
      torso = new THREE.Group();
    root.name = 'robot-market-mascot';
    root.position.z = z;
    group.add(root);
    root.add(torso);
    const teal = new THREE.MeshStandardMaterial({
      color: '#079f98',
      metalness: 0.4,
      roughness: 0.28,
    });
    const white = new THREE.MeshStandardMaterial({
      color: '#edf6f4',
      metalness: 0.22,
      roughness: 0.32,
    });
    const joint = new THREE.MeshStandardMaterial({
      color: '#102b30',
      metalness: 0.5,
      roughness: 0.35,
    });
    const glow = new THREE.MeshStandardMaterial({
      color: '#c6f7ff',
      emissive: '#23bcff',
      emissiveIntensity: 2.5,
      roughness: 0.2,
    });
    const visor = new THREE.MeshStandardMaterial({
      color: '#020d16',
      metalness: 0.5,
      roughness: 0.16,
    });
    sphere(torso, 0.25, teal, [0, 0.76, 0], [1, 0.65, 0.75]);
    sphere(torso, 0.31, white, [0, 0.97, 0], [1, 1.05, 0.72]);
    for (const side of [-1, 1]) sphere(torso, 0.17, teal, [side * 0.24, 1.03, -0.04], [0.55, 1, 1]);
    shape(torso, new THREE.CylinderGeometry(0.09, 0.09, 0.12, 12), joint, [0, 1.27, 0]);
    const head = new THREE.Group();
    head.position.y = 1.61;
    torso.add(head);
    sphere(head, 0.43, teal, [0, 0, 0], [1.12, 0.91, 0.88]);
    sphere(head, 0.4, white, [0, -0.015, 0.12], [1.12, 0.86, 0.77]);
    sphere(head, 0.35, visor, [0, -0.015, 0.255], [1.13, 0.83, 0.48]);
    const eyes = [];
    function arc(parent, radius, thickness, pos, rotation = 0, material = glow) {
      const line = shape(
        parent,
        new THREE.TorusGeometry(radius, thickness, 8, 24, Math.PI),
        material,
        pos,
      );
      line.rotation.z = rotation;
      return line;
    }
    for (const side of [-1, 1]) {
      eyes.push(arc(head, 0.065, 0.016, [side * 0.16, 0.025, 0.423]));
      const ear = shape(head, new THREE.CylinderGeometry(0.14, 0.14, 0.085, 24), joint, [
        side * 0.47,
        0,
        0,
      ]);
      ear.rotation.z = Math.PI / 2;
      const ring = shape(head, new THREE.TorusGeometry(0.105, 0.012, 8, 24), glow, [
        side * 0.518,
        0,
        0,
      ]);
      ring.rotation.y = Math.PI / 2;
      sphere(head, 0.12, teal, [side * 0.49, 0, 0], [0.4, 1, 1]);
    }
    arc(head, 0.075, 0.016, [0, -0.085, 0.425], Math.PI);
    sphere(head, 0.1, teal, [0, 0.38, 0], [1, 0.55, 1]);
    shape(head, new THREE.CylinderGeometry(0.017, 0.022, 0.18, 10), teal, [0, 0.49, 0]);
    sphere(head, 0.055, teal, [0, 0.6, 0]);
    // Draw the chest mark as a texture so it remains attached to the 3D body.
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const c = canvas.getContext('2d');
      if (c) {
        c.strokeStyle = '#102b30';
        c.fillStyle = '#102b30';
        c.lineWidth = 12;
        c.lineJoin = 'round';
        c.beginPath();
        c.moveTo(65, 40);
        c.lineTo(82, 40);
        c.lineTo(99, 110);
        c.lineTo(170, 110);
        c.lineTo(186, 58);
        c.lineTo(89, 58);
        c.stroke();
        for (const x of [111, 162]) {
          c.beginPath();
          c.arc(x, 130, 9, 0, Math.PI * 2);
          c.fill();
        }
        c.textAlign = 'center';
        c.font = 'bold 34px sans-serif';
        c.fillText('ROBOT', 128, 181);
        c.fillText('MARKET', 128, 218);
        shape(
          torso,
          new THREE.PlaneGeometry(0.31, 0.31),
          new THREE.MeshBasicMaterial({
            map: new THREE.CanvasTexture(canvas),
            transparent: true,
            depthWrite: false,
          }),
          [0, 0.99, 0.224],
        );
      }
    }
    const legs = [-1, 1].map((side) => {
      const hip = new THREE.Group();
      hip.position.set(side * 0.15, 0.65, 0);
      root.add(hip);
      sphere(hip, 0.09, joint, [0, 0, 0]);
      shape(hip, new THREE.CapsuleGeometry(0.095, 0.12, 4, 12), white, [0, -0.12, 0]);
      const knee = new THREE.Group();
      knee.position.y = -0.25;
      hip.add(knee);
      sphere(knee, 0.105, teal, [0, 0, 0.035]);
      shape(knee, new THREE.CapsuleGeometry(0.1, 0.12, 4, 12), white, [0, -0.13, 0]);
      const foot = sphere(knee, 0.13, teal, [0, -0.29, 0.07], [1, 0.65, 1.6]);
      sphere(knee, 0.13, joint, [0, -0.34, 0.07], [1.06, 0.22, 1.65]);
      return { hip, knee, foot };
    });
    const arms = [-1, 1].map(() => ({
      upper: segment(group, null, null, 0.09, teal),
      lower: segment(group, null, null, 0.085, white),
      hand: sphere(group, 0.09, joint, [0, 0, 0], [1, 1.1, 1]),
    }));
    return { root, torso, head, legs, arms, scale, z, eyes };
  }

  function makePerson(isChild, z) {
    const scale = isChild ? 0.69 : 1.05,
      root = new THREE.Group();
    root.position.z = z;
    group.add(root);
    const torso = new THREE.Group();
    root.add(torso);
    const cloth = mat(isChild ? '#d98150' : '#e4c695'),
      pants = mat(isChild ? '#527463' : '#496474');
    // Tapered jacket, hips and neck replace the single rounded toy-like body.
    shape(torso, new THREE.CylinderGeometry(0.255 * scale, 0.22 * scale, 0.62 * scale, 16), cloth, [
      0,
      1.2 * scale,
      0,
    ]).scale.z = 0.72;
    sphere(torso, 0.23, pants, [0, 0.88 * scale, 0], [scale, 0.55 * scale, 0.72 * scale]);
    shape(torso, new THREE.CylinderGeometry(0.075 * scale, 0.09 * scale, 0.18 * scale, 12), skin, [
      0,
      1.59 * scale,
      0,
    ]);
    const seam = shape(
      torso,
      new THREE.BoxGeometry(0.014 * scale, 0.5 * scale, 0.014 * scale),
      mat('#bda77f'),
      [0, 1.2 * scale, 0.19 * scale],
    );
    for (const side of [-1, 1]) {
      const collar = shape(
        torso,
        new THREE.BoxGeometry(0.12 * scale, 0.09 * scale, 0.025 * scale),
        cloth,
        [side * 0.07 * scale, 1.49 * scale, 0.15 * scale],
      );
      collar.rotation.z = side * 0.4;
    }
    const head = new THREE.Group();
    head.position.y = 1.77 * scale;
    torso.add(head);
    head.scale.setScalar(isChild ? 0.9 : 0.77);
    const eyes = [];
    sphere(head, 0.27 * scale, skin, [0, 0, 0]);
    sphere(head, 0.275 * scale, hair, [0, 0.11 * scale, -0.035 * scale], [1, 0.65, 1]);
    sphere(head, 0.058 * scale, skin, [0, -0.02 * scale, 0.25 * scale]);
    for (const side of [-1, 1]) {
      sphere(head, 0.06 * scale, skin, [side * 0.26 * scale, 0, 0]);
      sphere(
        head,
        0.037 * scale,
        mat('#f6f1e7'),
        [side * 0.09 * scale, 0.03 * scale, 0.241 * scale],
        [1, 0.65, 0.5],
      );
      const eye = sphere(
        head,
        0.022 * scale,
        shoes,
        [side * 0.09 * scale, 0.03 * scale, 0.258 * scale],
        [0.8, 1, 0.45],
      );
      eyes.push(eye);
      const brow = shape(
        head,
        new THREE.BoxGeometry(0.075 * scale, 0.015 * scale, 0.015 * scale),
        hair,
        [side * 0.09 * scale, 0.087 * scale, 0.237 * scale],
      );
      brow.rotation.z = side * -0.08;
      sphere(head, 0.04 * scale, mat('#d79379'), [
        side * 0.15 * scale,
        -0.055 * scale,
        0.215 * scale,
      ]);
    }
    const smile = shape(
      head,
      new THREE.TorusGeometry(0.068 * scale, 0.012 * scale, 6, 14, Math.PI),
      shoes,
      [0, -0.075 * scale, 0.252 * scale],
    );
    smile.rotation.z = Math.PI;
    if (isChild) {
      sphere(head, 0.29 * scale, mat('#e8b857'), [0, 0.18 * scale, 0], [1, 0.5, 1]);
      shape(head, new THREE.BoxGeometry(0.55 * scale, 0.04 * scale, 0.34 * scale), mat('#e8b857'), [
        0,
        0.13 * scale,
        0.12 * scale,
      ]);
    } else {
      sphere(torso, 0.22, mat('#a77950'), [0, 1.2 * scale, -0.24 * scale], [1, 1.2, 0.5]);
    }
    const legs = [-1, 1].map((side) => {
      const hip = new THREE.Group();
      hip.position.set(side * 0.15 * scale, 0.83 * scale, 0);
      root.add(hip);
      shape(hip, new THREE.CapsuleGeometry(0.09 * scale, 0.23 * scale, 4, 10), pants, [
        0,
        -0.16 * scale,
        0,
      ]);
      const knee = new THREE.Group();
      knee.position.y = -0.34 * scale;
      hip.add(knee);
      shape(knee, new THREE.CapsuleGeometry(0.08 * scale, 0.25 * scale, 4, 10), pants, [
        0,
        -0.16 * scale,
        0,
      ]);
      const foot = shape(knee, new THREE.SphereGeometry(0.12 * scale, 12, 8), shoes, [
        0,
        -0.32 * scale,
        0.065 * scale,
      ]);
      foot.scale.set(0.85, 0.65, 1.5);
      return { hip, knee, foot };
    });
    const arms = [-1, 1].map(() => ({
      upper: segment(group, null, null, 0.072 * scale, cloth),
      lower: segment(group, null, null, 0.061 * scale, skin),
      hand: sphere(group, 0.075 * scale, skin, [0, 0, 0]),
    }));
    return { root, torso, head, legs, arms, scale, z, eyes };
  }

  const father = robotOnly ? null : makePerson(false, -0.45),
    child = robotOnly ? null : makePerson(true, 0.45);
  const robot = robotOnly ? makeRobot(0) : null;
  const actors = robotOnly ? [robot] : [father, child];

  // The group faces +X; `facing` is the actors' own yaw inside it (π/2 = along +X).
  // `wave` raises the robot's right hand, `point` stretches it forward.
  function update({
    time,
    gait,
    moving,
    facing = Math.PI / 2,
    shopping,
    delivery,
    finished,
    talking = false,
    wave = false,
    point = false,
    dt = 1 / 60,
  }) {
    actors.forEach((actor, index) => {
      const blend = 1 - Math.exp(-dt * 7),
        isRobot = actor === robot;
      actor.root.position.x = THREE.MathUtils.lerp(
        actor.root.position.x,
        finished ? (index === 0 ? -0.55 : 0.55) : shopping && !isRobot ? [-0.55, 0.25][index] : 0,
        blend,
      );
      // The robot hovers; it bobs faster while it is speaking.
      const hover = isRobot ? 0.35 + Math.sin(time * (talking ? 6 : 2.2)) * 0.07 : 0;
      actor.root.position.y = THREE.MathUtils.lerp(
        actor.root.position.y,
        finished ? -0.6 * actor.scale : hover,
        isRobot ? 1 : blend,
      );
      actor.root.position.z = finished ? 0 : actor.z;
      actor.root.rotation.y = facing;
      const bob = moving ? Math.abs(Math.sin(gait)) * 0.022 : Math.sin(time * 2) * 0.006;
      actor.torso.position.y = bob;
      actor.torso.rotation.z = moving ? Math.sin(gait) * 0.018 : 0;
      const blinking = Math.sin(time * 1.3 + index) > 0.993;
      actor.eyes.forEach((eye) => (eye.scale.y = blinking ? 0.12 : 1));
      actor.head.rotation.y = shopping
        ? -0.65
        : isRobot
          ? Math.sin(time * 0.9) * 0.35
          : Math.sin(time * 0.7) * 0.06;
      actor.torso.rotation.x = delivery && actor === child ? 0.22 : 0;
      actor.legs.forEach((leg, i) => {
        const phase = gait + i * Math.PI;
        const stride = isRobot ? 0.08 : 0.34;
        leg.hip.rotation.x = finished ? -1.4 : moving ? Math.sin(phase) * stride : 0;
        leg.foot.rotation.x = moving ? Math.sin(phase + 0.5) * 0.12 : 0;
        leg.knee.rotation.x = finished
          ? 2.5
          : isRobot
            ? 0.25
            : moving
              ? Math.max(0, -Math.sin(phase)) * 0.5
              : 0.05;
      });
    });
    group.updateMatrixWorld(true);
    const toFamily = (actor, point) => point.applyMatrix4(actor.root.matrix).clone();
    const shoulder = (actor, side) =>
      toFamily(
        actor,
        new THREE.Vector3(
          side * 0.29 * actor.scale,
          (actor === robot ? 1.12 : 1.43) * actor.scale,
          0,
        ),
      );
    // With characters facing +X, father's left and child's right hands meet.
    const contact = new THREE.Vector3(0, 1.06, 0);
    actors.forEach((actor, index) =>
      actor.arms.forEach((arm, i) => {
        const side = i === 0 ? -1 : 1,
          inside = actor === father ? side === -1 : actor === child && side === 1;
        const a = shoulder(actor, side);
        let target;
        if (inside && !shopping && !finished) target = contact.clone();
        else if (actor === child && shopping && side === -1)
          target = new THREE.Vector3(0.5, delivery ? 0.65 : 1.1, -0.15);
        else if (actor === robot && side === 1 && wave)
          target = toFamily(actor, new THREE.Vector3(0.42, 1.62 + Math.sin(time * 9) * 0.07, 0.12));
        else if (actor === robot && side === 1 && point)
          target = toFamily(actor, new THREE.Vector3(0.3, 1.25, 0.62));
        else
          target = toFamily(
            actor,
            new THREE.Vector3(
              side * 0.34 * actor.scale,
              0.88 * actor.scale,
              moving ? Math.sin(gait + (i ? Math.PI : 0)) * 0.2 : 0,
            ),
          );
        const elbow = a
          .clone()
          .lerp(target, 0.5)
          .add(new THREE.Vector3(0.07, 0, inside ? 0 : 0.07));
        updateSegment(arm.upper, a, elbow);
        updateSegment(arm.lower, elbow, target);
        arm.hand.position.copy(target);
      }),
    );
  }

  update({ time: 0, gait: 0, moving: false });
  return { group, update };
}
