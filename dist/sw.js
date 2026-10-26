/* Generated from the Offline Reliability Kit principles: one worker, verified atomic
   core, cache-first play, bounded network probes, explicit save-before-update. */
const APP_ID = 'ls-majong';
const BUILD_ID = '1.0.0-38df742cae7e5c21';
const VERSION = '1.0.0';
const FILES = [{"path":"/assets/garden-portrait.svg","sha256":"71812dc4f7ce4a23d0437ca18cd3c73d1e8d7358bf66afd24fa8ab66482d70ef","bytes":3686},{"path":"/assets/garden.svg","sha256":"130a1c90aba5682fd7abe7810cf3095743f2a3d9f03a73fb985347e791a0dc5b","bytes":2965},{"path":"/assets/music/otjanbird-pt-ii.mp3","sha256":"23546f80257709ff63a59cfb4a33dc8016a24087f4c9a5470692cee3889d0049","bytes":4701975},{"path":"/assets/sounds/match-1.m4a","sha256":"e97f19bc15c0b8dc8291d2b3bd300ef127c57c78d439a1798252b3ae8f1622f8","bytes":8621},{"path":"/assets/sounds/match-2.m4a","sha256":"976b1d296e078abb5fa4340b2728f3ef7132096ffaad39d2dfa8b6d6261066ac","bytes":8819},{"path":"/assets/sounds/match-3.m4a","sha256":"f2094faab5422daf7338ca1743dc78f804f8f9b59c832c80cf30729546e10556","bytes":9861},{"path":"/assets/sounds/match-4.m4a","sha256":"ea00beab2d8ba625de8d6ac7b654c52056b8b3cc91b6516178649eeb741c7340","bytes":9458},{"path":"/assets/sounds/select.m4a","sha256":"d46b2b4edc45338397395615f76aad265392a62b7183f83812bef4c95728c44a","bytes":3517},{"path":"/assets/sounds/shuffle.m4a","sha256":"6a59218f360a82fd7914e77304983dae2801eeccd744b6e5ff65b0b7f0aa31f6","bytes":42942},{"path":"/assets/tiles/Back.svg","sha256":"0b5a510bd9fc56eca6cd9b4896d361bbf8bff5c6a4b4dc2d6d9b4b6fee713027","bytes":5945},{"path":"/assets/tiles/Chun.svg","sha256":"0779e513844e546575feefc560a1228f0acd67398b7e7b618d95414a6e0e7f30","bytes":5535},{"path":"/assets/tiles/Flower1.svg","sha256":"1169903248701e33a4c5ebf313ad32f2126102ef3199cf0d611310074065f581","bytes":658},{"path":"/assets/tiles/Flower2.svg","sha256":"b49ae8807eb72e273cc817d1e1c29fe56961af80bb46e9ad2370e2163f63df91","bytes":658},{"path":"/assets/tiles/Flower3.svg","sha256":"529a66ae79d662239b1942cc0189c0d2f1426f0afce8cd76e0e75c978a4e0bbb","bytes":658},{"path":"/assets/tiles/Flower4.svg","sha256":"70a49da3cbe429315110fea4a2a14ae56838e5b394d5c1dd20052318e5608e60","bytes":658},{"path":"/assets/tiles/Front.svg","sha256":"27ab7400c9a153d5776ad141d45752cdb67cd9b07da2117758b6d67303322dae","bytes":7417},{"path":"/assets/tiles/Haku.svg","sha256":"6a9fb5bdde9aec688a7b30a2ec84897ac328eec511cd69d620dc325ee69ba97a","bytes":385},{"path":"/assets/tiles/Hatsu.svg","sha256":"c8b4e13d708099a689d3193fd8ef1fbc2e597b7c54881c0ab942575430b4a583","bytes":10838},{"path":"/assets/tiles/Man1.svg","sha256":"1d62d305b6446e0bd58855df7c063b6f6d34ec6ebaf9fb2676d7a6eb31417205","bytes":9121},{"path":"/assets/tiles/Man2.svg","sha256":"1fb96896a4c03e049cd2ebff02bfb04d9916f74d2ef4e01ce5049ed23df02a4e","bytes":9531},{"path":"/assets/tiles/Man3.svg","sha256":"0aec7f6ccaa72ba1087056838b5207472c7a610c44b5f193b27bd6ee196fab90","bytes":10018},{"path":"/assets/tiles/Man4.svg","sha256":"c390c575079d1c8c51f5acfef34b1f76d74d530c3618349511f9fa4fe066de6b","bytes":10428},{"path":"/assets/tiles/Man5.svg","sha256":"8d8682df5916fc1397b6af974f78688ee7d5c0cf4e610e6df69c0008776c263a","bytes":11664},{"path":"/assets/tiles/Man6.svg","sha256":"d33492c093ac0e874ffd66d7311d55c5adeaccb9dea7a8958a5e7863afb7314b","bytes":10594},{"path":"/assets/tiles/Man7.svg","sha256":"92b814681d86b2a89128a57ef39e336405cf4d270cbe2fea674496f8b99339d2","bytes":9586},{"path":"/assets/tiles/Man8.svg","sha256":"d063fea9542d8219934bfb28ab8ee8ebc98af7b57c28e3cddf7efa5eb8e2e178","bytes":9573},{"path":"/assets/tiles/Man9.svg","sha256":"ed912abb43a8c66695ba7eaae591c7bcfbd185975f470595f6465b5a0fa68681","bytes":10160},{"path":"/assets/tiles/Nan.svg","sha256":"4e5f597d21d29d19541cf8ff24fb9590cb6969f8e9d8164fcf0f16edcd134648","bytes":7914},{"path":"/assets/tiles/Pei.svg","sha256":"4160370c36899035a156102b1e54ef75eff6aababf1d80d51f00e8aed4fcec85","bytes":6078},{"path":"/assets/tiles/Pin1.svg","sha256":"d730958b685fabd0c49a5de94a4acf9b51d991af4eff1eec7737c224f13e9780","bytes":10929},{"path":"/assets/tiles/Pin2.svg","sha256":"275c950d6391a2e68aa225e2e0a41d41e4323b6ced88f8d0ff830bda1ebbc942","bytes":8358},{"path":"/assets/tiles/Pin3.svg","sha256":"91742cc15fc51fde5c2e70af5428c543681563458f81f2a7b0138a0da979ae00","bytes":9964},{"path":"/assets/tiles/Pin4.svg","sha256":"f710354544fa2a8cced5f6996eed0cffa207fef290d3e6f69fdf28a314eeccda","bytes":12122},{"path":"/assets/tiles/Pin5.svg","sha256":"71bc4a96cef1a461cc0a82d1441733e0ca27b3bce7916a13681b846d5a160174","bytes":14279},{"path":"/assets/tiles/Pin6.svg","sha256":"1bb57ef8043c7751fb5cfb2ae53579b212864af8460ec5ac5d4ea6e78387891b","bytes":15760},{"path":"/assets/tiles/Pin7.svg","sha256":"9ed0abedeb1d46c9adb29c9d84ff3672ada2a3732613e6a3182907281ca865df","bytes":19923},{"path":"/assets/tiles/Pin8.svg","sha256":"bff1bac97b7d7eee1139b516bf1d6dbf8b7fb54cf1ad2d5a1016a29e9e0d1eb7","bytes":19966},{"path":"/assets/tiles/Pin9.svg","sha256":"46530536ab47ac6cf04963f5325a3f4e264c98fbcc8fffb0a11013441c769263","bytes":22265},{"path":"/assets/tiles/Season1.svg","sha256":"a86df2a1b9fbff38b78ac51ddd15da40178b1b6735cf74bd742c4c8d1c85c38a","bytes":542},{"path":"/assets/tiles/Season2.svg","sha256":"e67b59d93d84889de78b57c7cb6ebe2e95f92697793e63b924e68a1c2e2e3001","bytes":542},{"path":"/assets/tiles/Season3.svg","sha256":"eb856f35067a40ef376177940cb23067038c8a702ece88b44fd11615ec6f632d","bytes":542},{"path":"/assets/tiles/Season4.svg","sha256":"af273c4021dfb888d1f0cd04c2e668bf767038d99aa72417dd92b5abbbb77afa","bytes":542},{"path":"/assets/tiles/Shaa.svg","sha256":"87a60bca657148dc0309bfe9cac4201e9187db793cd3c2c726e5e6cce0427e1f","bytes":6495},{"path":"/assets/tiles/Sou1.svg","sha256":"d330f234cfe5af6bb8d01405332536e6aa180d7bde98ecbfa2a014795c3bc816","bytes":43902},{"path":"/assets/tiles/Sou2.svg","sha256":"fdb4dad053b061bcb90dc403f6c1c413bd8743c8a0fe2e86f6de833c6d1ffd32","bytes":10646},{"path":"/assets/tiles/Sou3.svg","sha256":"109982e1706fcd8dc7c44d40907e651422c61031ee51501ac38d0b55d5e60a42","bytes":14403},{"path":"/assets/tiles/Sou4.svg","sha256":"cd7b4c3e6ef0f81ee354e0b2067935005dfaf283c385ecf42956ea91039aff70","bytes":18616},{"path":"/assets/tiles/Sou5.svg","sha256":"50fc5d8c5c25d685c93ee9d1bae39f8eab47a3d5a32461ff5195f796bb17a365","bytes":21448},{"path":"/assets/tiles/Sou6.svg","sha256":"7f8913e819030e4d4a8d26e8cd2dcd397ec36322f717cc3290ed2b63c97e8317","bytes":25082},{"path":"/assets/tiles/Sou7.svg","sha256":"2e9f88bb40e5395e92c24d1beb36d1556acd56cea4e471651615f0811772b081","bytes":23407},{"path":"/assets/tiles/Sou8.svg","sha256":"80051f370b9ecb6c49acc889451b42217c67d86ab2254110999dc80bdf506f70","bytes":25271},{"path":"/assets/tiles/Sou9.svg","sha256":"65952f96d3ba3132030cf1a1aca4e906cd3a6560ab3045724ede37ae8c143d83","bytes":29150},{"path":"/assets/tiles/Ton.svg","sha256":"15ad3cd9a6234d89098dda66be66e90cf238ad507fa2f01c6a6a2cd8238e3bb1","bytes":7033},{"path":"/build-info.json","sha256":"2e48f9aa5040b91a53589f2538100217d1091055981f12df4a5fb6497a6cabbd","bytes":87},{"path":"/data/layout-audit.json","sha256":"7b7dbba68b02ee9f90d86313c81db6eae3d2625c0ccf5bb763565e06cc0d1761","bytes":3272},{"path":"/data/layouts.json","sha256":"f02c8e13342d13ccd3f08a49f64821ed7e558c9f226d55a6521dcdc3fd631dec","bytes":952480},{"path":"/data/levels.json","sha256":"46f614baffd69bf13f24420f2848c09f670ac95a1f69dc8c0ac9792fb22a6f6d","bytes":5566218},{"path":"/data/validation-report.json","sha256":"795f26fcbb14160f93fee58f0dbd2f492acf16f67a8725a06ecdb9a4e7fe18e9","bytes":6785},{"path":"/icons/apple-touch-icon.png","sha256":"2b1d5bd99dc1a5125cc83b113d07bada1e8a1cca5b68207fa7a6e69657364860","bytes":6643},{"path":"/icons/icon-192.png","sha256":"abdf7fb24b992661379f1702b3da3ccfcbad73e9f7e085d05a5d7b5d3e7910ca","bytes":7186},{"path":"/icons/icon-512.png","sha256":"9e052ce369d3706a8fa69b5ea186da97dbf5918f03488be7327d6cd48d45b57c","bytes":26981},{"path":"/icons/icon-maskable-512.png","sha256":"89f702c8d5dfaa5442e72b3de3b875ed277635a27d291a39b060e472c8d26a80","bytes":23369},{"path":"/icons/icon.svg","sha256":"7b6dce05dcc91ccb6be3e4919a8700135dadeb60456d87228b5b71de100d7130","bytes":778},{"path":"/","sha256":"8ffcd2dbd7923de96f98970b3089e6d956e7c50813231daf080c555669a306de","bytes":2952},{"path":"/manifest.webmanifest","sha256":"d71250bea0ff95988831170939902ee441318a72d00c2286608c584342222918","bytes":629},{"path":"/src/app.js","sha256":"2870f97191a13f81ef0cf14dbd39ecae3d1e0660d0023dfacc512b9019534321","bytes":26296},{"path":"/src/engine.js","sha256":"1044e2cc5b4b9777c34ad794cdf4384def3c465ce66129210504f59878b783db","bytes":9977},{"path":"/src/interaction.js","sha256":"15279bfee893498a42c1980a039f23525a96b27fc641fe61cbba350ff42f51a2","bytes":2522},{"path":"/src/offline.js","sha256":"612ddbdb4e6a7a6cc8065c2a171bbfb39aef083c82f085c66e75899fe880af32","bytes":7890},{"path":"/src/storage.js","sha256":"a91e3b9829b165c6dc5a4b8f19a242ba41dbb813b51b6684895f98745813e26f","bytes":13452},{"path":"/styles/game.css","sha256":"c1c6fa5c0d3c54523e6beb7f70d2d411be6cd41d48cacc5e426071f15e798bac","bytes":12736}];
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
// Safari loads media in byte ranges and will not play a whole-file reply to a Range request.
async function ranged(request, response) {
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers?.get('range') || '');
  if (!range || (range[1] === '' && range[2] === '')) return response;
  const body = await response.arrayBuffer(), size = body.byteLength;
  const start = range[1] === '' ? Math.max(0, size - Number(range[2])) : Number(range[1]);
  const end = range[1] === '' || range[2] === '' ? size - 1 : Math.min(size - 1, Number(range[2]));
  if (start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  return new Response(body.slice(start, end + 1), { status: 206, headers: { 'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
    'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
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
    if (response?.ok) return ranged(request, response);
    // A missing old asset can only be repaired from the current release when its hash agrees.
    let oldManifest = buildId === BUILD_ID ? manifest : await cache.match('/offline-manifest.json').then(r => r?.json()).catch(() => null);
    const file = oldManifest?.core?.find(item => item.path === path);
    if (!file) return network(request.url).catch(unavailable);
    try { response = await verified(file); await cache.put(path, response.clone()); return ranged(request, response); }
    catch { return unavailable(); }
  })());
});
