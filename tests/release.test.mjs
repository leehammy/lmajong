import test from 'node:test';
import assert from 'node:assert/strict';
import { makeZip, readZip, crc32 } from '../scripts/zip.mjs';
import { verifyRelease, sha256, MANIFEST_PATH } from '../scripts/verify-release.mjs';
const project = [
  {name:'index.html',data:Buffer.from('<!doctype html>')},
  {name:'package.json',data:Buffer.from('{"version":"1.0.0"}')},
  ...['src/app.js','src/engine.js','data/levels.json','dist/index.html','dist/sw.js'].map(name=>({name,data:Buffer.from('fixture: '+name)}))
];
function release(entries=project) {
  const manifest={format:'ls-majong-full-release',formatVersion:1,releaseType:'FULL',version:'1.0.0',files:entries.map(entry=>({path:entry.name,bytes:entry.data.length,sha256:sha256(entry.data)}))};
  return {manifest,zip:makeZip([...entries,{name:MANIFEST_PATH,data:Buffer.from(JSON.stringify(manifest))}])};
}
test('portable ZIP writer round-trips empty, binary and Unicode files with CRC verification',()=>{
  const values=[{name:'empty.txt',data:Buffer.alloc(0)},{name:'nested/data.bin',data:Buffer.from([0,1,2,127,255])},{name:'garden/春.txt',data:Buffer.from('Bamboo 🌿')}];
  const zip=makeZip(values),entries=readZip(zip);
  assert.equal(crc32(Buffer.from('123456789')),0xcbf43926);
  for(const entry of values)assert.deepEqual(entries.get(entry.name),entry.data);
});
test('FULL verifier checks every decompressed byte against the SHA manifest',()=>{
  const {zip}=release(),verified=verifyRelease(zip);
  assert.equal(verified.files,project.length);assert.equal(verified.version,'1.0.0');
  const {manifest}=release();const changed=project.map(entry=>({...entry}));changed[0]={name:'index.html',data:Buffer.from('changed')};
  assert.throws(()=>verifyRelease(makeZip([...changed,{name:MANIFEST_PATH,data:Buffer.from(JSON.stringify(manifest))}])),/SHA-256 mismatch/);
});
test('ZIP refuses traversal, duplicate names, truncated and corrupted streams',()=>{
  for(const name of ['../escape','/absolute','C:/drive','folder/../escape','folder\\escape'])assert.throws(()=>makeZip([{name,data:Buffer.from('x')}]),/Unsafe/);
  assert.throws(()=>makeZip([{name:'a',data:Buffer.from('1')},{name:'a',data:Buffer.from('2')}]),/duplicate/);
  const {zip}=release();assert.throws(()=>readZip(zip.subarray(0,-8)));
  const damaged=Buffer.from(zip);damaged[40]^=127;assert.throws(()=>readZip(damaged));
});
test('FULL verifier rejects omitted and unlisted files',()=>{
  const {manifest}=release();
  assert.throws(()=>verifyRelease(makeZip([...project.slice(1),{name:MANIFEST_PATH,data:Buffer.from(JSON.stringify(manifest))}])),/SHA-256 mismatch/);
  assert.throws(()=>verifyRelease(makeZip([...project,{name:'surprise.txt',data:Buffer.from('x')},{name:MANIFEST_PATH,data:Buffer.from(JSON.stringify(manifest))}])),/unlisted/);
});

