import test from 'node:test';
import assert from 'node:assert/strict';
import {smoothFix, arrivalRadius, insideWorld} from '../src/realworld.js';

test('GPS fixes blend by accuracy and a stale estimate is replaced', () => {
    const first = smoothFix(null, {x: 0, z: 0, accuracy: 10, time: 0});
    assert.deepEqual([first.x, first.z], [0, 0]);
    const equal = smoothFix(first, {x: 10, z: 0, accuracy: 10, time: 1000});
    assert.ok(Math.abs(equal.x - 5) < 1e-9, 'equal accuracy meets halfway');
    assert.ok(equal.accuracy < 10, 'two fixes are better than one');
    const poor = smoothFix(first, {x: 50, z: 0, accuracy: 60, time: 1000});
    assert.ok(poor.x < 3, 'a poor fix barely moves a good estimate');
    const stale = smoothFix(first, {x: 99, z: 0, accuracy: 30, time: 60000});
    assert.equal(stale.x, 99);
});

test('Arrival radius widens with poor GPS and bounds check the world', () => {
    assert.equal(arrivalRadius(5), 20);
    assert.equal(arrivalRadius(20), 30);
    assert.equal(arrivalRadius(100), 40);
    const bounds = {minX: -10, minZ: -10, maxX: 10, maxZ: 10};
    assert.ok(insideWorld(bounds, 0, 0));
    assert.equal(insideWorld(bounds, 11, 0), false);
});
