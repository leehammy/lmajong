import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { proveGeometry, isFreeAmong } from '../src/engine.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vendor = path.join(root, 'vendor/layout-sources');
const out = path.join(root, 'data');
const read = p => fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
export function normalize(positions) {
  const minX = Math.min(...positions.map(p => p.x)), minY = Math.min(...positions.map(p => p.y)), minZ = Math.min(...positions.map(p => p.z));
  return positions.map(p => ({ x: p.x - minX, y: p.y - minY, z: p.z - minZ })).sort((a,b) => a.z-b.z || a.y-b.y || a.x-b.x);
}
export function geometryKey(positions) {
  return [false,true].flatMap(swap => [-1,1].flatMap(sx => [-1,1].map(sy =>
    JSON.stringify(normalize(positions.map(p => ({x:(swap?p.y:p.x)*sx,y:(swap?p.x:p.y)*sy,z:p.z}))))))).sort()[0];
}
const candidates = [];
const add = (id,name,positions,source,license,author='') => candidates.push({id,name,positions,source,license,author});
// The original foundation layouts remain in the shared half-tile coordinate system.
const primary = vm.runInNewContext(read(path.join(vendor,'myMahjong/layouts.js')) + '\n({TURTLE:LAYOUT_TURTLE,PYRAMID:LAYOUT_PYRAMID,DRAGON:LAYOUT_DRAGON,SIMPLE:LAYOUT_SIMPLE})');
for (const [name,positions] of Object.entries(primary)) add('mymahjong-'+name.toLowerCase(),name[0]+name.slice(1).toLowerCase(),positions,'myMahjong/layouts.js','Unlicense','tcottrill');
// Gentle crops of the foundation Simple base layer. These are deliberate adaptations,
// not claims to additional historical donor layouts.
for (const [i,w,h] of [[1,6,4],[2,8,4],[3,6,6],[4,8,5],[5,8,6],[6,10,6],[7,10,7]]) {
  const positions = [];
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) positions.push({x:x*2,y:y*2,z:0});
  add('intro-'+i,['','First Garden','Quiet Pond','Bamboo Path','Stepping Stones','Sage Terrace','Garden Gate','Lantern Walk'][i],positions,'myMahjong/layouts.js (small-board adaptations)','Unlicense','L’s Majong contributors');
}
const expand = map => map.flatMap(([z,rows]) => rows.flatMap(([y,cells]) => (Array.isArray(cells)?cells:[cells]).flatMap(c => Array.isArray(c)?Array.from({length:c[1]},(_,i)=>({z,x:c[0]+i*2,y})):[{z,x:c,y}])));
for (const b of JSON.parse(read(path.join(vendor,'mah/boards.json')))) add('mah-'+b.id,b.name,expand(b.map),'mah/boards.json','MIT',b.by??'ffalt');
for (const file of fs.readdirSync(path.join(vendor,'kmahjongg')).filter(f=>f.endsWith('.layout')).sort()) {
  const lines = read(path.join(vendor,'kmahjongg',file)).trim().split(/\r?\n/), magic=lines.shift();
  let width=32,height=16;
  if(magic.endsWith('v1.1')) { width=Number(lines.shift().slice(1)); height=Number(lines.shift().slice(1)); lines.shift(); }
  const grid=lines.filter(l=>l&&!l.startsWith('#')).join(''), positions=[];
  for(let k=0;k<grid.length;k++) if(grid[k]==='1') positions.push({x:k%width,y:Math.floor(k/width)%height,z:Math.floor(k/(width*height))});
  const meta=read(path.join(vendor,'kmahjongg',file.replace('.layout','.desktop')));
  add('kde-'+file.replace('.layout',''),meta.match(/^Name=(.*)$/m)?.[1]??file,positions,'kmahjongg/'+file,'GPL-2.0-or-later',meta.match(/^Author=(.*)$/m)?.[1]??'KDE Games team');
}
const alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
for (const file of fs.readdirSync(path.join(vendor,'PySolFC')).filter(f=>/mahjongg[123L]\.py$/.test(f)).sort()) {
  const code=read(path.join(vendor,'PySolFC',file));
  // Only numeric registrations and literal layout strings are read; Python is not executed.
  for(const m of code.matchAll(/^r\((\d+),\s*"([^"]+)"([\s\S]*?)\n(?=r\(|#|$)/gm)) {
    const tail=m[3], start=tail.indexOf('layout='); if(start<0) continue;
    const encoded=[...tail.slice(start).matchAll(/"([A-Za-z0-9]+)"/g)].map(v=>v[1]).join('');
    if(encoded[0]!=='0'||(encoded.length-1)%3) continue;
    const positions=[];
    for(let i=1;i<encoded.length;i+=3) { const n=alphabet.indexOf(encoded[i]),z=Math.floor(n/7),height=n%7+1,x=alphabet.indexOf(encoded[i+1]),y=alphabet.indexOf(encoded[i+2]); for(let j=0;j<height;j++) positions.push({z:z+j,x,y}); }
    add('pysol-'+m[1],m[2],positions,'PySolFC/'+file+'#'+m[1],'GPL-3.0-or-later','Markus F. X. J. Oberhumer; Mt. Hood Playing Card Co.; Skomoroh; PySolFC contributors');
  }
}
const sr = await import('../vendor/layout-sources/ScriptRaccoon/coordinates.js');
add('scriptraccoon-turtle','Classic Turtle',sr.COORDINATES.map(([x,y,z])=>({x:x*2,y:y*2,z})),'ScriptRaccoon/coordinates.js','MIT','ScriptRaccoon');
for(const file of fs.readdirSync(path.join(vendor,'green-mahjong')).filter(f=>f.endsWith('.js'))) {
  const context={matchingGame:{}}; vm.runInNewContext(read(path.join(vendor,'green-mahjong',file)),context);
  for(const [name,b] of Object.entries(context.matchingGame)) if(b.positionX&&b.positionY&&b.shift) add('green-'+name,name.replace(/([A-Z])/g,' $1'),b.positionX.map((x,i)=>({x:x*2,y:b.positionY[i]*2,z:b.shift[i]})),'green-mahjong/'+file,'GPL-3.0-only','Daniel Beck');
}
const seen=new Map(), layouts=[], rejected=[];
for(const c of candidates) {
  let p=normalize(c.positions);
  const invalid=p.length<24||p.length>144||p.length%2||p.some(t=>![t.x,t.y,t.z].every(Number.isFinite)||![t.x,t.y,t.z].every(Number.isInteger)||t.z>6);
  if(invalid) {rejected.push({id:c.id,reason:'tile-count or coordinate bounds'});continue;}
  if(p.some((a,i)=>p.some((b,j)=>i<j&&a.z===b.z&&Math.abs(a.x-b.x)<2&&Math.abs(a.y-b.y)<2))) {rejected.push({id:c.id,reason:'same-layer overlap'});continue;}
  if(p.some(a=>a.z>0&&!p.some(b=>b.z===a.z-1&&Math.abs(a.x-b.x)<2&&Math.abs(a.y-b.y)<2))) {rejected.push({id:c.id,reason:'unsupported upper tile'});continue;}
  const key=geometryKey(p);
  if(seen.has(key)) { const prior=seen.get(key); prior.alsoFrom??=[]; prior.alsoFrom.push({source:c.source,license:c.license,name:c.name}); continue; }
  if(!proveGeometry(p,42,null,48)) {rejected.push({id:c.id,reason:'no solution proof under myMahjong rules'});continue;}
  // Favor landscape on the main iPad experience without distorting tile faces.
  if(Math.max(...p.map(t=>t.x))<Math.max(...p.map(t=>t.y))*0.9) p=normalize(p.map(t=>({x:t.y,y:t.x,z:t.z})));
  if(!proveGeometry(p,42,null,48)) {rejected.push({id:c.id,reason:'landscape orientation has no proof'});continue;}
  const present=new Set(p.map((_,i)=>i)),free=p.filter(t=>isFreeAmong(t,p,present)).length;
  const layout={...c,positions:p,geometryHash:createHash('sha256').update(key).digest('hex'),tileCount:p.length,layers:Math.max(...p.map(t=>t.z))+1,initialFree:free};
  layout.complexity=Number((p.length/12+(layout.layers-1)*4-free/8).toFixed(2));
  seen.set(key,layout);layouts.push(layout);
}
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'layouts.json'),JSON.stringify(layouts));
fs.writeFileSync(path.join(out,'layout-audit.json'),JSON.stringify({candidateCount:candidates.length,uniquePlayableLayouts:layouts.length,duplicateCandidates:candidates.length-layouts.length-rejected.length,rejected,licensePolicy:'Mahseum archive excluded: its MIT license explicitly excludes layouts. Green artwork excluded (CC-BY-NC). Only layout geometry imported; one myMahjong engine.'},null,2));
console.log(JSON.stringify({candidates:candidates.length,accepted:layouts.length,rejected:rejected.length,bySource:Object.fromEntries([...new Set(layouts.map(l=>l.source.split('/')[0]))].map(s=>[s,layouts.filter(l=>l.source.startsWith(s+'/')).length]))},null,2));
