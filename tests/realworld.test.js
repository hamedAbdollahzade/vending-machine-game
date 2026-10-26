import test from 'node:test';
import assert from 'node:assert/strict';
import {smoothFix, arrivalRadius, insideWorld, createStabilizer} from '../src/realworld.js';

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
    assert.equal(arrivalRadius(4), 20);
    assert.equal(arrivalRadius(12), 30);
    assert.equal(arrivalRadius(100), 50);
    const bounds = {minX: -10, minZ: -10, maxX: 10, maxZ: 10};
    assert.ok(insideWorld(bounds, 0, 0));
    assert.equal(insideWorld(bounds, 11, 0), false);
});

test('Stable mode holds still through jitter, drops jumps and follows real walking', () => {
    const s = createStabilizer();
    s.push({x: 0, z: 0, accuracy: 8, time: 0, speed: 0});
    // Standing still: fixes wander by a few metres, the shown position does not move.
    for (let i = 1; i <= 10; i++) {
        const p = s.push({x: (i % 2 ? 3 : -3), z: (i % 3) - 1, accuracy: 8, time: i * 1000, speed: 0});
        assert.deepEqual([p.x, p.z], [0, 0]);
    }
    // A single 80 m jump one second later is impossible on foot and is dropped.
    assert.deepEqual([s.push({x: 80, z: 0, accuracy: 10, time: 11000, speed: 0}).x], [0]);
    // Walking east at 1.4 m/s: the shown position follows.
    let p;
    for (let i = 1; i <= 20; i++) p = s.push({x: 1.4 * i, z: 0, accuracy: 6, time: 11000 + i * 1000, speed: 1.4});
    assert.ok(p.x > 15, `followed the walk (${p.x})`);
    // With stable mode off every smoothed fix is shown.
    const raw = createStabilizer();
    raw.stable = false;
    raw.push({x: 0, z: 0, accuracy: 8, time: 0});
    assert.ok(raw.push({x: 3, z: 0, accuracy: 8, time: 1000}).x > 1);
});

test('AR camera faces north/west with the phone held upright, and the FOV fits the screen', async () => {
    const {Quaternion, Vector3} = await import('three');
    const {orientationQuaternion, coverFov} = await import('../src/ar.js');
    const look = (alpha, beta = 90, gamma = 0, angle = 0) => new Vector3(0, 0, -1).applyQuaternion(orientationQuaternion(new Quaternion(), alpha, beta, gamma, angle));
    const north = look(0);
    assert.ok(north.z < -.99, 'upright phone with alpha 0 looks north (−z)');
    assert.ok(look(90).x < -.99, 'alpha 90 (turned left) looks west (−x)');
    assert.ok(look(0, 0).y < -.99, 'phone lying flat looks at the ground');
    // Portrait 9:19.5 screen over a 3:4 portrait video: the full long-side 65° shows vertically.
    assert.ok(Math.abs(coverFov(3 / 4, 9 / 19.5) - 65) < .5);
    // Landscape screen wider than the 4:3 video: the width shows 65°, so the vertical view is narrower.
    assert.ok(coverFov(4 / 3, 19.5 / 9) < 35);
});
