/** Initial FULL release only. Future UPDATE releases require an exact prior FULL baseline. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { makeZip } from './zip.mjs';
import { collectReleaseFiles } from './release-files.mjs';
import { verifyRelease, sha256, MANIFEST_PATH } from './verify-release.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!process.argv.includes('--dry-run')) {
  const built = spawnSync(process.execPath, [path.join(root, 'scripts', 'build.mjs')], { cwd: root, stdio: 'inherit' });
  if (built.error || built.status !== 0) throw Error('Release stopped because the production build failed.');
}
const packageInfo = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8').replace(/^\uFEFF/,''));
const entries = collectReleaseFiles(root);
if (process.argv.includes('--dry-run')) {
  console.log(`FULL v${packageInfo.version}: ${entries.length} files, ${entries.reduce((n,e)=>n+e.data.length,0)} source/built bytes.`);
  console.log(entries.map(entry=>entry.name).join('\n'));
} else {
  const manifest = { format:'ls-majong-full-release', formatVersion:1, releaseType:'FULL', version:packageInfo.version,
    generatedAt:new Date().toISOString(), note:'Initial complete release. No incremental update is claimed.',
    files:entries.map(entry=>({path:entry.name,bytes:entry.data.length,sha256:sha256(entry.data)})) };
  const zip = makeZip([...entries,{name:MANIFEST_PATH,data:Buffer.from(JSON.stringify(manifest,null,2)+'\n')}]);
  const outputRoot = path.dirname(root), filename = `Ls-Majong-v${packageInfo.version}-FULL.zip`, target = path.join(outputRoot,filename);
  // Verification happens in memory before the final output is written.
  const verified = verifyRelease(zip,{projectRoot:root});
  fs.writeFileSync(target,zip);
  const disk = verifyRelease(target,{projectRoot:root});
  if (disk.sha256 !== verified.sha256) throw Error('ZIP changed during write');
  fs.writeFileSync(path.join(outputRoot,'SHA256SUMS.txt'),`${disk.sha256}  ${filename}\n`);
  console.log(`Verified FULL written: ${target}\n${disk.files} exact project files; ${disk.bytes} ZIP bytes\nSHA-256 ${disk.sha256}`);
}
