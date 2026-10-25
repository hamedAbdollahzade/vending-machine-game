import test from 'node:test';
import assert from 'node:assert/strict';
import {createState, purchaseBlocker, priceAt, canAffordAnything, formatClock} from '../src/game-state.js';
import {createPayment, beginPayment, readyPayment, swipePayment, cancelPayment} from '../src/payment.js';
import {machineById, machines} from '../src/locations.js';

const park = machineById('mellat-park'), school = machineById('school-rahil'), uni = machineById('ferdowsi-university');

test('Payment charges once, only after ready and an explicit swipe', () => {
    const state = createState(), payment = createPayment();
    assert.ok(beginPayment(state, payment, park, 'juice'));
    assert.equal(state.balance, 500);
    assert.equal(swipePayment(state, payment), false, 'not ready yet');
    assert.ok(readyPayment(payment));
    assert.ok(swipePayment(state, payment));
    assert.equal(state.balance, 465);
    assert.equal(swipePayment(state, payment), false, 'no double charge');
    assert.equal(state.purchases.length, 1);
    assert.equal(beginPayment(state, createPayment(), park, 'water'), false, 'busy until delivery ends');
});

test('Cancel, closed machines, unknown products and low funds never charge', () => {
    const state = createState(), payment = createPayment();
    assert.ok(beginPayment(state, payment, park, 'cake'));
    assert.ok(cancelPayment(state, payment));
    assert.equal(state.balance, 500);
    assert.equal(state.busy, false);
    assert.equal(purchaseBlocker(state, park, 'not-a-product'), 'unknown');
    assert.equal(purchaseBlocker(state, school, 'nuts'), 'unknown', 'school does not sell nuts');
    state.minutes = 14 * 60;
    assert.equal(purchaseBlocker(state, school, 'water'), 'closed');
    state.minutes = 9 * 60;
    state.balance = 10;
    assert.equal(purchaseBlocker(state, park, 'water'), 'funds');
    assert.equal(beginPayment(state, payment, park, 'water'), false);
});

test('Prices follow machine discounts and the clock is Persian', () => {
    assert.equal(priceAt(uni, 'nuts'), 52);
    assert.equal(priceAt(park, 'nuts'), 65);
    assert.equal(formatClock(8 * 60 + 5), '۰۸:۰۵');
    const state = createState();
    state.balance = 5;
    assert.equal(canAffordAnything(state, machines), false);
    state.balance = 15;
    assert.ok(canAffordAnything(state, machines));
});
