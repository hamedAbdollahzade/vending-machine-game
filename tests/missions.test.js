import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, purchase } from '../src/game/economy/gameState.js';
import { machineById, machines } from '../src/constants/locations.js';
import { MISSIONS } from '../src/game/missions/missions.js';
import {
  applyMissionEvent,
  currentMission,
  currentStep,
  stepTarget,
} from '../src/game/missions/missionProgress.js';
import { currentStepText, missionListItems } from '../src/game/missions/missionText.js';
import { strings } from '../src/i18n/fa.js';

/**
 * Buys water at a machine and reports the purchase to the missions.
 * @param {object} state - Game state.
 * @param {string} id - Machine id.
 * @returns {object} Mission event result.
 */
function buyAt(state, id) {
  state.minutes = 12 * 60;
  purchase(state, machineById(id), 'water');
  return applyMissionEvent(state, { type: 'buy', machineId: id });
}

test('Every mission step points at a real machine and has text', () => {
  for (const mission of MISSIONS) {
    assert.ok(strings.missions[mission.id], `title for ${mission.id}`);
    for (const step of mission.steps) {
      assert.ok(strings.steps[step.type], `text for ${step.type}`);
      if (step.target) assert.ok(machineById(step.target), `machine ${step.target}`);
    }
  }
  const parkSites = machines.filter((m) => m.category === 'park').map((m) => m.id);
  assert.deepEqual(parkSites, ['mellat-park', 'mellat-lake', 'mellat-sports']);
  const parkMissions = MISSIONS.filter((m) => m.steps.some((s) => parkSites.includes(s.target)));
  assert.ok(parkMissions.length > MISSIONS.length / 2, 'most missions are about park machines');
});

test('The first mission is: go to the factory, then buy there', () => {
  const state = createState();
  assert.equal(currentMission(state).id, 'firstBuy');
  assert.equal(currentStepText(state), strings.steps.goto(machineById('factory').name));
  assert.equal(buyAt(state, 'factory').stepDone, false, 'buying before arriving does not count');
  assert.deepEqual(applyMissionEvent(state, { type: 'arrive', machineId: 'factory' }), {
    stepDone: true,
    mission: null,
  });
  const balance = state.balance,
    xp = state.xp;
  const result = buyAt(state, 'factory');
  assert.equal(result.mission.id, 'firstBuy');
  assert.equal(state.xp, xp + result.mission.reward.xp);
  assert.ok(state.balance > balance, 'reward paid after the purchase');
  assert.deepEqual(state.missionsDone, ['firstBuy']);
  assert.equal(stepTarget(state), 'mellat-park');
});

test('Park missions chain locate, goto, inspect, order and buy steps', () => {
  const state = createState();
  state.missionIndex = 1;
  const steps = [
    ['locate', 'mellat-park'],
    ['arrive', 'mellat-park'],
  ];
  for (const [type, machineId] of steps) applyMissionEvent(state, { type, machineId });
  assert.equal(applyMissionEvent(state, { type: 'buy', machineId: 'mellat-lake' }).stepDone, false);
  assert.equal(buyAt(state, 'mellat-park').mission.id, 'parkGate');
  applyMissionEvent(state, { type: 'arrive', machineId: 'mellat-lake' });
  assert.equal(currentStep(state).type, 'inspect');
  assert.equal(
    applyMissionEvent(state, { type: 'inspect', machineId: 'mellat-lake' }).mission.id,
    'parkLake',
  );
  applyMissionEvent(state, { type: 'arrive', machineId: 'mellat-sports' });
  applyMissionEvent(state, { type: 'inspect', machineId: 'mellat-sports' });
  assert.equal(
    applyMissionEvent(state, { type: 'order', machineId: 'mellat-sports' }).mission.id,
    'parkSports',
  );
  buyAt(state, 'mellat-lake');
  assert.equal(buyAt(state, 'mellat-sports').mission.id, 'parkTour');
});

test('The explorer mission counts different city machines and shows progress', () => {
  const state = createState();
  state.missionIndex = MISSIONS.findIndex((m) => m.id === 'explorer');
  for (const id of ['mellat-park', 'mellat-lake', 'ferdowsi-university', 'azadi-metro'])
    assert.equal(buyAt(state, id).stepDone, false);
  assert.ok(currentStepText(state).includes('۴'));
  assert.equal(buyAt(state, 'factory').stepDone, false, 'the factory does not count');
  assert.equal(buyAt(state, 'mellat-sports').mission.id, 'explorer');
  assert.equal(currentStepText(state), strings.steps.allDone);
  const items = missionListItems(state);
  assert.ok(items.every((item) => !item.active && item.steps.length === 0));
});
