import * as THREE from 'three';
import { COMPANY } from '../../config/company.js';
import { ABOUT_BOARDS, BOARD_REACH } from '../../constants/factoryPoints.js';
import { strings } from '../../i18n/fa.js';
import { FACTORY_ROTATION, factoryFootprint, factoryToWorld } from '../world/factoryFrame.js';
import { textTexture } from './textures.js';

// Free-standing information boards in the factory yard: history and values, contact details and
// the address. The text is painted from the company config, so it updates with real content.

const BRAND = COMPANY.colors;
// Board face in metres, and the canvas painted on it (same aspect ratio).
const BOARD_WIDTH = 3;
const BOARD_HEIGHT = 1.9;
const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 570;
// Height of the board's centre, so it reads at eye level from a few metres away.
const BOARD_CENTRE_Y = 1.75;
const PADDING = 40;
const TITLE_BAND = 110;
const BODY_LINE = 52;
const FONT = 'Vazirmatn, Tahoma, sans-serif';
// How far in front of the board the player stands to read it (local +v).
const FRONT_DISTANCE = 2;

/**
 * The text lines a board shows for its topic.
 * @param {string} topic - Information section: 'about', 'contact' or 'address'.
 * @returns {string[]} Paragraphs; long ones are wrapped when painted.
 */
export function boardLines(topic) {
  const { contact, about } = COMPANY;
  const labels = strings.landing;
  if (topic === 'about')
    return [about.history, ...about.values.map((value) => `${strings.boards.bullet} ${value}`)];
  if (topic === 'contact')
    return [
      `${labels.phone}: ${contact.phone}`,
      `${labels.email}: ${contact.email}`,
      `${labels.website}: ${contact.website.replace(/^https?:\/\//, '')}`,
    ];
  return [labels.fullAddress(contact.address, contact.city)];
}

/**
 * Splits a paragraph into lines that fit a width on a canvas.
 * @param {CanvasRenderingContext2D} c - Canvas context with the font already set.
 * @param {string} text - Paragraph.
 * @param {number} maxWidth - Line width in pixels.
 * @returns {string[]} Lines.
 */
function wrapLines(c, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && c.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Paints a board: a brand-coloured title band, the wrapped text and a hint at the bottom.
 * @param {string} topic - Information section.
 * @returns {THREE.CanvasTexture} Board texture.
 */
function boardTexture(topic) {
  return textTexture(CANVAS_WIDTH, CANVAS_HEIGHT, (c, w, h) => {
    c.fillStyle = BRAND.surfaceRaised;
    c.fillRect(0, 0, w, h);
    c.fillStyle = BRAND.primary;
    c.fillRect(0, 0, w, TITLE_BAND);
    c.direction = 'rtl';
    c.textAlign = 'right';
    c.fillStyle = BRAND.onPrimary;
    c.font = `bold 64px ${FONT}`;
    c.fillText(strings.boards.titles[topic], w - PADDING, 80);
    c.fillStyle = BRAND.text;
    c.font = `36px ${FONT}`;
    const lines = boardLines(topic).flatMap((text) => wrapLines(c, text, w - PADDING * 2));
    lines.forEach((line, i) => c.fillText(line, w - PADDING, TITLE_BAND + 70 + i * BODY_LINE));
    c.fillStyle = BRAND.primaryLighter;
    c.font = `28px ${FONT}`;
    c.fillText(strings.boards.readMore, w - PADDING, h - 30);
  });
}

/**
 * Builds the board mesh: two posts and a framed face.
 * @param {string} topic - Information section.
 * @returns {THREE.Group} Board model, facing local +Z.
 */
function boardModel(topic) {
  const group = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: BRAND.primaryDarker, roughness: 0.5 });
  const top = BOARD_CENTRE_Y + BOARD_HEIGHT / 2;
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, top, 0.12), steel);
    post.position.set((side * (BOARD_WIDTH + 0.1)) / 2, top / 2, 0);
    group.add(post);
  }
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(BOARD_WIDTH + 0.16, BOARD_HEIGHT + 0.16, 0.08),
    steel,
  );
  frame.position.y = BOARD_CENTRE_Y;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(BOARD_WIDTH, BOARD_HEIGHT),
    new THREE.MeshBasicMaterial({ map: boardTexture(topic) }),
  );
  face.position.set(0, BOARD_CENTRE_Y, 0.05);
  group.add(frame, face);
  group.traverse((mesh) => (mesh.castShadow = true));
  return group;
}

/**
 * Places one board in the yard.
 * @param {THREE.Scene} scene - Scene to add it to.
 * @param {{id: string, topic: string, u: number, v: number}} board - Board definition.
 * @returns {object} Board with world position, reading spot, collision outline and objective info.
 */
function placeBoard(scene, { id, topic, u, v }) {
  const model = boardModel(topic);
  const position = factoryToWorld(u, v);
  model.position.set(position.x, 0, position.z);
  model.rotation.y = FACTORY_ROTATION;
  model.name = id;
  scene.add(model);
  return {
    id,
    topic,
    x: position.x,
    z: position.z,
    front: factoryToWorld(u, v + FRONT_DISTANCE),
    footprint: factoryFootprint({ u, v, halfU: BOARD_WIDTH / 2 + 0.1, halfV: 0.15 }),
    // Same shape as a machine station's `def`, so boards can be mission objectives.
    def: { id, name: strings.points[id], poi: true },
  };
}

/**
 * Builds the information boards in the factory yard.
 * @param {THREE.Scene} scene - Scene to add them to.
 * @returns {{boards: object[], nearest: function}} Boards and a lookup for the one in reach.
 */
export function createAboutBoards(scene) {
  const boards = ABOUT_BOARDS.map((board) => placeBoard(scene, board));
  return {
    boards,
    /**
     * The board the player can read from where they stand.
     * @param {{x: number, z: number}} player - Player position.
     * @returns {object | null} Closest board within reach, or null.
     */
    nearest(player) {
      const distance = (board) => Math.hypot(board.front.x - player.x, board.front.z - player.z);
      const inReach = boards.filter((board) => distance(board) < BOARD_REACH);
      return inReach.sort((a, b) => distance(a) - distance(b))[0] ?? null;
    },
  };
}
