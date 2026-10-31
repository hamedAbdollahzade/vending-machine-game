import { CITY_START } from '../../constants/locations.js';
import {
  DEFAULT_START_MODE,
  PARK_CAR_OFFSET,
  PARK_PLAYER_OFFSET,
  PRODUCTS_SAMPLE,
  START_MODES,
} from '../../constants/startModes.js';
import { strings } from '../../i18n/fa.js';
import { missionOrder } from '../missions/missions.js';
import { resolveCircle } from '../world/collision.js';
import { parkFamilyCar } from './garage.js';

// Starts the game in one of the start-screen modes (see constants/startModes.js). Every mode
// begins from a fresh reset, which puts the family in the factory yard; modes that start
// elsewhere move them afterwards.

/**
 * Points the player (and the chase camera behind them) along a heading.
 * @param {object} context - Game context.
 * @param {{x: number, z: number}} at - Position to stand on.
 * @param {number} heading - Heading in radians (Three rotation.y).
 */
function standAt(context, at, heading) {
  const spot = resolveCircle(context.collision, at.x, at.z, 1);
  Object.assign(context.player, { x: spot.x, z: spot.z, heading });
  // The camera sits at player + (sin yaw, cos yaw), so this puts it behind the player.
  context.cam.yaw = Math.atan2(-Math.cos(heading), Math.sin(heading));
}

/**
 * Moves the family and their car to the Park Mellat gate, facing the machine, and routes to the
 * factory for the first mission.
 * @param {object} context - Game context.
 */
function placeAtPark(context) {
  const machine = context.stationById(CITY_START);
  const local = (offset) => context.rotateLocal(offset.x, offset.z, machine.rot);
  const player = local(PARK_PLAYER_OFFSET),
    car = local(PARK_CAR_OFFSET);
  const towardsMachine = Math.atan2(player.z, -player.x);
  standAt(context, { x: machine.x + player.x, z: machine.z + player.z }, towardsMachine);
  const carSpot = resolveCircle(context.collision, machine.x + car.x, machine.z + car.z, 2);
  parkFamilyCar(context, { x: carSpot.x, z: carSpot.z, heading: machine.rot + Math.PI / 2 });
  context.waypoint = 'factory';
  context.route = null;
}

/**
 * Puts the player in front of the middle showroom sample.
 * @param {object} context - Game context.
 */
function placeAtShowroom(context) {
  const sample = context.showroom.samples[PRODUCTS_SAMPLE];
  const heading = Math.atan2(
    -(sample.position.z - sample.front.z),
    sample.position.x - sample.front.x,
  );
  standAt(context, sample.front, heading);
}

/**
 * Says the opening lines for a mode.
 * @param {object} context - Game context.
 * @param {string} mode - Start mode.
 */
function introduce(context, mode) {
  const { dialogue } = strings;
  if (mode === 'offline') {
    context.say('father', dialogue.offlineStart);
    context.say('child', dialogue.offlineFollow);
    return;
  }
  if (mode === 'real') {
    context.say('father', dialogue.realStart);
    return;
  }
  if (mode === 'products') return;
  context.say('robot', dialogue.showroomIntro, 'wink');
  context.say('child', dialogue.childAsksFactory);
  context.say('father', dialogue.fatherAnswersFactory);
  context.say('child', dialogue.childAsksArrival);
  context.say('father', dialogue.fatherAnswersArrival);
}

/**
 * Sets up a fresh game for a mode, without touching the interface: where the player stands and
 * which mission comes first.
 * @param {object} context - Game context.
 * @param {string} mode - Start mode.
 */
function placeForMode(context, mode) {
  context.state.missionOrder = missionOrder(mode);
  if (mode === 'offline') placeAtPark(context);
  if (mode === 'products') placeAtShowroom(context);
}

/**
 * Leaves the start screen and starts playing in a mode.
 * @param {object} context - Game context.
 * @param {string} mode - One of START_MODES; unknown values start the About Us tour.
 */
export function startGame(context, mode) {
  context.startMode = START_MODES.includes(mode) ? mode : DEFAULT_START_MODE;
  context.reset();
  placeForMode(context, context.startMode);
  context.ui.patch('landing', { hidden: true });
  context.ui.patch('hud', { hidden: false });
  introduce(context, context.startMode);
  if (context.startMode === 'products') {
    context.openShowroom();
    return;
  }
  if (!context.isTouch && !context.real.on)
    context.canvas.requestPointerLock?.()?.catch?.(() => {});
}

/**
 * Restarts in the mode the player chose on the start screen.
 * @param {object} context - Game context.
 */
export function restartGame(context) {
  context.reset();
  placeForMode(context, context.startMode ?? DEFAULT_START_MODE);
}

/**
 * Leaves play and shows the start screen again, with a fresh game behind it.
 * @param {object} context - Game context.
 */
export function backToMenu(context) {
  context.setRealMode(false);
  const dialogs = ['shop', 'map-dialog', 'end', 'showroom', 'machine-card', 'about-board'];
  for (const id of [...dialogs, 'gps-fallback']) context.ui.close(id);
  document.exitPointerLock?.();
  context.reset();
  context.ui.patch('hud', { hidden: true });
  context.ui.patch('landing', { hidden: false });
}

/**
 * Explains that location is unavailable and offers to play offline instead. Shown once per
 * real-world session, the first time tracking reports an error.
 * @param {object} context - Game context.
 * @param {string} message - Why location failed.
 */
export function offerOffline(context, message) {
  if (context.real.offeredOffline) return;
  context.real.offeredOffline = true;
  context.ui.patch('gps-fallback-text', { text: message });
  context.ui.open('gps-fallback');
}

/**
 * Switches from a failed real-world session to offline play at Park Mellat.
 * @param {object} context - Game context.
 */
export function switchToOffline(context) {
  context.ui.close('gps-fallback');
  context.setRealMode(false);
  context.startGame('offline');
}
