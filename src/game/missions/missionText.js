import { machineById } from '../../constants/locations.js';
import { strings } from '../../i18n/fa.js';
import { fa } from '../economy/gameState.js';
import { MISSIONS } from './missions.js';
import { cityPlacesVisited, currentStep } from './missionProgress.js';

/**
 * Short instruction for a step, such as "go to Park Mellat".
 * @param {object} step - Mission step.
 * @param {object} state - Game state (for the places count).
 * @returns {string} One line of text.
 */
export function stepText(step, state) {
  if (step.type === 'places')
    return strings.steps.places(
      fa(Math.min(step.count, cityPlacesVisited(state.purchases))),
      fa(step.count),
    );
  return strings.steps[step.type](machineById(step.target)?.name ?? '');
}

/**
 * The current instruction, or a note that everything is done.
 * @param {object} state - Game state.
 * @returns {string} One line of text.
 */
export function currentStepText(state) {
  const step = currentStep(state);
  return step ? stepText(step, state) : strings.steps.allDone;
}

/**
 * The mission list for the missions sheet: every mission with its state, and the steps of the
 * current one.
 * @param {object} state - Game state.
 * @returns {object[]} List items for ViewLists.
 */
export function missionListItems(state) {
  return MISSIONS.map((mission, index) => ({
    id: mission.id,
    title: strings.missions[mission.id],
    done: state.missionsDone.includes(mission.id),
    active: index === state.missionIndex,
    steps:
      index === state.missionIndex
        ? mission.steps.map((step, i) => ({
            text: stepText(step, state),
            done: i < state.missionStep,
          }))
        : [],
  }));
}
