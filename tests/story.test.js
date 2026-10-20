import test from 'node:test';
import assert from 'node:assert/strict';
import {createStory,completeChapter,nextChapter,storyReady,routeOffset,discoveries} from '../src/story.js';
import {createState,purchase,readyForPicnic,productByCode} from '../src/game-state.js';
for(const route of ['sunny'])test(`Complete ${route} story and picnic`,()=>{
 const story=createStory();assert.equal(nextChapter(story,-8),'morning');
 for(const [id,x,choice] of [['morning',-8],['rabbit',-3,'watch'],['bridge',-2],['fish',0],['courage',3],['wind',12],['paper',14,'recover'],['fork',16,route],[route,19]]){
 assert.equal(nextChapter(story,x),id);assert.ok(completeChapter(story,id,choice));assert.equal(completeChapter(story,id,choice),false);
 }
 assert.ok(storyReady(story));assert.equal(nextChapter(story,22),null);assert.ok(discoveries(story).length>=5);
 assert.equal(routeOffset(story,16),0);assert.equal(routeOffset(story,21),0);assert.equal(Math.sign(routeOffset(story,18)),route==='sunny'?1:-1);
 assert.equal(completeChapter(story,'summit','invalid'),false);assert.ok(completeChapter(story,'summit','gold'));assert.equal(story.sky,'gold');
 const state=createState();assert.ok(purchase(state,productByCode('۲۲').id));state.busy=false;assert.ok(purchase(state,productByCode('۲۴').id));assert.ok(readyForPicnic(state));assert.equal(state.balance,440);
});
test('No early triggers, unknown choices, or leaked reset state',()=>{
 const story=createStory();assert.equal(storyReady(story),false);completeChapter(story,'morning');assert.equal(nextChapter(story,-8),null);
 assert.equal(completeChapter(story,'rabbit','wrong'),false);assert.equal(completeChapter(story,'unknown'),false);
 assert.deepEqual(discoveries(createStory()),[]);assert.equal(routeOffset(createStory(),18),0);
});

test('Every story action exposes one fixed action instead of choices',async()=>{
 const {chapters}=await import('../src/story.js');
 for(const chapter of Object.values(chapters))assert.equal(chapter.choices,undefined);
 for(const id of ['rabbit','paper','fork','summit']){const s=createStory();assert.equal(completeChapter(s,id,'wrong'),false);assert.ok(completeChapter(s,id,chapters[id].action.value));}
});
