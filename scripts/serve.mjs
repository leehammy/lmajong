import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const port = Number(process.env.PORT || process.argv.slice(2).find(value => /^\d+$/.test(value)) || 4173);
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.webmanifest':'application/manifest+json', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.woff2':'font/woff2', '.txt':'text/plain; charset=utf-8', '.ogg':'audio/ogg', '.mp3':'audio/mpeg', '.m4a':'audio/mp4' };
http.createServer((request,response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); } catch { response.writeHead(400); response.end('Bad URL'); return; }
  const target = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!(target === root || target.startsWith(root + path.sep))) { response.writeHead(403); response.end(); return; }
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) { response.writeHead(404, {'Content-Type':'text/plain'}); response.end('Not found'); return; }
  response.writeHead(200, { 'Content-Type':types[path.extname(target).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Service-Worker-Allowed':'/' });
  if (request.method === 'HEAD') response.end(); else fs.createReadStream(target).pipe(response);
}).listen(port, '127.0.0.1', () => console.log(`L's Majong: http://127.0.0.1:${port}/ (production dist)`));

