import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readZip, safePath } from './zip.mjs';
import { collectReleaseFiles } from './release-files.mjs';
export const MANIFEST_PATH = '__release__/manifest.json';
export const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
export function verifyRelease(input, { projectRoot = null } = {}) {
  const bytes = typeof input === 'string' ? fs.readFileSync(input) : Buffer.from(input);
  const entries = readZip(bytes);
  if (!entries.has(MANIFEST_PATH)) throw Error('Release manifest is missing');
  const manifest = JSON.parse(entries.get(MANIFEST_PATH).toString('utf8'));
  if (manifest.format !== 'ls-majong-full-release' || manifest.releaseType !== 'FULL' || manifest.formatVersion !== 1
    || typeof manifest.version !== 'string' || !Array.isArray(manifest.files)) throw Error('Unsupported release manifest');
  const listed = new Set();
  for (const file of manifest.files) {
    if (!safePath(file.path) || file.path === MANIFEST_PATH || listed.has(file.path) || !Number.isSafeInteger(file.bytes)
      || !/^[a-f0-9]{64}$/.test(file.sha256)) throw Error('Invalid manifest file');
    listed.add(file.path);
    const actual = entries.get(file.path);
    if (!actual || actual.length !== file.bytes || sha256(actual) !== file.sha256) throw Error(`Release SHA-256 mismatch: ${file.path}`);
    if (projectRoot) {
      const target = path.resolve(projectRoot, ...file.path.split('/'));
      if (!target.startsWith(path.resolve(projectRoot) + path.sep) || !fs.existsSync(target)
        || sha256(fs.readFileSync(target)) !== file.sha256) throw Error(`Source/ZIP mismatch: ${file.path}`);
    }
  }
  if (projectRoot) {
    const actualNames = new Set(collectReleaseFiles(path.resolve(projectRoot)).map(entry => entry.name));
    if (actualNames.size !== listed.size || [...actualNames].some(name => !listed.has(name))) throw Error('Release does not contain the exact current project file set');
  }
  if (entries.size !== listed.size + 1 || [...entries.keys()].some(name => name !== MANIFEST_PATH && !listed.has(name))) throw Error('Unexpected unlisted ZIP content');
  for (const required of ['index.html','package.json','src/app.js','src/engine.js','data/levels.json','dist/index.html','dist/sw.js'])
    if (!entries.has(required)) throw Error(`Incomplete standalone release: ${required}`);
  const packageInfo = JSON.parse(entries.get('package.json').toString('utf8').replace(/^\uFEFF/, ''));
  if (packageInfo.version !== manifest.version) throw Error('Release/package version mismatch');
  return { version: manifest.version, files: listed.size, bytes: bytes.length, sha256: sha256(bytes), manifest };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw Error('Usage: node scripts/verify-release.mjs path/to/FULL.zip');
  const verified = verifyRelease(path.resolve(process.argv[2]));
  console.log(`Verified FULL v${verified.version}: ${verified.files} project files, ${verified.bytes} ZIP bytes, SHA-256 ${verified.sha256}`);
}
