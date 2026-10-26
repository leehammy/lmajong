import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
if (path.dirname(dist) !== root || path.basename(dist) !== 'dist') throw Error('Unsafe build target');
if (!fs.existsSync(path.join(root, 'index.html'))) throw Error('Missing index.html');
const packageFile = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8').replace(/^\uFEFF/, ''));
const version = packageFile.version;
if (!/^\d+\.\d+\.\d+(?:[-a-zA-Z0-9.]*)$/.test(version)) throw Error('Invalid application version');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
const copy = (source, target) => {
  if (!fs.existsSync(source)) return;
  const stat = fs.lstatSync(source);
  if (stat.isSymbolicLink()) throw Error(`Do not publish symlinks: ${source}`);
  if (stat.isDirectory()) {
    fs.mkdirSync(target, { recursive: true });
    for (const name of fs.readdirSync(source)) {
      if (name === 'sw.template.js' || name.endsWith('.map') || name.startsWith('.')) continue;
      copy(path.join(source, name), path.join(target, name));
    }
  } else { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(source, target); }
};
for (const name of ['index.html', 'src', 'styles', 'style.css', 'styles.css', 'assets', 'data']) copy(path.join(root, name), path.join(dist, name));
copy(path.join(root, 'public'), dist);
const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const template = fs.readFileSync(path.join(root, 'public', 'sw.template.js'), 'utf8');
const fingerprint = walk(dist).map(file => `${path.relative(dist, file)}:${sha(fs.readFileSync(file))}`).join('\n') + template;
const buildId = `${version}-${sha(fingerprint).slice(0, 16)}`;
let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8').replaceAll('__APP_VERSION__', version).replaceAll('__BUILD_ID__', buildId);
if (!/name=["']app-build["']/.test(html)) html = html.replace('</head>', `<meta name="app-build" content="${buildId}"><meta name="app-version" content="${version}">\n</head>`);
fs.writeFileSync(path.join(dist, 'index.html'), html);
fs.writeFileSync(path.join(dist, 'build-info.json'), JSON.stringify({ appId: 'ls-majong', version, buildId }, null, 2));
const files = walk(dist).map(file => ({ path: path.basename(file) === 'index.html' && path.dirname(file) === dist ? '/' : '/' + path.relative(dist, file).split(path.sep).join('/'), sha256: sha(fs.readFileSync(file)), bytes: fs.statSync(file).size }));
for (const file of files) if (!/^\/[a-zA-Z0-9_.\/-]*$/.test(file.path) || file.path.includes('..')) throw Error(`Unsafe asset filename: ${file.path}`);
const manifest = { format: 1, appId: 'ls-majong', version, buildId, core: files, media: [] };
fs.writeFileSync(path.join(dist, 'offline-manifest.json'), JSON.stringify(manifest, null, 2));
const sw = template.replace('__BUILD_ID__', buildId).replace('__VERSION__', version).replace('__FILES__', JSON.stringify(files));
fs.writeFileSync(path.join(dist, 'sw.js'), sw);
console.log(`Built L's Majong ${version} (${buildId}): ${files.length} verified offline files, ${(files.reduce((n,f)=>n+f.bytes,0)/1048576).toFixed(2)} MiB.`);
