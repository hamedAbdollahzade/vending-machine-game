import { MANAGER_POINT, SHOWROOM_POINT_ID } from '../../constants/factoryPoints.js';
import { PRODUCTS_SAMPLE } from '../../constants/startModes.js';
import { strings } from '../../i18n/fa.js';
import { createAboutBoards } from '../models/aboutBoards.js';
import { addPolygon } from '../world/collision.js';
import { factoryToWorld } from '../world/factoryFrame.js';

// Factory places that missions can point at besides machines (boards, the manager's desk and the
// products hall), and reading the information boards. Every point has the same shape as a machine
// station ({x, z, front, def}) so the objective arrow, route and chip treat them alike.

/**
 * Builds a point that is not a board.
 * @param {string} id - Point id.
 * @param {{x: number, z: number}} at - Where the arrow hangs.
 * @param {{x: number, z: number}} front - Where the route leads.
 * @returns {object} Objective point.
 */
const point = (id, at, front) => ({
  x: at.x,
  z: at.z,
  front,
  def: { id, name: strings.points[id], poi: true },
});

/**
 * Adds the information boards and registers every factory point. Runs after the factory and
 * showroom are built.
 * @param {object} context - Game context.
 */
export async function initializeFactoryPoints(context) {
  context.aboutBoards = createAboutBoards(context.scene);
  for (const board of context.aboutBoards.boards) addPolygon(context.collision, board.footprint);
  const desk = factoryToWorld(MANAGER_POINT.u, MANAGER_POINT.v);
  const sample = context.showroom.samples[PRODUCTS_SAMPLE];
  context.factoryPoints = new Map([
    ...context.aboutBoards.boards.map((board) => [board.id, board]),
    [MANAGER_POINT.id, point(MANAGER_POINT.id, desk, desk)],
    [SHOWROOM_POINT_ID, point(SHOWROOM_POINT_ID, sample.position, sample.front)],
  ]);
  context.ui.on('about-board-close', () => context.ui.close('about-board'));
}

/**
 * Finds a mission target: a machine station or a factory point.
 * @param {object} context - Game context.
 * @param {string} id - Machine or point id.
 * @returns {object | null} Station or point, or null when unknown.
 */
export function pointById(context, id) {
  return context.stationById(id) ?? context.factoryPoints.get(id) ?? null;
}

/**
 * The information board the walking player can read, if any.
 * @param {object} context - Game context.
 * @returns {object | null} Board in reach, or null.
 */
export function nearBoard(context) {
  if (context.real.on || context.mode !== 'walk') return null;
  return context.aboutBoards.nearest(context.player);
}

/**
 * Opens the full text of a board in a sheet and counts it as read.
 * @param {object} context - Game context.
 * @param {object} board - Board from createAboutBoards.
 */
export function openBoard(context, board) {
  context.ui.patch('about-board', { topic: board.topic });
  context.keys.clear();
  document.exitPointerLock?.();
  context.ui.open('about-board');
  context.reportMissionEvent({ type: 'read', machineId: board.id });
}
