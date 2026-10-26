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
for(let id=1;id<=COUNT;id++) {
  // Introductory chapters increase tile count and stack depth gradually. Thereafter
  // cycle the complete library, interspersing smaller, relaxing garden boards.
  let pool;
  if(id<=10) pool=layouts.filter(l=>l.id.startsWith('intro-')&&l.tileCount<=40);
  else if(id<=30) pool=layouts.filter(l=>l.id.startsWith('intro-')&&l.tileCount<=60);
  else if(id<=60) pool=layouts.filter(l=>l.tileCount<=84&&l.layers<=3);
  else if(id<=120) pool=layouts.filter(l=>l.tileCount<=120&&l.layers<=4);
  else if(id<=240) pool=layouts.filter(l=>l.complexity<=24);
  else if(id%10===0) pool=layouts.filter(l=>l.tileCount<=84&&l.layers<=3);
  else pool=layouts;
  const poolKey=pool.map(l=>l.id).join(',');
  let cycle=cycles.get(poolKey);
  if(!cycle?.length) { cycle=shuffleArray([...pool],seededRandom(Math.imul(id,2654435761))); cycles.set(poolKey,cycle); }
  let layout=id===1?layouts.find(l=>l.id==='intro-1'):cycle.pop();
  if(layout.id===lastLayout&&cycle.length) {cycle.unshift(layout); layout=cycle.pop();}
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
