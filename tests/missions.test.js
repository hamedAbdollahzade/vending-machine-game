import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, purchase } from '../src/game/economy/gameState.js';
import { machineById, machines } from '../src/constants/locations.js';
import { MISSIONS, missionOrder } from '../src/game/missions/missions.js';
import { FACTORY_POINT_IDS } from '../src/constants/factoryPoints.js';
import { boardLines } from '../src/game/models/aboutBoards.js';
import { COMPANY } from '../src/config/company.js';
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

test('Every mission step points at a real machine or factory place and has text', () => {
  for (const mission of MISSIONS) {
    assert.ok(strings.missions[mission.id], `title for ${mission.id}`);
    for (const step of mission.steps) {
      assert.ok(strings.steps[step.type], `text for ${step.type}`);
      if (!step.target) continue;
      const known = machineById(step.target) || FACTORY_POINT_IDS.includes(step.target);
      assert.ok(known, `target ${step.target}`);
    }
  }
  const parkSites = machines.filter((m) => m.category === 'park').map((m) => m.id);
  assert.deepEqual(parkSites, ['mellat-park', 'mellat-lake', 'mellat-sports']);
  const parkMissions = MISSIONS.filter((m) => m.steps.some((s) => parkSites.includes(s.target)));
  // The About Us and products tours stay in the factory; out in the city, the park leads.
  const cityMissions = MISSIONS.filter((m) =>
    m.steps.every((s) => !FACTORY_POINT_IDS.includes(s.target)),
  );
  assert.ok(parkMissions.length > cityMissions.length / 2, 'most city missions are in the park');
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
  assert.equal(stepTarget(state), 'board-about', 'then the About Us tour, still in the factory');
});

test('Park missions chain locate, goto, inspect, order and buy steps', () => {
  const state = createState();
  state.missionIndex = state.missionOrder.indexOf('parkGate');
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

test('Each start mode leads with its own mission and keeps all the others', () => {
  assert.equal(missionOrder('offline')[0], 'firstBuy');
  assert.equal(missionOrder('real')[0], 'firstBuy');
  assert.equal(missionOrder('about')[0], 'aboutTour');
  assert.equal(missionOrder('products')[0], 'productsTour');
  const all = MISSIONS.map((m) => m.id).sort();
  for (const mode of ['real', 'offline', 'about', 'products', undefined])
    assert.deepEqual([...missionOrder(mode)].sort(), all);
});

test('The About Us tour: read the boards and meet Mr Mohammadi', () => {
  const state = createState();
  state.missionOrder = missionOrder('about');
  assert.equal(currentStepText(state), strings.steps.read(strings.points['board-about']));
  const read = (id) => applyMissionEvent(state, { type: 'read', machineId: id });
  assert.equal(read('board-contact').stepDone, false, 'boards are read in order');
  assert.equal(read('board-about').stepDone, true);
  assert.equal(stepTarget(state), 'mohammadi');
  assert.equal(applyMissionEvent(state, { type: 'meet', machineId: 'mohammadi' }).stepDone, true);
  assert.equal(read('board-contact').mission.id, 'aboutTour');
  assert.equal(currentMission(state).id, 'firstBuy', 'the rest follow in list order');
  assert.equal(missionListItems(state)[0].title, strings.missions.aboutTour);
});

test('The products tour: open the hall, ask the robot, send a purchase request', () => {
  const state = createState();
  state.missionOrder = missionOrder('products');
  for (const type of ['view', 'ask']) applyMissionEvent(state, { type, machineId: 'showroom' });
  const result = applyMissionEvent(state, { type: 'request', machineId: 'showroom' });
  assert.equal(result.mission.id, 'productsTour');
});

test('Boards show the company details from the config', () => {
  assert.equal(boardLines('about')[0], COMPANY.about.history);
  assert.equal(boardLines('about').length, 1 + COMPANY.about.values.length);
  assert.ok(boardLines('contact').some((line) => line.includes(COMPANY.contact.phone)));
  assert.ok(boardLines('address')[0].includes(COMPANY.contact.address));
});
