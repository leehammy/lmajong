import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { defaultSave, validateSave, saveGame, loadSave, exportBackup, importBackup, checksum,
  SAVE_KEY, RECOVERY_KEY, QUARANTINE_KEY, exportRawRecovery, recoverSave, getStorageStatus } from '../src/storage.js';
class MemoryStorage {
  constructor() { this.values = new Map(); this.deny = false; }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { if (this.deny) throw Error('Quota exceeded'); this.values.set(key, value); }
  removeItem(key) { this.values.delete(key); }
}
function storage() { const value = new MemoryStorage(); globalThis.localStorage = value; return value; }
const playable = () => ({ ...defaultSave(), game: { level: 1, tiles: [
  { id: 0, x: 0, y: 0, z: 0, suit: 'bamboo', val: 1, active: true },
  { id: 1, x: 1, y: 0, z: 0, suit: 'bamboo', val: 1, active: true }
], history: [], solution: [[0,1]], seed: 1, levelId: 1, layoutId: 'test', difficulty: 1, shuffleCount: 0, completed: false } });

test('SHA-256 agrees with Node for empty, Unicode and multi-block content', () => {
  for (const text of ['', 'abc', 'L\'s Majong 🌿', 'a'.repeat(1200)])
    assert.equal(checksum(text), createHash('sha256').update(text).digest('hex'));
});
test('round-trip saves active board, settings, rewards and undo state', () => {
  storage(); const save = playable(); save.coins = 25; save.game.history = [[0,1]]; save.game.tiles.forEach(t => {t.active=false;}); save.game.completed=true; save.completed=[1]; save.unlocked=2;
  assert.equal(saveGame(save), true); assert.deepEqual(loadSave(), save);
  assert.deepEqual(importBackup(exportBackup(save)), save);
});
test('corrupt primary recovers previous good save without overwriting its recovery slot', () => {
  const memory = storage(); const first = playable(); saveGame(first);
  const second = structuredClone(first); second.coins = 50; saveGame(second);
  assert.equal(JSON.parse(memory.getItem(RECOVERY_KEY)).coins, 0);
  memory.setItem(SAVE_KEY, '{broken');
  assert.deepEqual(loadSave(), first); assert.equal(getStorageStatus().recovered, true);
  assert.equal(JSON.parse(memory.getItem(SAVE_KEY)).coins, 0);
});
test('quota error is surfaced; it cannot claim progress was saved', () => {
  const memory = storage(); const save = playable(); saveGame(save); memory.deny = true;
  save.coins = 75; assert.equal(saveGame(save), false);
  assert.match(getStorageStatus().error, /Export a backup/);
  assert.equal(JSON.parse(memory.getItem(SAVE_KEY)).coins, 0);
});
test('backup corruption, another app, unsupported schemas and malformed tiles are rejected', () => {
  const save = playable(), text = exportBackup(save);
  const changed = JSON.parse(text); changed.save.coins = 500;
  assert.throws(() => importBackup(JSON.stringify(changed)), /checksum/);
  const other = JSON.parse(text); other.appId = 'another-game';
  assert.throws(() => importBackup(JSON.stringify(other)), /not an/);
  for (const corrupt of [ { ...save, schema: 2 }, { ...save, coins: -1 },
    { ...save, level: 100, unlocked: 1 }, { ...save, completed: [1,1] },
    { ...save, settings: { ...save.settings, sound: 'yes' } },
    { ...save, game: { ...save.game, tiles: [save.game.tiles[0], save.game.tiles[0]] } } ])
    assert.equal(validateSave(corrupt), false);
  assert.throws(() => importBackup('a'.repeat(8*1024*1024+1)), /smaller/);
});
test('invalid save cannot replace last good progress', () => {
  const memory = storage(); const save = playable(); saveGame(save);
  assert.equal(saveGame({ ...save, coins: NaN }), false);
  assert.deepEqual(JSON.parse(memory.getItem(SAVE_KEY)), save);
});

test('unreadable progress is quarantined and flagged rather than silently cleared', async () => {
  const memory = storage(); memory.setItem(SAVE_KEY, '{broken primary'); memory.setItem(RECOVERY_KEY, '{broken previous');
  assert.deepEqual(loadSave(), defaultSave()); await recoverSave();
  assert.equal(getStorageStatus().corrupt, true);
  assert.equal(memory.getItem(SAVE_KEY), '{broken primary');
  assert.equal(memory.getItem(RECOVERY_KEY), '{broken previous');
  const raw = JSON.parse(exportRawRecovery());
  assert.equal(raw.raw[SAVE_KEY], '{broken primary');
  assert.ok(raw.raw[QUARANTINE_KEY].includes('broken previous'));
});
test('bad history cannot reactivate live, duplicate, missing or mismatched tiles', () => {
  for (const pair of [[0], [0,0], [0,999], [0,1]]) {
    const save = playable(); save.game.history = [pair];
    assert.equal(validateSave(save), false);
  }
  const save = playable(); save.game.tiles.forEach(tile => {tile.active=false;});
  save.game.completed=true; save.completed=[1]; save.unlocked=2;
  save.game.history=[[0,1],[0,1]]; assert.equal(validateSave(save),false);
  save.game.history=[[0,1]]; save.game.tiles[1].val=2; assert.equal(validateSave(save),false);
});

test('remaining matching groups must stay even, including flower/season group rules', () => {
  const save = playable(); save.game.tiles[1].val=2; assert.equal(validateSave(save),false);
  save.game.tiles[0].suit=save.game.tiles[1].suit='flower'; assert.equal(validateSave(save),true);
  save.game.tiles[1].suit='season'; assert.equal(validateSave(save),false);
});
test('undo history is replayed through actual free-tile rules, not just valid IDs', () => {
  const save=playable();
  save.game.tiles=[
    {id:0,x:0,y:0,z:0,suit:'bamboo',val:1,active:false},
    {id:1,x:2,y:0,z:0,suit:'bamboo',val:1,active:false},
    {id:2,x:0,y:0,z:1,suit:'bamboo',val:1,active:true},
    {id:3,x:2,y:0,z:1,suit:'bamboo',val:1,active:true}
  ];
  save.game.solution=[[2,3],[0,1]];save.game.history=[[0,1]];
  assert.equal(validateSave(save),false,'covered lower tiles cannot already have been removed');
  save.game.tiles.forEach(t=>{t.active=t.z===0;});save.game.history=[[2,3]];
  assert.equal(validateSave(save),true,'top pair can be removed to expose lower tiles');
  save.game.history=[];assert.equal(validateSave(save),true,'reshuffle may legitimately clear undo history');
});
test('daily puzzle slot is optional, validated and survives backup', () => {
  storage();
  const daily = { ...playable().game, level: 0, levelId: 0 };
  const save = { ...playable(), mode: 'daily', daily: { date: '2026-10-26', game: daily, done: false, streak: 3, last: '2026-10-25' } };
  assert.equal(validateSave(playable()), true);
  assert.equal(validateSave(save), true);
  assert.deepEqual(importBackup(exportBackup(save)), save);
  for (const bad of [
    { ...save, mode: 'arcade' },
    { ...save, daily: { ...save.daily, date: '26/10/2026' } },
    { ...save, daily: { ...save.daily, game: { ...daily, levelId: 1 } } },
    { ...save, daily: { ...save.daily, game: { ...daily, completed: true, tiles: daily.tiles.map(t => ({ ...t, active: false })) } } },
    { ...save, daily: { ...save.daily, game: null } }
  ]) assert.equal(validateSave(bad), false);
});
