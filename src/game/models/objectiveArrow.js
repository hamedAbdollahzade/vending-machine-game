import * as THREE from 'three';
import { COMPANY } from '../../config/company.js';

// Height above the ground the arrow floats at, and how far it bobs.
const HOVER_HEIGHT = 4.6;
const BOB = 0.35;

/**
 * Creates the brand-coloured arrow that hovers over the current objective, pointing down at it.
 * It glows so it reads from far away and from any angle.
 * @returns {{group: THREE.Group, update: function}} The arrow and its per-frame update.
 */
export function createObjectiveArrow() {
  const material = new THREE.MeshStandardMaterial({
    color: COMPANY.colors.primary,
    emissive: COMPANY.colors.primary,
    emissiveIntensity: 0.6,
  });
  const group = new THREE.Group();
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.9, 4), material);
  head.rotation.x = Math.PI; // point down
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), material);
  shaft.position.y = 0.8;
  group.add(head, shaft);
  group.visible = false;
  return {
    group,
    /**
     * Places the arrow over a target, or hides it.
     * @param {{x: number, z: number} | null} target - Objective position, or null for none.
     * @param {number} time - Elapsed seconds, for the bob and spin.
     */
    update(target, time) {
      group.visible = Boolean(target);
      if (!target) return;
      group.position.set(target.x, HOVER_HEIGHT + Math.sin(time * 2.4) * BOB, target.z);
      group.rotation.y = time * 1.2;
    },
  };
}
