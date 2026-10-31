import * as THREE from 'three';
import { catalog } from '../economy/gameState.js';
import { textTexture } from './textures.js';
import { COMPANY } from '../../config/company.js';

// Brand colours for materials and canvas drawings.
const BRAND = COMPANY.colors;
const PRODUCT_COLORS = {
  juice: '#e5ae47',
  water: '#9fd3e6',
  milk: '#8a5a3c',
  tea: '#c7783a',
  lemonade: '#f0dc5a',
  biscuit: '#c9935a',
  chocolate: '#5a3524',
  nuts: '#b9884f',
  cake: '#e58fa6',
};

// Sign panel; the shared helper redraws it once the Persian web font has loaded.
/**
 * Runs the label operation for this subsystem.
 * @param {*} text - text.
 * @param {*} sub - sub.
 * @returns {*} Operation result, when applicable.
 */
const label = (text, sub) =>
  textTexture(512, 160, (c, width, height) => {
    c.fillStyle = '#0f2a2a';
    c.fillRect(0, 0, width, height);
    c.fillStyle = BRAND.primary;
    c.fillRect(0, height - 10, width, 10);
    c.textAlign = 'center';
    c.direction = 'rtl';
    c.fillStyle = '#e9fff8';
    c.font = 'bold 56px Vazirmatn, Tahoma, sans-serif';
    c.fillText(text, width / 2, 72);
    c.fillStyle = BRAND.primaryLighter;
    c.font = '34px Vazirmatn, Tahoma, sans-serif';
    c.fillText(sub, width / 2, 126);
  });

// A Robot Market machine. Local +z is the front face; the group is placed facing the path.
/**
 * Creates vending machine resources for the game.
 * @param {*} def - def.
 * @returns {*} Operation result, when applicable.
 */
export function createVendingMachine(def) {
  const group = new THREE.Group();
  /**
   * Runs the mat operation for this subsystem.
   * @param {*} color - color.
   * @param {*} extra - extra.
   * @returns {*} Operation result, when applicable.
   */
  const mat = (color, extra = {}) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.5,
      ...extra,
    });
  /**
   * Runs the box operation for this subsystem.
   * @param {*} w - w.
   * @param {*} h - h.
   * @param {*} d - d.
   * @param {*} material - material.
   * @param {*} x - x.
   * @param {*} y - y.
   * @param {*} z - z.
   * @param {*} parent - parent.
   * @returns {*} Operation result, when applicable.
   */
  const box = (w, h, d, material, x, y, z, parent = group) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const shell = mat(BRAND.primary, {
      metalness: 0.45,
      roughness: 0.3,
      emissive: BRAND.primary,
      emissiveIntensity: 0.15,
    }),
    white = mat('#eef5f3', {
      metalness: 0.2,
      roughness: 0.35,
    });
  const dark = mat('#13292b'),
    steel = mat('#b7c1c0', {
      metalness: 0.8,
      roughness: 0.3,
    });
  box(1.9, 2.4, 1.1, shell, 0, 1.3, 0);
  box(1.94, 0.32, 1.14, white, 0, 2.62, 0);
  box(1.94, 0.12, 1.14, dark, 0, 0.06, 0);
  // The lit interior glows instead of using a point light, which would cost every pixel in the scene.
  box(
    1.3,
    1.8,
    0.06,
    mat('#13292b', {
      emissive: '#2a7f73',
      emissiveIntensity: 0.5,
    }),
    -0.2,
    1.45,
    0.56,
  );
  // Retail models retain 48 slots; showroom samples use their catalog channel count.
  const rows = def.channels === 35 ? 5 : 6;
  const columns = Math.ceil((def.channels ?? 48) / rows);
  group.userData.channels = def.channels ?? 48;
  for (let row = 0; row < rows; row++) {
    const y = 0.78 + row * (1.4 / (rows - 1));
    box(1.2, 0.02, 0.25, steel, -0.2, y, 0.45);
    for (let col = 0; col < columns; col++) {
      const id = def.products[(row * columns + col) % def.products.length];
      const color = mat(PRODUCT_COLORS[id]);
      let channelMesh;
      if (catalog[id].type === 'drink') {
        const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.17, 8), color);
        bottle.position.set(
          -0.73 + col * (def.channels ? 1.06 / (columns - 1) : 0.15),
          y + 0.1,
          0.47,
        );
        group.add(bottle);
        channelMesh = bottle;
      } else
        channelMesh = box(
          0.09,
          0.14,
          0.06,
          color,
          -0.73 + col * (def.channels ? 1.06 / (columns - 1) : 0.15),
          y + 0.08,
          0.47,
        );
      channelMesh.userData.channel = row * columns + col + 1;
    }
  }
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(1.32, 1.82),
    new THREE.MeshStandardMaterial({
      color: '#cdeeea',
      transparent: true,
      opacity: 0.16,
      roughness: 0.05,
      metalness: 0.3,
      depthWrite: false,
    }),
  );
  glass.position.set(-0.2, 1.45, 0.6);
  group.add(glass);
  // Card reader panel on the right of the front.
  box(0.42, 1.8, 0.05, white, 0.7, 1.45, 0.56);
  const screen = box(
    0.3,
    0.22,
    0.02,
    new THREE.MeshStandardMaterial({
      color: '#7ef0d6',
      emissive: '#2bbfa0',
      emissiveIntensity: 0.8,
    }),
    0.7,
    1.92,
    0.6,
  );
  box(0.3, 0.2, 0.03, dark, 0.7, 1.55, 0.6);
  box(0.22, 0.03, 0.04, steel, 0.7, 1.62, 0.62);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) box(0.07, 0.05, 0.02, steel, 0.62 + c * 0.08, 1.32 - r * 0.07, 0.6);
  box(0.9, 0.3, 0.08, mat('#050f10'), -0.2, 0.38, 0.56);
  const flap = new THREE.Group();
  flap.position.set(-0.2, 0.53, 0.61);
  group.add(flap);
  box(
    0.88,
    0.28,
    0.03,
    mat('#4f6f68', {
      metalness: 0.4,
    }),
    0,
    -0.14,
    0,
    flap,
  );
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.86, 0.3),
    new THREE.MeshBasicMaterial({
      map: label(COMPANY.shortName, def.name),
    }),
  );
  sign.position.set(0, 2.62, 0.575);
  group.add(sign);
  const delivery = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 10), mat('#e5ae47'));
  delivery.visible = false;
  group.add(delivery);
  const card = box(
    0.2,
    0.13,
    0.01,
    mat('#e2d6a8', {
      metalness: 0.3,
    }),
    0.95,
    1.7,
    0.66,
  );
  card.visible = false;

  // Objective beacon: a tall column of light visible across the city, like a mission marker.
  const beaconMaterial = new THREE.MeshBasicMaterial({
    color: BRAND.primary,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    fog: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 90, 16, 1, true),
    beaconMaterial,
  );
  beacon.position.y = 45;
  group.add(beacon);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.6, 1.9, 40),
    new THREE.MeshBasicMaterial({
      color: BRAND.primary,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.09, 1.6);
  group.add(ring);
  return {
    group,
    flap,
    delivery,
    card,
    screen,
    beacon,
    ring,
    setDelivery(productId) {
      delivery.material = mat(PRODUCT_COLORS[productId]);
      delivery.scale.set(catalog[productId].type === 'drink' ? 1 : 1.6, 1, 1);
    },
    // Points in machine space, converted to world space by the caller.
    readerPoint: new THREE.Vector3(0.7, 1.6, 0.62),
    slotPoint: new THREE.Vector3(-0.2, 0.38, 0.66),
  };
}
