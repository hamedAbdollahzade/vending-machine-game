import test from 'node:test';
import assert from 'node:assert/strict';
import {canWalk,movementDirection} from '../src/controls.js';
import {products,createState,purchase,INITIAL_BALANCE,formatHetoman} from '../src/game-state.js';
import {createFamily} from '../src/characters.js';
test('Dialogue pauses walking; arrows up/down only zoom',()=>{
 assert.equal(canWalk({chapterId:'bridge'}),false);assert.equal(canWalk({chapterId:'fish'}),false);
 assert.ok(canWalk({chapterId:null}));
 assert.equal(canWalk({busy:true}),false);assert.equal(canWalk({shopOpen:true}),false);
 assert.equal(movementDirection(new Set(['arrowup']),new Set()),0);
 assert.equal(movementDirection(new Set(['arrowright']),new Set()),1);
 assert.equal(movementDirection(new Set(),new Set([-1])),-1);
});
test('Toman balance, charges and picnic reserve',()=>{
 assert.equal(INITIAL_BALANCE,500);assert.match(formatHetoman(15),/هتومان/);
 for(const p of products){const s=createState();assert.ok(purchase(s,p.id));assert.equal(s.balance,INITIAL_BALANCE-p.cost);}
 const s={...createState(),balance:40};assert.equal(purchase(s,'channel-22'),null);assert.equal(s.balance,40);assert.ok(purchase(s,'channel-23'));s.busy=false;assert.ok(purchase(s,'channel-24'));assert.equal(s.balance,0);
});
test('Character transforms stay finite through walk, pickup and sitting',()=>{
 const f=createFamily();for(const facing of [-Math.PI/2,Math.PI/2,Math.PI])for(const mode of ['walk','shop','sit']){
 f.update({time:3,gait:2,dt:.016,moving:mode==='walk',facing,shopping:mode==='shop',finished:mode==='sit'});f.group.updateMatrixWorld(true);f.group.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));
 }
});

test('Sixty channels, exactly 21–60 purchasable, Hetoman conversion',async()=>{
 const {channels,productByCode,hetomanToRial}=await import('../src/game-state.js');
 assert.equal(channels.length,60);assert.equal(products.length,40);
 assert.equal(hetomanToRial(10),100000);
 for(let n=1;n<=60;n++){assert.equal(Boolean(productByCode(String(n))),n>=21);}
 assert.equal(productByCode('۲۲').channel,22);assert.equal(productByCode('٦٠').channel,60);assert.equal(productByCode('61'),null);
 const s=createState();assert.equal(purchase(s,'channel-20'),null);assert.equal(s.balance,500);
});

 test('Robot Market mascot replaces the child and keeps its articulated rig',()=>{
 const family=createFamily();
 const robot=family.group.getObjectByName('robot-market-mascot');
 assert.ok(robot);
 assert.equal(family.group.children.filter(node=>node.type==='Group').length,2);
 for(const mode of ['walk','shop','sit']){
  family.update({time:2,gait:1,dt:.016,moving:mode==='walk',facing:Math.PI/2,shopping:mode==='shop',delivery:mode==='shop',finished:mode==='sit'});
  family.group.updateMatrixWorld(true);
  robot.traverse(node=>assert.ok(node.matrixWorld.elements.every(Number.isFinite)));
 }
 });
