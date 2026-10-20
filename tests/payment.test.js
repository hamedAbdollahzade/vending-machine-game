import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,productByCode} from '../src/game-state.js';
import {createPayment,beginPayment,swipePayment,cancelPayment} from '../src/payment.js';
test('Payment charges once, only after ready and explicit swipe',()=>{
 const s=createState(),p=createPayment(),product=productByCode('21');assert.ok(product);
 assert.ok(beginPayment(s,p,product));assert.equal(s.balance,500);assert.equal(s.basket.length,0);assert.equal(s.busy,true);
 assert.equal(swipePayment(s,p),false);assert.equal(beginPayment(s,p,product),false);
 p.phase='ready';assert.ok(swipePayment(s,p));assert.equal(s.balance,500-product.cost);assert.equal(s.basket.length,1);
 assert.equal(swipePayment(s,p),false);assert.equal(cancelPayment(s,p),false);
});
test('Cancel or invalid payment never changes balance or basket',()=>{
 const s=createState(),p=createPayment();assert.equal(beginPayment(s,p,productByCode('20')),false);
 assert.ok(beginPayment(s,p,productByCode('60')));assert.ok(cancelPayment(s,p));assert.equal(s.balance,500);assert.equal(s.basket.length,0);assert.equal(s.busy,false);
});
