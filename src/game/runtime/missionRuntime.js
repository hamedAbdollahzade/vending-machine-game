import { SHOWROOM_POINT_ID } from '../../constants/factoryPoints.js';
import { machineById } from '../../constants/locations.js';
import { strings } from '../../i18n/fa.js';
import { showroomModelById } from '../../utils/showroomAnswers.js';
import { fa, formatHetoman } from '../economy/gameState.js';
import { applyMissionEvent, currentStep } from '../missions/missionProgress.js';
import { ARRIVE_RADIUS, INSPECT_RADIUS, INSPECT_SECONDS } from '../missions/missions.js';
import { currentStepText } from '../missions/missionText.js';

// Connects the mission steps to the running game: it reports what the player does (arrive,
// inspect, buy, locate, order), celebrates finished steps and missions, and opens machine cards.

// Delay before the next instruction is spoken, so it follows any reward banner.
const NEXT_LINE_DELAY = 1500;

/**
 * Speaker for game guidance: the robot when it is out of a machine, otherwise the father.
 * @param {object} context - Game context.
 * @returns {string} Speaker id.
 */
const guide = (context) => (context.guideOut() ? 'robot' : 'father');

/**
 * Reports something the player did; finishes the current step or mission when it matches.
 * @param {object} context - Game context.
 * @param {{type: string, machineId?: string}} event - What happened.
 * @returns {{stepDone: boolean, mission: object | null}} The result of applying the event.
 */
export function reportMissionEvent(context, event) {
  const result = applyMissionEvent(context.state, event);
  if (!result.stepDone) return result;
  context.inspectTime = 0;
  // A new target: drop the old route so it is rebuilt to the next machine.
  context.waypoint = null;
  context.route = null;
  if (result.mission) announceMission(context, result.mission);
  else context.tone(760, 0.25);
  context.setTimeout(
    () => context.say(guide(context), strings.dialogue.nextStep(currentStepText(context.state))),
    NEXT_LINE_DELAY,
  );
  context.refreshHUD();
  return result;
}

/**
 * Shows the reward banner for a finished mission.
 * @param {object} context - Game context.
 * @param {object} mission - The finished mission.
 */
function announceMission(context, mission) {
  context.showBanner(
    strings.rewards.missionDone,
    strings.missions[mission.id],
    strings.rewards.missionReward(fa(mission.reward.xp), formatHetoman(mission.reward.hetoman)),
  );
  context.tone(660, 0.5);
}

/**
 * Distance from the player to the front of a machine.
 * @param {object} context - Game context.
 * @param {string} machineId - Machine id.
 * @returns {number} Metres, or Infinity for an unknown machine.
 */
function distanceTo(context, machineId) {
  const station = context.pointById(machineId);
  if (!station) return Infinity;
  return Math.hypot(station.front.x - context.player.x, station.front.z - context.player.z);
}

/**
 * Per-frame mission checks: arriving at a `goto` target, and standing at an `inspect` target
 * long enough to finish inspecting it.
 * @param {object} context - Game context.
 * @param {number} dt - Step length in seconds.
 */
export function updateMissions(context, dt) {
  const step = currentStep(context.state);
  if (!step?.target) return;
  // In real-world mode "being there" uses the GPS reach radius, which allows for GPS error.
  const near = (radius) =>
    distanceTo(context, step.target) < (context.real.on ? context.reachRadius() : radius);
  if (step.type === 'goto' && near(ARRIVE_RADIUS))
    reportMissionEvent(context, { type: 'arrive', machineId: step.target });
  if (step.type !== 'inspect') return;
  context.inspectTime = near(INSPECT_RADIUS) ? (context.inspectTime ?? 0) + dt : 0;
  if (context.inspectTime < INSPECT_SECONDS) return;
  openMachineCard(context, step.target);
  reportMissionEvent(context, { type: 'inspect', machineId: step.target });
}

/**
 * Opens the machine card: which model stands here, its specs and an order button.
 * @param {object} context - Game context.
 * @param {string} machineId - Machine id.
 */
export function openMachineCard(context, machineId) {
  const site = machineById(machineId);
  context.ui.patch('machine-card', {
    machineId,
    modelId: site.model,
    site: site.name,
    ordered: false,
  });
  context.keys.clear();
  document.exitPointerLock?.();
  context.ui.open('machine-card');
}

/**
 * Handles the order button on a machine card.
 * @param {object} context - Game context.
 */
export function orderFromCard(context) {
  const { machineId } = context.ui.read('machine-card');
  context.ui.patch('machine-card', { ordered: true });
  context.say('robot', strings.machineCard.orderThanks, 'happy');
  reportMissionEvent(context, { type: 'order', machineId });
}

/**
 * Handles the purchase request button in the products hall: thanks the player and records the
 * model as requested.
 * @param {object} context - Game context.
 */
export function orderFromShowroom(context) {
  const { open, modelId, ordered = [] } = context.ui.read('showroom');
  const model = showroomModelById(modelId);
  if (!open || !model) return;
  const thanks = strings.showroom.orderThanks(model.name);
  context.ui.patch('showroom', { ordered: [...new Set([...ordered, model.id])] });
  context.ui.patch('showroom-response', { text: strings.showroom.robotSays(thanks) });
  context.say('robot', thanks, 'happy');
  reportMissionEvent(context, { type: 'request', machineId: SHOWROOM_POINT_ID });
}
