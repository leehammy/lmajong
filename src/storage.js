/** Versioned, portable saves. Browser storage and the asset cache are independent. */
import { isFree, isMatch } from './engine.js';
export const SAVE_KEY = 'ls-majong:save:v1';
export const RECOVERY_KEY = 'ls-majong:save:last-good:v1';
export const QUARANTINE_KEY = 'ls-majong:save:quarantine:v1';
const APP_ID = 'ls-majong';
const MAX_BACKUP = 8 * 1024 * 1024;
const state = { source: 'new', recovered: false, error: '', pendingRecovery: false, corrupt: false };
let writeRevision = 0;
let databasePromise;
let recoveryPromise;

export function defaultSave() {
  return { schema: 1, level: 1, unlocked: 1, coins: 0, completed: [],
    owned: ['mist', 'ivory', 'sage'], settings: { background: 'mist', tile: 'ivory', board: 'sage',
      sound: true, showFree: true, reduceMotion: false, music: true, musicVolume: 50, soundVolume: 80, faces: 'numbered' }, game: null };
}
const integer = (v, min = 0, max = 10000000) => Number.isSafeInteger(v) && v >= min && v <= max;
const name = v => typeof v === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(v);
const plain = v => v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
const coordinate = v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 100000;

/** A saved board: shape, faces, undo history and witness must all be consistent. Daily boards use id 0. */
function validGame(g, id, finished) {
  if (!plain(g) || g.level !== id || g.levelId !== id || !name(g.layoutId)
    || !integer(g.seed, 0, 4294967295) || !integer(g.difficulty, 1, 10)
    || !Array.isArray(g.tiles) || g.tiles.length < 2 || g.tiles.length > 4096 || g.tiles.length % 2
    || !Array.isArray(g.history) || g.history.length > g.tiles.length / 2 || !integer(g.shuffleCount)
    || typeof g.completed !== 'boolean' || !Array.isArray(g.solution) || g.solution.length > g.tiles.length / 2) return false;
  const suitValues = { bamboo: 9, char: 9, dot: 9, wind: 4, dragon: 3, flower: 4, season: 4 };
  for (let i = 0; i < g.tiles.length; i++) {
    const t = g.tiles[i];
    if (!plain(t) || t.id !== i || ![t.x, t.y, t.z].every(coordinate)
      || !Object.hasOwn(suitValues, t.suit) || !integer(t.val, 1, suitValues[t.suit])
      || typeof t.active !== 'boolean') return false;
  }
  const used = new Set();
  for (const pair of g.history) {
    if (!Array.isArray(pair) || pair.length !== 2 || pair[0] === pair[1]) return false;
    for (const id of pair) {
      if (!integer(id, 0, g.tiles.length - 1) || used.has(id) || g.tiles[id].active) return false;
      used.add(id);
    }
    const [a, b] = pair.map(id => g.tiles[id]);
    if (a.suit !== b.suit || (!['flower', 'season'].includes(a.suit) && a.val !== b.val)) return false;
  }
  // A reshuffle discards old undo history, so only this segment is replayed.
  const replay = g.tiles.map(tile => ({ ...tile, active: tile.active || used.has(tile.id) }));
  for (const [a, b] of g.history) {
    if (!isFree(replay[a], replay) || !isFree(replay[b], replay) || !isMatch(replay[a], replay[b])) return false;
    replay[a].active = replay[b].active = false;
  }
  const groups = new Map();
  for (const tile of g.tiles) if (tile.active) {
    const group = ['flower', 'season'].includes(tile.suit) ? tile.suit : tile.suit + ':' + tile.val;
    groups.set(group, (groups.get(group) || 0) + 1);
  }
  if ([...groups.values()].some(count => count % 2)) return false;
  const solutionIds = new Set();
  for (const pair of g.solution) {
    if (!Array.isArray(pair) || pair.length !== 2 || pair[0] === pair[1]) return false;
    for (const id of pair) {
      if (!integer(id, 0, g.tiles.length - 1) || solutionIds.has(id)) return false;
      solutionIds.add(id);
    }
  }
  const remaining = g.tiles.filter(t => t.active).length;
  if (remaining % 2 || g.completed !== (remaining === 0) || (g.completed && !finished)) return false;
  return true;
}

/** Reject unsupported/corrupt saves before they touch live progress. */
export function validateSave(save) {
  if (!plain(save) || save.schema !== 1 || !integer(save.level, 1) || !integer(save.unlocked, 1)
    || !integer(save.coins, 0, 1000000000) || save.level > save.unlocked) return false;
  if (!Array.isArray(save.completed) || save.completed.length > 1000000
    || !save.completed.every(n => integer(n, 1)) || new Set(save.completed).size !== save.completed.length) return false;
  if (!Array.isArray(save.owned) || save.owned.length > 10000 || !save.owned.every(name)) return false;
  const s = save.settings;
  if (!plain(s) || !name(s.background) || !name(s.tile) || !name(s.board)
    || !['sound', 'showFree', 'reduceMotion'].every(k => typeof s[k] === 'boolean')
    || ('music' in s && typeof s.music !== 'boolean')
    || !['musicVolume', 'soundVolume'].every(k => !(k in s) || integer(s[k], 0, 100))
    || ('faces' in s && !['classic', 'numbered', 'pictures'].includes(s.faces))) return false;
  if (save.game !== null && !validGame(save.game, save.level, save.completed.includes(save.level))) return false;
  // Optional since 1.1: the daily puzzle slot and which board is open.
  if ('mode' in save && !['journey', 'daily'].includes(save.mode)) return false;
  if ('daily' in save) {
    const d = save.daily, date = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
    if (!plain(d) || !date(d.date) || typeof d.done !== 'boolean' || !integer(d.streak, 0, 100000)
      || !(d.last === null || date(d.last)) || !(d.game === null || validGame(d.game, 0, d.done))) return false;
  }
  if (save.mode === 'daily' && !save.daily?.game) return false;
  try { if (JSON.stringify(save).length > MAX_BACKUP) return false; } catch { return false; }
  return true;
}
function parse(text) {
  if (typeof text !== 'string' || text.length > MAX_BACKUP) return null;
  try { const value = JSON.parse(text); return validateSave(value) ? value : null; } catch { return null; }
}
function local() { try { return globalThis.localStorage; } catch { return null; } }
function openDatabase() {
  if (databasePromise) return databasePromise;
  if (!globalThis.indexedDB) return Promise.resolve(null);
  databasePromise = new Promise(resolve => {
    let settled = false;
    const done = value => { if (!settled) { settled = true; resolve(value); } };
    const timer = setTimeout(() => done(null), 2500);
    try {
      const request = indexedDB.open('ls-majong-recovery', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('saves');
      request.onsuccess = () => { clearTimeout(timer); done(request.result); };
      request.onerror = request.onblocked = () => { clearTimeout(timer); done(null); };
    } catch { clearTimeout(timer); done(null); }
  });
  return databasePromise;
}
async function mirror(text) {
  const db = await openDatabase();
  if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction('saves', 'readwrite');
      tx.objectStore('saves').put(text, 'latest');
      tx.oncomplete = () => resolve(true);
      tx.onabort = tx.onerror = () => resolve(false);
    } catch { resolve(false); }
  });
}

/** Loads immediately; a recovered IndexedDB save is announced asynchronously. */
export function loadSave() {
  Object.assign(state, { source: 'new', recovered: false, error: '', pendingRecovery: false, corrupt: false });
  const storage = local();
  let current = null, previous = null;
  try {
    current = storage?.getItem(SAVE_KEY);
    const valid = parse(current);
    if (valid) { state.source = 'local'; state.error = ''; return valid; }
    previous = storage?.getItem(RECOVERY_KEY);
    if (current || previous) {
      try { storage?.setItem(QUARANTINE_KEY, JSON.stringify({ quarantinedAt: new Date().toISOString(), current, previous })); } catch { /* raw originals remain in their slots */ }
    }
    const recovered = parse(previous);
    if (recovered) {
      state.source = 'previous'; state.recovered = true;
      state.error = 'Your most recent save could not be read. The previous good save was recovered.';
      try { storage?.setItem(SAVE_KEY, previous); } catch { /* recovery remains in memory */ }
      return recovered;
    }
  } catch (error) { state.error = `Browser storage is unavailable: ${error.message}`; }
  state.source = 'new';
  if (current || previous) {
    state.corrupt = true;
    state.error = 'Saved progress could not be read. Your original save has been preserved; restore a backup or export the recovery data.';
  }
  state.pendingRecovery = true;
  recoverSave();
  return defaultSave();
}
/** Safe to await after first render; never delays the initial screen. */
export function recoverSave() {
  if (state.source === 'local' || state.source === 'previous') return Promise.resolve(null);
  if (recoveryPromise) return recoveryPromise;
  const revision = writeRevision;
  recoveryPromise = (async () => {
    const db = await openDatabase();
    if (!db) return null;
    const text = await new Promise(resolve => {
      try {
        const tx = db.transaction('saves', 'readonly');
        const request = tx.objectStore('saves').get('latest');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      } catch { resolve(null); }
    });
    const recovered = parse(text);
    if (!recovered || revision !== writeRevision) return null;
    state.source = 'indexeddb'; state.recovered = true; state.corrupt = false;
    state.error = 'Your progress was recovered from the extra save copy.';
    try { local()?.setItem(SAVE_KEY, text); } catch { /* recovered in memory */ }
    if (globalThis.dispatchEvent && globalThis.CustomEvent) {
      globalThis.dispatchEvent(new CustomEvent('ls-majong-save-recovered', { detail: recovered }));
    }
    return recovered;
  })().finally(() => { state.pendingRecovery = false; });
  return recoveryPromise;
}
/** Synchronous primary save, previous-good rollback, then a nonblocking mirror. */
export function saveGame(save) {
  if (!validateSave(save)) { state.error = 'This game could not be saved because its progress data is invalid.'; return false; }
  writeRevision++;
  const text = JSON.stringify(save);
  let saved = false;
  try {
    const storage = local();
    if (!storage) throw Error('Browser storage is unavailable');
    const previous = storage.getItem(SAVE_KEY);
    if (parse(previous)) {
      try { storage.setItem(RECOVERY_KEY, previous); } catch { /* primary write has priority */ }
    }
    storage.setItem(SAVE_KEY, text);
    saved = true; state.error = ''; state.source = 'local'; state.corrupt = false;
  } catch (error) { state.error = `Progress could not be saved in browser storage. Export a backup: ${error.message}`; }
  mirror(text).catch(() => false);
  return saved;
}
export function getStorageStatus() { return { ...state }; }
/** Diagnostic export preserves raw unreadable bytes; it is not an importable game backup. */
export function exportRawRecovery() {
  const raw = {};
  for (const key of [SAVE_KEY, RECOVERY_KEY, QUARANTINE_KEY]) {
    try { raw[key] = local()?.getItem(key) ?? null; } catch { raw[key] = null; }
  }
  return JSON.stringify({ format: 'ls-majong-raw-recovery', appId: APP_ID,
    createdAt: new Date().toISOString(), storageStatus: getStorageStatus(), raw }, null, 2);
}

// Synchronous SHA-256 keeps export usable directly inside an Apple download gesture.
export function checksum(text) {
  const bytes = new TextEncoder().encode(text);
  const size = Math.ceil((bytes.length + 9) / 64) * 64;
  const data = new Uint8Array(size); data.set(bytes); data[bytes.length] = 128;
  const view = new DataView(data.buffer), bits = bytes.length * 8;
  view.setUint32(size - 8, Math.floor(bits / 4294967296)); view.setUint32(size - 4, bits >>> 0);
  const primes = [], constants = [];
  for (let n = 2; constants.length < 64; n++) {
    if (primes.every(p => n % p !== 0)) {
      primes.push(n); constants.push((Math.cbrt(n) % 1 * 4294967296) >>> 0);
    }
  }
  let h = primes.slice(0, 8).map(p => (Math.sqrt(p) % 1 * 4294967296) >>> 0);
  const r = (v, n) => (v >>> n) | (v << (32 - n));
  const w = new Uint32Array(64);
  for (let block = 0; block < size; block += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(block + i * 4);
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15], b = w[i - 2];
      w[i] = (w[i - 16] + (r(a, 7) ^ r(a, 18) ^ a >>> 3) + w[i - 7]
        + (r(b, 17) ^ r(b, 19) ^ b >>> 10)) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + constants[i] + w[i]) >>> 0;
      const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h = h.map((v, i) => (v + [a, b, c, d, e, f, g, hh][i]) >>> 0);
  }
  return h.map(v => v.toString(16).padStart(8, '0')).join('');
}
export function exportBackup(save) {
  if (!validateSave(save)) throw Error('The current save is invalid and cannot be exported.');
  const body = { format: 'ls-majong-backup', formatVersion: 1, appId: APP_ID,
    createdAt: new Date().toISOString(), save };
  return JSON.stringify({ ...body, checksum: checksum(JSON.stringify(body)) }, null, 2);
}
export function importBackup(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_BACKUP) throw Error('Choose a backup smaller than 8 MB.');
  let envelope;
  try { envelope = JSON.parse(text); } catch { throw Error('This backup is not valid JSON.'); }
  if (!plain(envelope) || envelope.format !== 'ls-majong-backup' || envelope.formatVersion !== 1
    || envelope.appId !== APP_ID) throw Error("This file is not an L's Majong backup.");
  const { checksum: expected, ...body } = envelope;
  if (typeof expected !== 'string' || checksum(JSON.stringify(body)) !== expected) throw Error('The backup checksum does not match. The file may be damaged.');
  if (!validateSave(body.save)) throw Error('This backup has unsupported or invalid progress data.');
  return body.save;
}
