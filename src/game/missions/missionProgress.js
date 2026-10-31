import { missionById } from './missions.js';

// Pure mission bookkeeping on the game state: which step is current, and what an event (arriving,
// buying, inspecting…) completes. No rendering or timing here; the runtime reports events.

// The event that completes each step type; only `goto` is finished by a differently named one.
const EVENT_FOR_STEP = {
  goto: 'arrive',
  locate: 'locate',
  inspect: 'inspect',
  order: 'order',
  buy: 'buy',
  read: 'read',
  meet: 'meet',
  view: 'view',
  ask: 'ask',
  request: 'request',
};

/**
 * The mission the player is working on.
 * @param {object} state - Game state.
 * @returns {object | null} Mission, or null when all are done.
 */
export const currentMission = (state) => missionById(state.missionOrder[state.missionIndex]);

/**
 * The step the player is working on.
 * @param {object} state - Game state.
 * @returns {object | null} Step, or null when all missions are done.
 */
export const currentStep = (state) => currentMission(state)?.steps[state.missionStep] ?? null;

/**
 * Machine id the current step points at, if any.
 * @param {object} state - Game state.
 * @returns {string | null} Target machine id.
 */
export const stepTarget = (state) => currentStep(state)?.target ?? null;

/**
 * Number of different city machines (outside the factory) the player has bought from.
 * @param {object[]} purchases - Purchase records.
 * @returns {number} Distinct machines.
 */
export const cityPlacesVisited = (purchases) =>
  new Set(purchases.filter((p) => p.category !== 'factory').map((p) => p.machineId)).size;

/**
 * Whether an event completes a step.
 * @param {object} step - Mission step.
 * @param {{type: string, machineId?: string}} event - What happened.
 * @param {object} state - Game state (for purchase counts).
 * @returns {boolean} True when the step is done.
 */
function completes(step, event, state) {
  if (step.type === 'places')
    return event.type === 'buy' && cityPlacesVisited(state.purchases) >= step.count;
  return EVENT_FOR_STEP[step.type] === event.type && step.target === event.machineId;
}

/**
 * Pays a finished mission's reward and moves on to the next mission.
 * @param {object} state - Game state, changed in place.
 * @param {object} mission - The finished mission.
 */
function finishMission(state, mission) {
  state.missionsDone.push(mission.id);
  state.xp += mission.reward.xp;
  state.balance += mission.reward.hetoman;
  state.missionIndex += 1;
  state.missionStep = 0;
}

/**
 * Applies an event to the current step.
 * @param {object} state - Game state, changed in place.
 * @param {{type: string, machineId?: string}} event - What happened.
 * @returns {{stepDone: boolean, mission: object | null}} Whether the step finished, and the
 * mission it finished (null while the mission still has steps left).
 */
export function applyMissionEvent(state, event) {
  const mission = currentMission(state),
    step = currentStep(state);
  if (!step || !completes(step, event, state)) return { stepDone: false, mission: null };
  state.missionStep += 1;
  if (state.missionStep < mission.steps.length) return { stepDone: true, mission: null };
  finishMission(state, mission);
  return { stepDone: true, mission };
}
