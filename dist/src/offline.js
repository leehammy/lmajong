/** Nonblocking offline/update UI adapter. Render the game before calling this. */
export const APP_VERSION = '1.0.0';
export function initOffline({ onStatus = () => {}, onUpdate = () => {}, beforeReload = () => true } = {}) {
  const buildId = document.querySelector('meta[name="app-build"]')?.content || 'development';
  const version = document.querySelector('meta[name="app-version"]')?.content || APP_VERSION;
  let registration = null, ready = false, busy = false, activating = false, reloading = false;
  let poorUntil = 0, offered = null, lastCheck = 0;
  const emit = (type, message, extra = {}) => onStatus({ type, message, version, buildId, ...extra });
  const bounded = (promise, ms) => { let timer; return Promise.race([promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(Error('This check took too long. You can keep playing.')), ms); })]).finally(() => clearTimeout(timer)); };
  const announce = () => navigator.serviceWorker?.controller?.postMessage({ type: 'CLIENT_BUILD', buildId });
  const unavailable = () => navigator.onLine === false || Date.now() < poorUntil;
  function offer() {
    if (!registration?.waiting || !navigator.serviceWorker.controller) return false;
    if (offered !== registration.waiting) {
      offered = registration.waiting;
      emit('update-ready', 'An update is ready. Your game will be saved before you reload.');
      onUpdate({ version, activate: applyUpdate });
    }
    return true;
  }
  async function ask(type, deep = false) {
    const worker = navigator.serviceWorker?.controller || registration?.active;
    if (!worker) throw Error('Offline saving is starting. Please check again in a moment.');
    const channel = new MessageChannel();
    try {
      return await bounded(new Promise((resolve, reject) => {
        channel.port1.onmessage = event => event.data?.error ? reject(Error(event.data.error)) : resolve(event.data);
        worker.postMessage({ type, deep }, [channel.port2]);
      }), deep || type === 'REPAIR_OFFLINE' ? 120000 : 12000);
    } finally { channel.port1.close(); channel.port2.close(); }
  }
  async function status(options = {}) {
    const deep = typeof options === 'boolean' ? options : Boolean(options.deep);
    const result = await ask('OFFLINE_STATUS', deep);
    ready = Boolean(result.ready);
    emit('offline-status', ready ? 'Ready to play offline. Everything is saved.' : 'Offline saving is not complete yet.', result);
    return result;
  }
  async function repair() {
    if (unavailable()) { emit('offline', 'There is no usable connection. Your saved game remains playable.'); return { ready, ok: false }; }
    emit('saving', 'Saving and checking all game files…');
    const result = await ask('REPAIR_OFFLINE');
    ready = Boolean(result.ready);
    emit('offline-status', ready ? 'Ready to play offline. Everything is saved.' : 'Some files are still missing. Try again on a reliable connection.', result);
    return result;
  }
  async function checkUpdate({ manual = true } = {}) {
    if (offer()) return { ok: true, waiting: true };
    if (busy || !registration) return { ok: false, reason: 'Offline features are still starting.' };
    if (unavailable()) {
      const reason = navigator.onLine === false ? 'You are offline. Keep playing.' : 'The connection is weak. Checks will resume after a short pause.';
      if (manual) emit('offline', reason);
      return { ok: false, reason };
    }
    if (!manual && Date.now() - lastCheck < 60000) return { ok: false, reason: 'Recently checked.' };
    lastCheck = Date.now(); busy = true;
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 3000);
    if (manual) emit('checking', 'Checking for an update…');
    try {
      const response = await fetch(`/build-info.json?probe=${Date.now()}`, { cache: 'no-store', signal: controller.signal });
      if (!response.ok || response.redirected || !response.headers.get('content-type')?.includes('json')) throw Error('No valid version response');
      const remote = await response.json();
      if (remote.appId !== 'ls-majong' || typeof remote.buildId !== 'string') throw Error('Invalid application version');
      clearTimeout(timer);
      if (remote.buildId !== buildId) {
        emit('downloading', 'The update is downloading. You can keep playing.');
        await bounded(registration.update(), 20000);
        offer();
      } else if (manual) emit('current', 'You have the latest version.');
      return { ok: true, remote: remote.buildId };
    } catch {
      poorUntil = Date.now() + 90000;
      const reason = 'The connection did not answer. Your saved game is ready to keep playing; checks will pause for 90 seconds.';
      emit('weak-signal', reason, { cooldownMs: 90000 });
      return { ok: false, reason };
    } finally { clearTimeout(timer); busy = false; }
  }
  async function applyUpdate() {
    if (activating || !registration?.waiting) return false;
    activating = true;
    try {
      if (await beforeReload() === false) throw Error('Progress could not be saved. Export a backup before updating.');
      emit('activating', 'Your game is saved. Opening the update…');
      registration.waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
      setTimeout(() => { if (!reloading) { activating = false; emit('activation-timeout', 'The update is taking longer than expected. You can keep playing.'); } }, 7500);
      return true;
    } catch (error) { activating = false; emit('save-failed', error.message); return false; }
  }
  async function persist() {
    const granted = Boolean(await navigator.storage?.persist?.().catch(() => false));
    emit('storage', granted ? 'Storage protection is enabled. Keep a backup too.' : 'This browser could not promise permanent storage. Keep a backup.');
    return granted;
  }
  async function start() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext || location.protocol === 'file:') {
      emit('unsupported', 'Install from HTTPS to save this game for offline play.'); return;
    }
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data?.type === 'OFFLINE_GET_CLIENT_BUILD') event.ports?.[0]?.postMessage({ buildId });
    });
    navigator.serviceWorker.addEventListener('controllerchange', async () => {
      announce();
      if (!activating || reloading) { status().catch(() => {}); return; }
      try {
        if (await beforeReload() === false) throw Error('Progress could not be saved.');
        reloading = true; location.reload();
      } catch (error) { activating = false; emit('save-failed', error.message); }
    });
    try {
      registration = await bounded(navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }), 12000);
      const watch = () => registration.installing?.addEventListener('statechange', () => {
        if (!offer()) status().catch(() => {});
      });
      registration.addEventListener('updatefound', watch); watch(); announce(); offer();
      status().catch(() => emit('installing', 'Saving the game for offline play. Keep this page open once on Wi-Fi.'));
      setTimeout(() => checkUpdate({ manual: false }), 6000);
    } catch { emit('registration-unavailable', 'Offline saving could not start. Keep a backup and reopen on a reliable connection.'); }
    window.addEventListener('online', () => setTimeout(() => checkUpdate({ manual: false }), 3000));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) checkUpdate({ manual: false }); });
  }
  // The initial render and all save loading happen before any network probe.
  setTimeout(start, 0);
  return { checkUpdate, applyUpdate, status, verify: () => status({ deep: true }), repair,
    saveEverything: repair, persist, isReady: () => ready, version, buildId,
    get registration() { return registration; } };
}
