import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { generateDeal, seededRandom, shuffleArray, validateSolution } from '../src/engine.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const layouts = JSON.parse(fs.readFileSync(path.join(root,'data/layouts.json'),'utf8'));
const COUNT = 5200;
const levels=[], seen=new Set();
let lastLayout='', cycles=new Map();
const fit=(min,max,minLayers,maxLayers,from=layouts)=>from.filter(l=>l.tileCount>=min&&l.tileCount<=max&&l.layers>=minLayers&&l.layers<=maxLayers);
// Full donor boards; the derived "Little" crops and crafted shapes serve the opening and the breathers.
const classic=layouts.filter(l=>!l.id.includes('-little-')&&!l.id.startsWith('garden-')&&!l.id.startsWith('opening-'));
// Levels 1–16 are the hand-designed opening boards in order; the bands continue from there.
const openings=layouts.filter(l=>l.id.startsWith('opening-')).sort((a,b)=>a.id.localeCompare(b.id));
const BANDS=[
  {from:17,to:30,pool:fit(60,90,3,6)},{from:31,to:60,pool:fit(60,96,3,5)},{from:61,to:100,pool:fit(76,120,3,6)},
  {from:101,to:150,pool:fit(96,144,2,9,classic)}];
// One board per level from evenly spaced complexity buckets, chosen within the bucket by seed.
function bandPick(band,id) {
  if(!band.picks) {
    const sorted=[...band.pool].sort((a,b)=>a.complexity-b.complexity||a.id.localeCompare(b.id)),count=band.to-band.from+1,random=seededRandom(band.from*7919);
    band.picks=Array.from({length:count},(_,i)=>{const lo=Math.floor(i*sorted.length/count),hi=Math.max(lo+1,Math.floor((i+1)*sorted.length/count));return sorted[lo+Math.floor(random()*(hi-lo))];});
  }
  return band.picks[id-band.from];
}
for(let id=1;id<=COUNT;id++) {
  // After the opening boards the Journey climbs through size bands; within each band boards are taken in order of
  // complexity so every level is a little bigger or deeper than the last. From level 151 the whole
  // library cycles, with a smaller layered breather every sixth level.
  let layout;
  const band=BANDS.find(b=>id>=b.from&&id<=b.to);
  if(id<=openings.length) layout=openings[id-1];
  else if(band) layout=bandPick(band,id);
  else {
    const pool=id%6===0?fit(40,80,2,9):fit(84,144,1,9,classic);
    const poolKey=pool.map(l=>l.id).join(',');
    let cycle=cycles.get(poolKey);
    if(!cycle?.length) { cycle=shuffleArray([...pool],seededRandom(Math.imul(id,2654435761))); cycles.set(poolKey,cycle); }
    layout=cycle.pop();
    if(layout.id===lastLayout&&cycle.length) {cycle.unshift(layout); layout=cycle.pop();}
  }
  lastLayout=layout.id;
  const difficulty=layout.tileCount<=60&&layout.layers<=2?1:layout.complexity<=21?2:3;
  let seed=(0x4c534d4a+Math.imul(id,0x9e3779b1))>>>0,deal,key;
  for(let attempt=0;attempt<100;attempt++,seed=(seed+1)>>>0) {
    try { deal=generateDeal(layout,seed,difficulty); } catch {continue;}
    key=createHash('sha256').update(layout.geometryHash+':'+deal.faces.join(',')).digest('hex');
    if(!seen.has(key)&&validateSolution(layout.positions,deal.faces,deal.solution)) break;
    deal=null;
  }
  if(!deal) throw new Error('Unable to generate unique proven level '+id);
  seen.add(key);
  levels.push({id,layoutId:layout.id,seed,difficulty,chapter:Math.ceil(id/20),...deal,boardHash:key});
  if(id%1000===0) console.log('Generated and replayed '+id+' levels');
}
fs.writeFileSync(path.join(root,'data/levels.json'),JSON.stringify({version:1,count:levels.length,levels}));
console.log(JSON.stringify({count:levels.length,uniqueBoards:seen.size,layoutCount:new Set(levels.map(l=>l.layoutId)).size,bytes:fs.statSync(path.join(root,'data/levels.json')).size}));
