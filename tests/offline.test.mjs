import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto, createHash } from 'node:crypto';
const resources = new Map([
  ['/', {body:'<!doctype html><title>Game</title>', type:'text/html'}],
  ['/src/app.js', {body:'export const working = true;', type:'text/javascript'}],
  ['/assets/tiles.svg', {body:'<svg xmlns="http://www.w3.org/2000/svg"/>', type:'image/svg+xml'}],
  ['/data/levels.json', {body:'{"levels":[1,2,3]}', type:'application/json'}],
  ['/build-info.json', {body:'{"appId":"ls-majong","buildId":"test"}', type:'application/json'}]
]);
const files = [...resources].map(([path,r]) => ({path,bytes:Buffer.byteLength(r.body),sha256:createHash('sha256').update(r.body).digest('hex')}));
const worker = fs.readFileSync(new URL('../public/sw.template.js', import.meta.url),'utf8')
  .replace('__BUILD_ID__','test').replace('__VERSION__','1.0.0').replace('__FILES__',JSON.stringify(files));
function runtime({corrupt, wrongMime, stalledBody, redirected, stalledHash = false} = {}) {
  const events = {}, stores = new Map(), hanging = new Set();
  let requests = 0, activated = 0, claimed = false;
  const key = value => new URL(typeof value === 'string' ? value : value.url, 'https://game.example').pathname;
  const snapshot = async response => ({body:Buffer.from(await response.arrayBuffer()), status:response.status, headers:[...response.headers]});
  const restore = value => value && new Response(value.body,{status:value.status,headers:value.headers});
  const caches = {
    async open(name) { if (!stores.has(name)) stores.set(name,new Map()); const data = stores.get(name);
      return {match:async path=>restore(data.get(key(path))),put:async(path,response)=>data.set(key(path),await snapshot(response)),delete:async path=>data.delete(key(path))}; },
    keys: async()=>[...stores.keys()], delete: async name=>stores.delete(name)
  };
  const self = {location:{origin:'https://game.example'}, navigator:{onLine:true},
    clients:{claim:async()=>{claimed=true;},matchAll:async()=>[],get:async id=>({id})},
    skipWaiting:()=>{activated++;},addEventListener:(type,listener)=>{events[type]=listener;}};
  const fetch = async (url,{signal}={}) => {
    requests++; const pathname = key(url);
    if (hanging.has(pathname)) return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('No data')),{once:true}));
    const resource = resources.get(pathname);
    if (!resource) return new Response('Not found',{status:404});
    if (stalledBody === pathname) return new Response(new ReadableStream({start(){ /* headers arrive, but the body never finishes */ }}),
      {headers:{'content-type':resource.type}});
    if (redirected === pathname) {
      const response = new Response(resource.body,{headers:{'content-type':resource.type}});
      Object.defineProperty(response,'redirected',{value:true});
      return response;
    }
    return new Response(corrupt===pathname?'damaged':resource.body,{headers:{'content-type':wrongMime===pathname?'text/html':resource.type}});
  };
  vm.runInNewContext(worker,{self,caches,fetch,crypto:stalledHash?{subtle:{digest:()=>new Promise(()=>{})}}:webcrypto,console,URL,Response,Request,Headers,Uint8Array,AbortController,MessageChannel,Date,
    setTimeout:(fn,ms)=>setTimeout(fn,Math.min(ms,30)),clearTimeout});
  const fire = (type,values={}) => {let result; events[type]({...values,waitUntil:p=>{result=p;},respondWith:p=>{result=p;}});return result;};
  const message = async(type,deep=false) => {let result;await fire('message',{data:{type,deep},ports:[{postMessage:value=>{result=value;}}]});return result;};
  const request = (path,mode='same-origin',clientId='') => fire('fetch',{request:{method:'GET',url:'https://game.example'+path,mode},clientId});
  return {fire,message,request,stores,caches,self,hanging,stallBody:path=>{stalledBody=path;},requests:()=>requests,activated:()=>activated,claimed:()=>claimed};
}
test('all-core installs verified bytes, cache-first launch makes zero stalled network requests',async()=>{
  const r=runtime();await r.fire('install');await r.fire('activate');
  assert.equal(r.claimed(),true);assert.equal(r.activated(),0,'updates require explicit activation');
  assert.equal((await r.message('OFFLINE_STATUS',true)).ready,true);
  for(const path of resources.keys())r.hanging.add(path);
  const before=r.requests();
  for(const path of resources.keys()) assert.equal((await r.request(path,path==='/'?'navigate':'same-origin')).status,200);
  assert.equal(r.requests(),before);
});
test('corrupt release never destroys the previous good cache',async()=>{
  const r=runtime({corrupt:'/data/levels.json'});const old=await r.caches.open('ls-majong-core-previous');await old.put('/',new Response('old'));
  await assert.rejects(r.fire('install'),/corrupt release/);
  assert.deepEqual([...r.stores.keys()],['ls-majong-core-previous']);assert.equal(r.activated(),0);
});
test('HTML masquerading as JavaScript is refused even with the expected content bytes',async()=>{
  const r=runtime({wrongMime:'/src/app.js'});await assert.rejects(r.fire('install'),/corrupt release/);assert.equal(r.stores.size,0);
});
test('fake-online update probe has a deadline and 90-second failure cooldown',async()=>{
  const r=runtime();await r.fire('install');r.hanging.add('/build-info.json');
  assert.equal((await r.request('/build-info.json?probe=1')).status,503);
  const before=r.requests();assert.equal((await r.request('/build-info.json?probe=2')).status,503);assert.equal(r.requests(),before);
  assert.equal((await r.request('/','navigate')).status,200);
});
test('deep verify detects damaged cache and repair restores exact pinned content',async()=>{
  const r=runtime();await r.fire('install');const core=await r.caches.open('ls-majong-core-test');
  await core.put('/src/app.js',new Response('corrupt'));
  assert.equal((await r.message('OFFLINE_STATUS',true)).ready,false);
  const repaired=await r.message('REPAIR_OFFLINE');assert.equal(repaired.repaired,1);assert.equal(repaired.ready,true);
});
test('an old open tab keeps its original immutable source after an update',async()=>{
  const r=runtime();await r.fire('install');const old=await r.caches.open('ls-majong-core-previous');
  await old.put('/src/app.js',new Response('old source'));
  await r.fire('message',{data:{type:'CLIENT_BUILD',buildId:'previous'},source:{id:'old-tab'}});
  assert.equal(await (await r.request('/src/app.js','same-origin','old-tab')).text(),'old source');
  await r.fire('message',{data:{type:'ACTIVATE_UPDATE'}});assert.equal(r.activated(),1);
});

test('headers followed by a stalled body hit the complete install deadline and preserve old core',async()=>{
  const r=runtime({stalledBody:'/src/app.js'});
  const old=await r.caches.open('ls-majong-core-previous');await old.put('/',new Response('old working game'));
  const before=Date.now();
  await assert.rejects(r.fire('install'),/timed out/);
  assert.ok(Date.now()-before<1000,'fake clock bounds a stalled body without waiting 20 seconds');
  assert.deepEqual([...r.stores.keys()],['ls-majong-core-previous']);
  assert.equal(await (await old.match('/')).text(),'old working game');
  assert.equal(r.activated(),0);
});
test('the verification digest remains inside the same bounded install deadline',async()=>{
  const r=runtime({stalledHash:true});
  await assert.rejects(r.fire('install'),/timed out/);
  assert.equal(r.stores.size,0);assert.equal(r.activated(),0);
});
test('buffering a response cannot hide a redirected mandatory asset',async()=>{
  const r=runtime({redirected:'/src/app.js'});
  await assert.rejects(r.fire('install'),/Redirected/);
  assert.equal(r.stores.size,0);
});

test('a version probe with stalled body also expires and enters cooldown',async()=>{
  const r=runtime();await r.fire('install');r.stallBody('/build-info.json');
  assert.equal((await r.request('/build-info.json?probe=1')).status,503);
  const requests=r.requests();assert.equal((await r.request('/build-info.json?probe=2')).status,503);
  assert.equal(r.requests(),requests,'cooldown prevents another body-stalled request');
  assert.equal((await r.request('/','navigate')).status,200);
});
