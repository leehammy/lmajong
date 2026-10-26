import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createGame,matchPair,remaining,FACES,generateDeal,validateSolution} from '../src/engine.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const layouts=JSON.parse(fs.readFileSync(path.join(root,'data/layouts.json'),'utf8'));
const content=JSON.parse(fs.readFileSync(path.join(root,'data/levels.json'),'utf8'));
function canonical(positions,faces=null) {
  const variants=[];
  for(const swap of [false,true]) for(const sx of [-1,1]) for(const sy of [-1,1]) {
    const points=positions.map((p,i)=>({x:(swap?p.y:p.x)*sx,y:(swap?p.x:p.y)*sy,z:p.z,f:faces?.[i]}));
    const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y));
    variants.push(JSON.stringify(points.map(p=>[p.z,p.x-x,p.y-y,...(faces?[p.f]:[])]).sort((a,b)=>a[0]-b[0]||a[2]-b[2]||a[1]-b[1])));
  }
  return variants.sort()[0];
}
const sha=s=>createHash('sha256').update(s).digest('hex');
const geometry=new Set(), ids=new Set(), byId=new Map();
for(const layout of layouts) {
  assert(!ids.has(layout.id),'Duplicate layout ID');ids.add(layout.id);byId.set(layout.id,layout);
  assert(layout.positions.length>=24&&layout.positions.length<=144&&layout.positions.length%2===0);
  const geom=canonical(layout.positions);assert(!geometry.has(geom),'Duplicate geometry up to all eight planar transforms');geometry.add(geom);
  for(const [i,p] of layout.positions.entries()) {
    assert([p.x,p.y,p.z].every(Number.isInteger)&&p.x>=0&&p.y>=0&&p.z>=0);
    assert(!layout.positions.some((q,j)=>j<i&&p.z===q.z&&Math.abs(p.x-q.x)<2&&Math.abs(p.y-q.y)<2),'Overlapping same-layer positions');
    if(p.z>0) assert(layout.positions.some(q=>q.z===p.z-1&&Math.abs(p.x-q.x)<2&&Math.abs(p.y-q.y)<2),'Unsupported upper tile');
  }
}
assert(content.count===content.levels.length&&content.count>=5000);
const boards=new Set(),used=new Set(),chapters=[];
for(const [index,level] of content.levels.entries()) {
  assert(level.id===index+1,'Journey IDs must be consecutive');
  const layout=byId.get(level.layoutId);assert(layout,'Missing layout');used.add(level.layoutId);
  assert(Number.isInteger(level.seed)&&level.seed>=0&&level.seed<=0xffffffff);
  assert(level.difficulty>=1&&level.difficulty<=3);
  assert(level.faces.every(f=>Number.isInteger(f)&&!!FACES[f]));
  const counts=new Map();
  for(const f of level.faces) {const face=FACES[f],key=['flower','season'].includes(face.suit)?face.suit:face.suit+face.val; counts.set(key,(counts.get(key)??0)+1);}
  assert([...counts.values()].every(n=>n%2===0),'Odd matching-group count');
  assert(validateSolution(layout.positions,level.faces,level.solution),'Independent original-rule witness replay failed');
  const game=createGame(level,layout);
  for(const [a,b] of level.solution) assert(matchPair(game,a,b),'Gameplay API rejected witness move');
  assert(remaining(game.tiles)===0,'Board did not clear');
  const board=sha(canonical(layout.positions,level.faces));assert(!boards.has(board),'Duplicate deal up to planar transforms');boards.add(board);
  assert(level.boardHash===sha(layout.geometryHash+':'+level.faces.join(',')),'Content hash mismatch');
  if(level.id<=16) assert.equal(layout.id,'opening-'+String(level.id).padStart(2,'0'),'Levels 1–16 are the designed opening boards');
  for(const [to,max] of [[5,44],[10,60],[30,90],[60,96],[100,120]]) if(level.id<=to) assert(layout.tileCount<=max,'Opening curve too large at level '+level.id);
  if(level.id<=150) assert(layout.layers>=2,'Every opening level is layered');
  const c=Math.floor(index/100);chapters[c]??={from:index+1,to:0,count:0,tiles:0,complexity:0};
  chapters[c].to=level.id;chapters[c].count++;chapters[c].tiles+=layout.tileCount;chapters[c].complexity+=layout.complexity;
  // Reproduction sample is deliberately spread throughout the entire Journey.
  if(index%53===0||index===content.levels.length-1) assert.deepEqual(generateDeal(layout,level.seed,level.difficulty),{faces:level.faces,solution:level.solution},'Seed reproduction drift');
}
const report={version:'1.0.0',validated:true,levels:content.count,uniqueDealsIncludingReflections:boards.size,uniqueLayoutsIncludingReflections:geometry.size,layoutsUsed:used.size,tilesReplayed:content.levels.reduce((n,l)=>n+l.faces.length,0),tests:['Every stored winning sequence replayed against original free/match rules','Every stored winning sequence replayed through gameplay API','Every tile matching group has even parity','No same-layer overlap or unsupported upper tiles','All layouts unique up to translation/reflection/rotation','All boards unique including eight planar transforms','Opening tile/layer limits checked','100 deterministic reproduction samples checked'],curve:chapters.map(c=>({from:c.from,to:c.to,meanTiles:Number((c.tiles/c.count).toFixed(2)),meanGeometryComplexity:Number((c.complexity/c.count).toFixed(2))})),contentSha256:sha(fs.readFileSync(path.join(root,'data/levels.json')))};
fs.writeFileSync(path.join(root,'data/validation-report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,curve:'See data/validation-report.json'},null,2));

