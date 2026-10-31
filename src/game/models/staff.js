import * as THREE from 'three';
import { textTexture } from './textures.js';
import { COMPANY } from '../../config/company.js';

// Brand colours for materials and canvas drawings.
const BRAND = COMPANY.colors;

// Factory staff. createPerson() builds one articulated office person (hoodie, suit, or manteau with
// a headscarf) that can stand, walk, sit and type. createCrew() draws the production-line workers
// as a handful of instanced meshes, so forty of them cost only a few draw calls.
// People face their local +Z; `root.rotation.y` turns them.

const materials = new Map();
/**
 * Runs the mat operation for this subsystem.
 * @param {*} color - color.
 * @param {*} extra - extra.
 * @returns {*} Operation result, when applicable.
 */
const mat = (color, extra = {}) => {
  const key = color + JSON.stringify(extra);
  if (!materials.has(key))
    materials.set(
      key,
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.8,
        ...extra,
      }),
    );
  return materials.get(key);
};
/**
 * Runs the part operation for this subsystem.
 * @param {*} parent - parent.
 * @param {*} geometry - geometry.
 * @param {*} material - material.
 * @param {*} x - x.
 * @param {*} y - y.
 * @param {*} z - z.
 * @returns {*} Operation result, when applicable.
 */
function part(parent, geometry, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

/**
 * outfit: 'hoodie' | 'suit' | 'manteau'. Colours: top (hoodie, jacket or manteau), bottom, skin,
 * hair, scarf (manteau only), tie (suit only, optional), glasses.
 */
export function createPerson({
  outfit = 'hoodie',
  top = '#222',
  bottom = '#2c3e5a',
  skin = '#e2b18e',
  hair = '#2a211c',
  scarf = '#3b3f6b',
  tie = null,
  glasses = false,
  shoes = '#f1f1f1',
} = {}) {
  const root = new THREE.Group();
  const pelvis = new THREE.Group();
  pelvis.position.y = 0.94;
  root.add(pelvis);
  const topMat = mat(top),
    bottomMat = mat(bottom),
    skinMat = mat(skin),
    hairMat = mat(hair);
  const shoeMat = mat(outfit === 'hoodie' ? shoes : '#1a1a1a');

  // Torso, neck and head.
  const torso = new THREE.Group();
  pelvis.add(torso);
  const long = outfit === 'manteau';
  part(torso, new THREE.CylinderGeometry(0.2, 0.17, 0.6, 12), topMat, 0, 0.3, 0).scale.z = 0.65;
  if (long)
    part(torso, new THREE.CylinderGeometry(0.18, 0.2, 0.3, 12), topMat, 0, -0.08, 0).scale.z = 0.7;
  part(torso, new THREE.CylinderGeometry(0.05, 0.055, 0.1, 10), skinMat, 0, 0.64, 0);
  if (outfit === 'hoodie') {
    // Hood folded behind the neck, front pocket and drawstrings.
    part(torso, new THREE.SphereGeometry(0.13, 12, 8), topMat, 0, 0.58, -0.1).scale.set(
      1.2,
      0.6,
      0.7,
    );
    part(torso, new THREE.BoxGeometry(0.24, 0.12, 0.02), topMat, 0, 0.12, 0.125);
    for (const side of [-1, 1])
      part(
        torso,
        new THREE.CylinderGeometry(0.006, 0.006, 0.16, 4),
        mat('#f2f2f2'),
        side * 0.04,
        0.48,
        0.13,
      );
  } else if (outfit === 'suit') {
    // White shirt opening, optional tie, lapels.
    const shirt = part(
      torso,
      new THREE.PlaneGeometry(0.12, 0.2),
      mat('#f4f4f2', {
        side: THREE.DoubleSide,
      }),
      0,
      0.49,
      0.133,
    );
    shirt.rotation.x = -0.12;
    if (tie) part(torso, new THREE.BoxGeometry(0.035, 0.22, 0.01), mat(tie), 0, 0.45, 0.138);
    for (const side of [-1, 1]) {
      const lapel = part(
        torso,
        new THREE.BoxGeometry(0.05, 0.22, 0.01),
        mat(top, {
          roughness: 0.5,
        }),
        side * 0.07,
        0.47,
        0.132,
      );
      lapel.rotation.z = side * 0.35;
    }
  }
  const head = new THREE.Group();
  head.position.y = 0.8;
  torso.add(head);
  part(head, new THREE.SphereGeometry(0.11, 16, 12), skinMat).scale.set(0.92, 1.05, 1);
  part(head, new THREE.SphereGeometry(0.02, 6, 4), skinMat, 0, -0.01, 0.105);
  for (const side of [-1, 1])
    part(head, new THREE.SphereGeometry(0.012, 6, 4), mat('#1b1512'), side * 0.038, 0.02, 0.098);
  if (long) {
    // Headscarf: covers the hair and the neck, leaving the face open.
    part(head, new THREE.SphereGeometry(0.128, 16, 12), mat(scarf), 0, 0.012, -0.022).scale.set(
      1,
      1.05,
      1,
    );
    part(
      head,
      new THREE.CylinderGeometry(0.09, 0.17, 0.2, 14),
      mat(scarf),
      0,
      -0.13,
      -0.01,
    ).scale.z = 0.75;
    part(
      head,
      new THREE.TorusGeometry(0.105, 0.018, 6, 20, Math.PI * 1.2),
      mat(scarf),
      0,
      0.01,
      0.04,
    ).rotation.set(0, 0, -0.1 * Math.PI);
  } else {
    part(head, new THREE.SphereGeometry(0.115, 14, 10), hairMat, 0, 0.035, -0.015).scale.set(
      1,
      0.75,
      1,
    );
  }
  if (glasses) {
    const frame = mat('#222', {
      metalness: 0.6,
      roughness: 0.3,
    });
    for (const side of [-1, 1])
      part(head, new THREE.TorusGeometry(0.024, 0.004, 4, 14), frame, side * 0.04, 0.02, 0.11);
    part(head, new THREE.BoxGeometry(0.03, 0.004, 0.004), frame, 0, 0.022, 0.11);
  }

  // Arms: shoulder → elbow → hand. Rotation x < 0 swings forward.
  const arms = [-1, 1].map((side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.23, 0.55, 0);
    torso.add(shoulder);
    part(shoulder, new THREE.CapsuleGeometry(0.05, 0.2, 4, 8), topMat, 0, -0.14, 0);
    const elbow = new THREE.Group();
    elbow.position.y = -0.29;
    shoulder.add(elbow);
    part(elbow, new THREE.CapsuleGeometry(0.043, 0.18, 4, 8), topMat, 0, -0.12, 0);
    part(elbow, new THREE.SphereGeometry(0.045, 8, 6), skinMat, 0, -0.27, 0);
    return {
      shoulder,
      elbow,
    };
  });
  // Legs: hip → knee → foot.
  const legs = [-1, 1].map((side) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.095, 0, 0);
    pelvis.add(hip);
    part(hip, new THREE.CapsuleGeometry(0.07, 0.3, 4, 8), long ? topMat : bottomMat, 0, -0.22, 0);
    const knee = new THREE.Group();
    knee.position.y = -0.45;
    hip.add(knee);
    part(knee, new THREE.CapsuleGeometry(0.058, 0.32, 4, 8), bottomMat, 0, -0.22, 0);
    part(knee, new THREE.BoxGeometry(0.1, 0.07, 0.24), shoeMat, 0, -0.45, 0.05);
    return {
      hip,
      knee,
    };
  });
  const person = {
    root,
    head,
    // pose: 'stand' | 'walk' | 'sit' | 'type'. `t` is a time in seconds, `phase` offsets it.
    pose(kind, t = 0, phase = 0) {
      const sitting = kind === 'sit' || kind === 'type';
      pelvis.position.y = sitting
        ? 0.5
        : 0.94 + (kind === 'walk' ? Math.abs(Math.sin(t * 6 + phase)) * 0.02 : 0);
      torso.rotation.x = kind === 'type' ? 0.18 : sitting ? -0.05 : 0;
      head.rotation.y =
        kind === 'type' ? Math.sin(t * 0.4 + phase) * 0.15 : Math.sin(t * 0.6 + phase) * 0.2;
      head.rotation.x = kind === 'type' ? 0.12 : 0;
      legs.forEach(({ hip, knee }, i) => {
        const swing = kind === 'walk' ? Math.sin(t * 6 + phase + i * Math.PI) * 0.45 : 0;
        hip.rotation.x = sitting ? -Math.PI / 2 : swing;
        knee.rotation.x = sitting
          ? Math.PI / 2
          : kind === 'walk'
            ? Math.max(0, Math.sin(t * 6 + phase + i * Math.PI + 1)) * 0.5
            : 0;
      });
      arms.forEach(({ shoulder, elbow }, i) => {
        if (kind === 'type') {
          // Hands on the keyboard, fingers busy.
          shoulder.rotation.set(
            -0.7 + Math.sin(t * 13 + phase + i * 2) * 0.025,
            0,
            (i ? 1 : -1) * -0.12,
          );
          elbow.rotation.x = -1.15;
        } else if (kind === 'sit') {
          shoulder.rotation.set(-0.3, 0, 0);
          elbow.rotation.x = -1.0;
        } else {
          const swing =
            kind === 'walk'
              ? -Math.sin(t * 6 + phase + i * Math.PI) * 0.4
              : Math.sin(t * 1.2 + phase + i) * 0.03;
          shoulder.rotation.set(swing, 0, (i ? 1 : -1) * 0.06);
          elbow.rotation.x = kind === 'walk' ? -0.25 : -0.1;
        }
      });
    },
  };
  person.pose('stand');
  return person;
}

// Floating name badge above a person's head.
/**
 * Runs the name tag operation for this subsystem.
 * @param {*} name - name.
 * @param {*} role - role.
 * @returns {*} Operation result, when applicable.
 */
export function nameTag(name, role = '') {
  const texture = textTexture(512, 160, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = 'rgba(8, 24, 28, .82)';
    c.beginPath();
    c.roundRect(6, 6, w - 12, h - 12, 26);
    c.fill();
    c.fillStyle = BRAND.primary;
    c.fillRect(6, h - 18, w - 12, 8);
    c.textAlign = 'center';
    c.direction = 'rtl';
    c.fillStyle = '#ffffff';
    c.font = `bold ${role ? 58 : 66}px Vazirmatn, Tahoma, sans-serif`;
    c.fillText(name, w / 2, role ? 72 : 100);
    if (role) {
      c.fillStyle = BRAND.primaryLighter;
      c.font = '40px Vazirmatn, Tahoma, sans-serif';
      c.direction = 'ltr';
      c.fillText(role, w / 2, 126);
    }
  });
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    }),
  );
  sprite.scale.set(1.3, 0.41, 1);
  return sprite;
}

/**
 * Production workers as instanced meshes, in the parent's local frame. Each worker:
 * {x, z, facing, kind: 'work' | 'walk' | 'carry', to: {x, z} (walkers), suit: colour, hat: colour}.
 */
export function createCrew(parent, workers) {
  const n = workers.length,
    group = new THREE.Group();
  parent.add(group);
  /**
   * Runs the instanced operation for this subsystem.
   * @param {*} geometry - geometry.
   * @param {*} material - material.
   * @param {*} count - count.
   * @returns {*} Operation result, when applicable.
   */
  const instanced = (geometry, material, count = n) => {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    group.add(mesh);
    return mesh;
  };
  const white = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.8,
  });
  const torso = instanced(new THREE.BoxGeometry(0.42, 0.6, 0.26), white);
  const legs = instanced(
    new THREE.BoxGeometry(0.15, 0.9, 0.17).translate(0, -0.45, 0),
    white,
    n * 2,
  );
  const arms = instanced(
    new THREE.BoxGeometry(0.11, 0.62, 0.11).translate(0, -0.31, 0),
    white,
    n * 2,
  );
  const heads = instanced(
    new THREE.SphereGeometry(0.12, 10, 8),
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.8,
    }),
  );
  const hats = instanced(
    new THREE.SphereGeometry(0.135, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.4,
    }),
  );
  const skins = ['#e7b48f', '#d49f7a', '#c48a63', '#edc2a0'].map((c) => new THREE.Color(c));
  const color = new THREE.Color();
  workers.forEach((w, i) => {
    color.set(w.suit);
    torso.setColorAt(i, color);
    color.set(w.pants ?? '#2d3a4d');
    legs.setColorAt(i * 2, color);
    legs.setColorAt(i * 2 + 1, color);
    color.set(w.suit);
    arms.setColorAt(i * 2, color);
    arms.setColorAt(i * 2 + 1, color);
    heads.setColorAt(i, skins[i % skins.length]);
    color.set(w.hat ?? '#f2c94c');
    hats.setColorAt(i, color);
    w.phase = i * 1.37;
    w.from = {
      x: w.x,
      z: w.z,
    };
  });
  const base = new THREE.Matrix4(),
    m = new THREE.Matrix4(),
    local = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    up = new THREE.Vector3(0, 1, 0);
  /**
   * Runs the set limb operation for this subsystem.
   * @param {*} mesh - mesh.
   * @param {*} index - index.
   * @param {*} x - x.
   * @param {*} y - y.
   * @param {*} angle - angle.
   * @returns {*} Operation result, when applicable.
   */
  const setLimb = (mesh, index, x, y, angle) => {
    local.makeRotationX(angle).setPosition(x, y, 0);
    mesh.setMatrixAt(index, m.multiplyMatrices(base, local));
  };
  /**
   * Updates update from the active simulation.
   * @param {*} time - time.
   * @returns {*} Operation result, when applicable.
   */
  function update(time) {
    workers.forEach((w, i) => {
      let x = w.x,
        z = w.z,
        facing = w.facing,
        walking = false;
      if (w.kind === 'walk' || w.kind === 'carry') {
        // Walk between two points, pausing at each end.
        const dx = w.to.x - w.from.x,
          dz = w.to.z - w.from.z,
          len = Math.hypot(dx, dz);
        const cycle = (len / 1.2) * 2 + 6,
          c = (time + w.phase * 3) % cycle,
          leg = len / 1.2;
        let s;
        if (c < leg) ((s = c / leg), (walking = true), (facing = Math.atan2(dx, dz)));
        else if (c < leg + 3) ((s = 1), (facing = Math.atan2(dx, dz)));
        else if (c < leg * 2 + 3)
          ((s = 1 - (c - leg - 3) / leg), (walking = true), (facing = Math.atan2(-dx, -dz)));
        else ((s = 0), (facing = Math.atan2(-dx, -dz)));
        x = w.from.x + dx * s;
        z = w.from.z + dz * s;
      }
      const t = time + w.phase;
      base.compose(
        new THREE.Vector3(x, walking ? Math.abs(Math.sin(t * 6)) * 0.03 : 0, z),
        q.setFromAxisAngle(up, facing),
        new THREE.Vector3(1, 1, 1),
      );
      m.copy(base).multiply(local.makeTranslation(0, 1.2, 0));
      torso.setMatrixAt(i, m);
      m.copy(base).multiply(local.makeTranslation(0, 1.64, 0));
      heads.setMatrixAt(i, m);
      m.copy(base).multiply(local.makeTranslation(0, 1.7, 0));
      hats.setMatrixAt(i, m);
      for (const side of [0, 1]) {
        const sign = side ? 1 : -1;
        const legSwing = walking ? Math.sin(t * 6 + side * Math.PI) * 0.45 : 0;
        setLimb(legs, i * 2 + side, sign * 0.1, 0.9, legSwing);
        let arm;
        if (w.kind === 'carry' && walking) arm = -1.1;
        else if (walking) arm = -Math.sin(t * 6 + side * Math.PI) * 0.4;
        // Working at a bench: both hands forward, one hammering or turning a tool.
        else if (w.kind === 'work')
          arm = -1.0 + (side ? Math.sin(t * 4) * 0.35 : Math.sin(t * 1.3) * 0.08);
        else arm = -0.9;
        setLimb(arms, i * 2 + side, sign * 0.27, 1.46, arm);
      }
    });
    for (const mesh of [torso, legs, arms, heads, hats]) mesh.instanceMatrix.needsUpdate = true;
  }
  update(0);
  for (const mesh of [torso, legs, arms, heads, hats])
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return {
    group,
    update,
  };
}
