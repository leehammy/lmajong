import fs from 'node:fs';
import path from 'node:path';
const excludedDirectories = new Set(['node_modules','.git','.vercel','__release__','work','tmp','temp','test-results','playwright-report','coverage','.cache','artifacts']);
export function collectReleaseFiles(root, directory = root) {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a,b)=>a.name.localeCompare(b.name))) {
    const absolute = path.join(directory,entry.name), relative = path.relative(root,absolute).split(path.sep).join('/');
    if (entry.isSymbolicLink()) throw Error(`Release cannot contain a symlink: ${relative}`);
    if (entry.isDirectory()) { if (!excludedDirectories.has(entry.name)) result.push(...collectReleaseFiles(root, absolute)); continue; }
    if (entry.name.startsWith('.env') && entry.name !== '.env.example') continue;
    if (/\.(?:zip|log|trace|tmp|bak|DS_Store)$/i.test(entry.name) || /^SHA256SUMS/.test(entry.name)) continue;
    if (entry.name === 'Thumbs.db') continue;
    result.push({ name: relative, data: fs.readFileSync(absolute) });
  }
  return result;
}
