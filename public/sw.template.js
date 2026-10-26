/* Generated from the Offline Reliability Kit principles: one worker, verified atomic
   core, cache-first play, bounded network probes, explicit save-before-update. */
const APP_ID = 'ls-majong';
const BUILD_ID = '__BUILD_ID__';
const VERSION = '__VERSION__';
const FILES = __FILES__;
const PREFIX = `${APP_ID}-core-`;
const CACHE = PREFIX + BUILD_ID;
const clientBuilds = new Map();
let poorUntil = 0;
const manifest = { format: 1, appId: APP_ID, buildId: BUILD_ID, version: VERSION, core: FILES, media: [] };
const unavailable = () => new Response('Reconnect once to finish saving the game for offline use.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
async function network(url, milliseconds = 3000, consume = response => response) {
  if (self.navigator.onLine === false || Date.now() < poorUntil) throw Error('No usable signal');
  const controller = new AbortController();
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      poorUntil = Date.now() + 90000;
      reject(Error('Connection timed out before the complete response was verified'));
      controller.abort();
    }, milliseconds);
  });
  const complete = async () => {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
    // Buffering removes Fetch response metadata, so reject redirects before rewrapping.
    if (response.redirected || ['opaque', 'opaqueredirect'].includes(response.type)) throw Error('Redirected or unreadable response');
    const bytes = await response.arrayBuffer();
    const headers = new Headers(response.headers);
    // Fetch has already decoded HTTP compression; the synthetic response contains plain bytes.
    headers.delete('content-encoding'); headers.delete('transfer-encoding');
    headers.set('content-length', String(bytes.byteLength));
    const buffered = new Response([204, 205, 304].includes(response.status) ? null : bytes,
      { status: response.status, statusText: response.statusText, headers });
    // The same deadline covers headers, every body byte, and the verifier/SHA digest.
    return await consume(buffered);
  };
  try { return await Promise.race([complete(), deadline]); }
  finally { clearTimeout(timer); }
}
async function hash(response) {
  const digest = await crypto.subtle.digest('SHA-256', await response.clone().arrayBuffer());
  return [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join('');
}
function mimeOkay(file, response) {
  if (!response.ok || response.redirected || response.type === 'opaqueredirect') return false;
  const type = (response.headers.get('content-type') || '').toLowerCase();
  if (file.path === '/') return type.includes('text/html');
  if (/\.m?js$/.test(file.path)) return /javascript|ecmascript/.test(type);
  if (/\.css$/.test(file.path)) return type.includes('text/css');
  if (/\.(json|webmanifest)$/.test(file.path)) return /json|manifest/.test(type);
  if (/\.svg$/.test(file.path)) return type.includes('svg');
  if (/\.(png|webp|jpg|jpeg)$/.test(file.path)) return type.startsWith('image/');
  if (/\.(m4a|ogg|mp3)$/.test(file.path)) return type.startsWith('audio/');
  return true;
}
async function verified(file) {
  return network(file.path, 20000, async response => {
    if (!mimeOkay(file, response) || await hash(response) !== file.sha256) throw Error(`Incomplete or corrupt release: ${file.path}`);
    return response;
  });
}
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  try {
    let cursor = 0;
    const run = async () => { while (cursor < FILES.length) {
      const file = FILES[cursor++];
      await cache.put(file.path, await verified(file));
    } };
    const results = await Promise.allSettled([run(), run(), run()]);
    const failed = results.find(result => result.status === 'rejected');
    if (failed) throw failed.reason;
    for (const file of FILES) if (!await cache.match(file.path)) throw Error('Core install is incomplete');
    await cache.put('/offline-manifest.json', new Response(JSON.stringify(manifest), { headers: { 'Content-Type': 'application/json' } }));
  } catch (error) { await caches.delete(CACHE); throw error; }
  // Deliberately no skipWaiting: an installed update cannot interrupt play.
})()));

async function askClientBuild(client) {
  if (!client) return BUILD_ID;
  if (clientBuilds.has(client.id)) return clientBuilds.get(client.id);
  return new Promise(resolve => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => finish(BUILD_ID), 350);
    function finish(id) { clearTimeout(timer); channel.port1.close(); channel.port2.close(); clientBuilds.set(client.id, id); resolve(id); }
    channel.port1.onmessage = event => finish(typeof event.data?.buildId === 'string' ? event.data.buildId : BUILD_ID);
    try { client.postMessage({ type: 'OFFLINE_GET_CLIENT_BUILD' }, [channel.port2]); } catch { finish(BUILD_ID); }
  });
}
self.addEventListener('activate', event => event.waitUntil((async () => {
  // Keep each already-open tab on its own immutable core until it reloads.
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  await Promise.all(clients.map(askClientBuild));
  await self.clients.claim();
  const protectedBuilds = new Set([BUILD_ID, ...clientBuilds.values()]);
  const old = (await caches.keys()).filter(name => name.startsWith(PREFIX) && name !== CACHE);
  if (old.length) protectedBuilds.add(old.at(-1).slice(PREFIX.length));
  for (const name of old) if (!protectedBuilds.has(name.slice(PREFIX.length))) await caches.delete(name);
})()));

async function status(deep = false) {
  const cache = await caches.open(CACHE);
  let have = 0;
  const missing = [];
  for (const file of FILES) {
    const response = await cache.match(file.path);
    if (response?.ok && (!deep || await hash(response) === file.sha256)) have++;
    else missing.push(file.path);
  }
  return { ready: have === FILES.length, coreHave: have, coreTotal: FILES.length,
    mediaHave: 0, mediaTotal: 0, buildId: BUILD_ID, version: VERSION, missing };
}
async function repair() {
  const cache = await caches.open(CACHE);
  let repaired = 0;
  for (const file of FILES) {
    const response = await cache.match(file.path);
    if (response?.ok && await hash(response) === file.sha256) continue;
    try { await cache.put(file.path, await verified(file)); repaired++; } catch { break; }
  }
  return { ...await status(true), repaired };
}
self.addEventListener('message', event => {
  const data = event.data || {}, port = event.ports?.[0];
  if (data.type === 'CLIENT_BUILD' && event.source?.id && typeof data.buildId === 'string') clientBuilds.set(event.source.id, data.buildId);
  if (data.type === 'ACTIVATE_UPDATE') { self.skipWaiting(); return; }
  if (data.type === 'OFFLINE_STATUS' || data.type === 'REPAIR_OFFLINE') {
    event.waitUntil((data.type === 'REPAIR_OFFLINE' ? repair() : status(Boolean(data.deep)))
      .then(value => port?.postMessage(value)).catch(error => port?.postMessage({ ready: false, error: error.message })));
  }
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname === '/sw.js' || (url.pathname === '/build-info.json' && url.searchParams.has('probe'))) {
    event.respondWith(network(request.url).catch(unavailable)); return;
  }
  event.respondWith((async () => {
    const path = request.mode === 'navigate' || url.pathname === '/index.html' ? '/' : url.pathname;
    let buildId = BUILD_ID;
    if (request.mode !== 'navigate' && event.clientId) buildId = await askClientBuild(await self.clients.get(event.clientId));
    let cache = await caches.open(PREFIX + buildId);
    let response = await cache.match(path);
    if (response?.ok) return response;
    // A missing old asset can only be repaired from the current release when its hash agrees.
    let oldManifest = buildId === BUILD_ID ? manifest : await cache.match('/offline-manifest.json').then(r => r?.json()).catch(() => null);
    const file = oldManifest?.core?.find(item => item.path === path);
    if (!file) return network(request.url).catch(unavailable);
    try { response = await verified(file); await cache.put(path, response.clone()); return response; }
    catch { return unavailable(); }
  })());
});
