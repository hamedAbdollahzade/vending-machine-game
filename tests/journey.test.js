import test from 'node:test';
import assert from 'node:assert/strict';
import {createJourney, advanceJourney, tickJourney} from '../src/journey.js';

test('Driving requires player input and exit requires F at the entrance', () => {
 const j=createJourney();tickJourney(j,20);assert.equal(j.phase,'home');
 assert.ok(advanceJourney(j));tickJourney(j,2,true);assert.equal(j.phase,'boarding');
 tickJourney(j,2);assert.equal(j.phase,'driving');
 tickJourney(j,30);assert.equal(j.distance,0);assert.equal(j.phase,'driving');assert.equal(advanceJourney(j),false);
 for(let i=0;i<200;i++)tickJourney(j,.05,false,{throttle:1});
 assert.equal(j.phase,'entrance');assert.equal(j.distance,21);assert.equal(j.speed,0);
 tickJourney(j,20);assert.equal(j.phase,'entrance');assert.ok(advanceJourney(j));assert.equal(j.phase,'walking');
 assert.equal(advanceJourney(j),false);assert.equal(createJourney().distance,0);
});
test('Brake, steering bounds and pause work while driving', () => {
 const j=createJourney();advanceJourney(j);tickJourney(j,2);
 for(let i=0;i<20;i++)tickJourney(j,.05,false,{throttle:1,steer:1});
 assert.ok(j.speed>0);assert.ok(j.lane>0 && j.lane<=.75);
 const snapshot={...j};tickJourney(j,1,true,{throttle:1});assert.deepEqual(j,snapshot);
 for(let i=0;i<30;i++)tickJourney(j,.05,false,{throttle:-1});
 assert.equal(j.speed,0);assert.equal(j.phase,'driving');
});
