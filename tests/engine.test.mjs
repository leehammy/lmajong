import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame,isFree,isFreeAmong,isMatch,findHint,matchPair,undo,reshuffle,remaining,generateDeal,generateRemovalSequence,seededRandom,FACES,validateSolution,spriteName} from '../src/engine.js';
const layouts=JSON.parse(fs.readFileSync(new URL('../data/layouts.json',import.meta.url),'utf8'));
const levels=JSON.parse(fs.readFileSync(new URL('../data/levels.json',import.meta.url),'utf8')).levels;
const byId=new Map(layouts.map(l=>[l.id,l]));
function replay(game) {
  for(const [a,b] of game.solution) if(game.tiles[a].active||game.tiles[b].active) assert(matchPair(game,a,b),'Witness must be playable');
  assert.equal(remaining(game.tiles),0);
}
test('seeded generator reproduces both faces and proof',()=>{
  for(const level of levels.filter((_,i)=>i%101===0)) assert.deepEqual(generateDeal(byId.get(level.layoutId),level.seed,level.difficulty),{faces:level.faces,solution:level.solution});
});
test('upstream side and top rules, including half-row offsets',()=>{
  const tiles=[{x:2,y:2,z:0},{x:0,y:1,z:0},{x:4,y:3,z:0},{x:3,y:3,z:1}].map((p,id)=>({...p,id,active:true}));
  assert.equal(isFree(tiles[0],tiles),false);tiles[3].active=false;
  assert.equal(isFree(tiles[0],tiles),false);tiles[1].active=false;
  assert.equal(isFree(tiles[0],tiles),true);tiles[0].active=false;
  assert.equal(isFree(tiles[0],tiles),false);
});
test('cached removal generation agrees with original non-cached free-tile rule',()=>{
  for(const layout of layouts.filter((_,i)=>i%7===0)) {
    const sequence=generateRemovalSequence(layout.positions,seededRandom(72));
    if(!sequence) continue;
    const present=new Set(layout.positions.map((_,i)=>i));
    for(const [a,b] of sequence) {
      assert(isFreeAmong(layout.positions[a],layout.positions,present));
      assert(isFreeAmong(layout.positions[b],layout.positions,present));
      present.delete(a);present.delete(b);
    }
    assert.equal(present.size,0);
  }
});
test('flowers and seasons retain upstream group matching, ordinary faces are exact',()=>{
  assert(isMatch({suit:'flower',val:1},{suit:'flower',val:4}));
  assert(isMatch({suit:'season',val:1},{suit:'season',val:3}));
  assert(!isMatch({suit:'flower',val:1},{suit:'season',val:1}));
  assert(!isMatch({suit:'bamboo',val:1},{suit:'bamboo',val:2}));
  assert.equal(spriteName('dragon',3),'Haku');
});
test('illegal moves leave state unchanged; hint, match and undo survive serialization',()=>{
  const level=levels[0],game=createGame(level,byId.get(level.layoutId));
  const before=structuredClone(game);
  assert.equal(matchPair(game,0,0),false);assert.equal(matchPair(game,0,999),false);
  assert.deepEqual(game,before);
  const hint=findHint(game.tiles);assert(hint);assert(matchPair(game,...hint));
  assert.equal(remaining(game.tiles),before.tiles.length-2);
  const restored=JSON.parse(JSON.stringify(game));assert(undo(restored));assert.deepEqual(restored,before);
  assert.equal(undo(restored),false);
});
test('every 144-tile deal has the complete traditional deck',()=>{
  const level=levels.find(l=>l.faces.length===144),counts=Array(FACES.length).fill(0);
  for(const f of level.faces) counts[f]++;
  assert(counts.slice(0,34).every(n=>n===4));assert(counts.slice(34).every(n=>n===1));
});
test('reshuffle preserves remaining face multiset and gives a complete winning continuation',()=>{
  for(const level of levels.filter((_,i)=>i%73===0)) {
    const game=createGame(level,byId.get(level.layoutId));
    for(const pair of level.solution.slice(0,Math.floor(level.solution.length/3))) assert(matchPair(game,...pair));
    const activeIds=game.tiles.filter(t=>t.active).map(t=>t.id);
    const faces=game.tiles.filter(t=>t.active).map(t=>t.suit+':'+t.val).sort();
    const result=reshuffle(game);assert.equal(result.reset,false);
    assert.deepEqual(game.tiles.filter(t=>t.active).map(t=>t.id),activeIds);
    assert.deepEqual(game.tiles.filter(t=>t.active).map(t=>t.suit+':'+t.val).sort(),faces);
    assert.equal(game.history.length,0);replay(game);
  }
});
test('an impossible remaining two-tile stack gets a free fresh solvable board',()=>{
  const layout={id:'stack-case',positions:[{x:0,y:0,z:0},{x:0,y:0,z:1},{x:4,y:0,z:0},{x:6,y:0,z:0}]};
  const level={id:1,layoutId:layout.id,seed:18,difficulty:1,...generateDeal(layout,18,1)};
  const game=createGame(level,layout);assert(matchPair(game,2,3));
  assert.equal(findHint(game.tiles),null);assert.deepEqual(reshuffle(game),{reset:true});
  assert.equal(remaining(game.tiles),4);assert.equal(game.history.length,0);replay(game);
});
test('arbitrary legal choices can always recover using free reshuffle',()=>{
  for(const level of levels.filter((_,i)=>i%61===0)) {
    const game=createGame(level,byId.get(level.layoutId));
    for(let moves=0;moves<15;moves++) { const hint=findHint(game.tiles);if(!hint)break;assert(matchPair(game,...hint)); }
    if(!remaining(game.tiles))continue;
    reshuffle(game);assert(findHint(game.tiles));replay(game);
  }
});
test('invalid witnesses and odd/unprovable geometry are rejected',()=>{
  const p=[{x:0,y:0,z:0},{x:0,y:0,z:1}];
  assert.throws(()=>generateDeal(p,1));assert.throws(()=>generateDeal(p.slice(0,1),1));
  assert.equal(validateSolution(p,[0,0],[[0,1]]),false);
  const level=levels[0],layout=byId.get(level.layoutId);
  assert.equal(validateSolution(layout.positions,level.faces,[[0,0],...level.solution.slice(1)]),false);
});
