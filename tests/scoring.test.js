import test from 'node:test';
import assert from 'node:assert/strict';
import { awardsFor, rankFor, POINTS, RANKS } from '../src/game/economy/scoring.js';
import { createState, purchase } from '../src/game/economy/gameState.js';
import { machineById } from '../src/constants/locations.js';

const total = (awards) => awards.reduce((s, a) => s + a.points, 0);

test('Discovery, combo and all-category bonuses are paid once', () => {
  const state = createState(),
    park = machineById('mellat-park');
  const buy = (machine, product) => {
    const before = state.purchases.slice();
    return awardsFor(before, purchase(state, machine, product));
  };
  assert.equal(total(buy(park, 'water')), POINTS.purchase + POINTS.discovery);
  assert.equal(total(buy(park, 'juice')), POINTS.purchase, 'same type: no combo');
  assert.equal(total(buy(park, 'cake')), POINTS.purchase + POINTS.combo);
  assert.equal(total(buy(park, 'water')), POINTS.purchase, 'combo only once');
  buy(machineById('factory'), 'water');
  buy(machineById('school-rahil'), 'water');
  buy(machineById('ferdowsi-university'), 'water');
  buy(machineById('azadi-metro'), 'water');
  state.minutes = 11 * 60;
  const last = buy(machineById('mashhad-mall'), 'water');
  assert.ok(last.some((a) => a.points === POINTS.allCategories));
});

test('Ranks advance with experience', () => {
  assert.equal(rankFor(0).name, RANKS[0].name);
  assert.equal(rankFor(RANKS[1].xp).index, 1);
  assert.equal(rankFor(1e6).progress, 1);
});
