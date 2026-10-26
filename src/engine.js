/* Gameplay adapted from tcottrill/myMahjong (Unlicense), commit
 * d036069e09ada94e6f5e07e2804aaa7b028fc869, index.html 2775–3140.
 * Free-tile/match rules, Fisher-Yates shuffle and remove-first / assign-pairs
 * generator are preserved. Adaptations add explicit state, seeded randomness,
 * cached identical blocking tests, proven reshuffles and strict deal validation.
 */
export const FACES = Object.freeze([
  ...['bamboo', 'char', 'dot'].flatMap(suit => Array.from({ length: 9 }, (_, i) => ({ suit, val: i + 1 }))),
  ...Array.from({ length: 4 }, (_, i) => ({ suit: 'wind', val: i + 1 })),
  ...Array.from({ length: 3 }, (_, i) => ({ suit: 'dragon', val: i + 1 })),
  ...Array.from({ length: 4 }, (_, i) => ({ suit: 'flower', val: i + 1 })),
  ...Array.from({ length: 4 }, (_, i) => ({ suit: 'season', val: i + 1 })),
]);
export function spriteName(suit, val) {
  switch (suit) {
    case 'bamboo': return 'Sou' + val;
    case 'char': return 'Man' + val;
    case 'dot': return 'Pin' + val;
    case 'wind': return ['Ton', 'Nan', 'Shaa', 'Pei'][val - 1];
    case 'dragon': return ['Chun', 'Hatsu', 'Haku'][val - 1];
    case 'flower': return 'Flower' + val;
    case 'season': return 'Season' + val;
    default: return 'Front';
  }
}
export function seededRandom(seed) {
  let state = (Number(seed) >>> 0) || 0x6d2b79f5;
  return () => {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ state >>> 15, state | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function shuffleArray(array, random = Math.random) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
// Original myMahjong rule, parameterized exactly as its generator was.
export function isFreeAmong(tile, layout, presentSet) {
  let topBlocked = false, leftBlocked = false, rightBlocked = false;
  for (const i of presentSet) {
    const t = layout[i];
    if (t === tile) continue;
    if (t.z === tile.z + 1 && Math.abs(t.x - tile.x) < 2 && Math.abs(t.y - tile.y) < 2) topBlocked = true;
    if (t.z === tile.z && Math.abs(t.y - tile.y) < 2) {
      if (t.x === tile.x - 2) leftBlocked = true;
      if (t.x === tile.x + 2) rightBlocked = true;
    }
  }
  return !topBlocked && (!leftBlocked || !rightBlocked);
}
export function isFree(tile, tiles) {
  if (!tile || !tile.active) return false;
  let topBlocked = false, leftBlocked = false, rightBlocked = false;
  for (const t of tiles) {
    if (!t.active || t === tile) continue;
    if (t.z === tile.z + 1 && Math.abs(t.x - tile.x) < 2 && Math.abs(t.y - tile.y) < 2) topBlocked = true;
    if (t.z === tile.z && Math.abs(t.y - tile.y) < 2) {
      if (t.x === tile.x - 2) leftBlocked = true;
      if (t.x === tile.x + 2) rightBlocked = true;
    }
  }
  return !topBlocked && (!leftBlocked || !rightBlocked);
}
export function isMatch(a, b) {
  if (!a || !b) return false;
  if (a.suit === 'flower' && b.suit === 'flower') return true;
  if (a.suit === 'season' && b.suit === 'season') return true;
  return a.suit === b.suit && a.val === b.val;
}
const blockersCache = new WeakMap();
function blockersFor(layout) {
  if (blockersCache.has(layout)) return blockersCache.get(layout);
  const blockers = layout.map((tile, i) => {
    const above = [], left = [], right = [];
    layout.forEach((t, j) => {
      if (i === j) return;
      if (t.z === tile.z + 1 && Math.abs(t.x - tile.x) < 2 && Math.abs(t.y - tile.y) < 2) above.push(j);
      if (t.z === tile.z && Math.abs(t.y - tile.y) < 2) {
        if (t.x === tile.x - 2) left.push(j);
        if (t.x === tile.x + 2) right.push(j);
      }
    });
    return { above, left, right };
  });
  blockersCache.set(layout, blockers);
  return blockers;
}
// Upstream's free-position pairing algorithm with its identical tests cached.
export function generateRemovalSequence(layout, random = Math.random, activeIndices = null) {
  const present = new Set(activeIndices ?? layout.map((_, i) => i));
  if (present.size % 2) return null;
  const blockers = blockersFor(layout), sequence = [];
  while (present.size >= 2) {
    const free = [];
    for (const i of present) {
      const b = blockers[i];
      if (!b.above.some(j => present.has(j)) && (!b.left.some(j => present.has(j)) || !b.right.some(j => present.has(j)))) free.push(i);
    }
    if (free.length < 2) return null;
    shuffleArray(free, random);
    const [a, b] = free;
    sequence.push([a, b]); present.delete(a); present.delete(b);
  }
  return sequence;
}
export function proveGeometry(layout, seed = 1, activeIndices = null, attempts = 128) {
  const random = seededRandom(seed);
  for (let attempt = 0; attempt < attempts; attempt++) {
    const sequence = generateRemovalSequence(layout, random, activeIndices);
    if (sequence) return sequence;
  }
  return null;
}
function facePairs(count, random, difficulty) {
  let bag = [];
  const symbols = shuffleArray(Array.from({ length: 34 }, (_, i) => i), random);
  if (count >= 68 && count <= 72) {
    // A traditional deck: four of each standard, four flowers, four seasons.
    bag = symbols.flatMap(i => [[i, i], [i, i]]);
    bag.push(...[[34, 35], [36, 37], [38, 39], [40, 41]].slice(0, count - 68));
  } else {
    const variety = Math.min(34, difficulty <= 1 ? Math.ceil(count / 2) : count);
    for (let p = 0; p < count; p++) { const i = symbols[p % variety]; bag.push([i, i]); }
  }
  return shuffleArray(bag, random);
}
export function generateDeal(layoutOrObject, seed, difficulty = 1) {
  const layout = layoutOrObject.positions ?? layoutOrObject;
  if (!layout.length || layout.length % 2 || layout.length > 288) throw new Error('Layout must contain an even 2–288 tiles');
  const sequence = proveGeometry(layout, seed) ?? proveGeometry(layout, 42);
  if (!sequence) throw new Error('Layout has no proven removal sequence');
  const bag = facePairs(sequence.length, seededRandom((Number(seed) ^ 0x9e3779b9) >>> 0), difficulty);
  const faces = Array(layout.length);
  sequence.forEach(([a, b], i) => { faces[a] = bag[i][0]; faces[b] = bag[i][1]; });
  return { faces, solution: sequence };
}
export function createGame(level, layout) {
  const positions = layout.positions ?? layout;
  const deal = level.faces && level.solution ? level : generateDeal(positions, level.seed, level.difficulty);
  if (deal.faces.length !== positions.length) throw new Error('Deal length does not match layout');
  const tiles = positions.map((pos, id) => {
    const face = FACES[deal.faces[id]];
    if (!face) throw new Error('Invalid tile face');
    return { ...pos, id, ...face, active: true };
  });
  return { tiles, solution: deal.solution.map(pair => [...pair]), history: [], seed: level.seed,
    levelId: level.id, layoutId: layout.id ?? level.layoutId, difficulty: level.difficulty ?? 1, shuffleCount: 0 };
}
export function remaining(tiles) { return tiles.reduce((n, t) => n + (t.active ? 1 : 0), 0); }
export function findHint(tiles) {
  const free = tiles.filter(t => t.active && isFree(t, tiles));
  for (let i = 0; i < free.length; i++) for (let j = i + 1; j < free.length; j++)
    if (isMatch(free[i], free[j])) return [free[i].id, free[j].id];
  return null;
}
export function matchPair(game, aId, bId) {
  if (aId === bId) return false;
  const a = game.tiles[aId], b = game.tiles[bId];
  if (!a?.active || !b?.active || !isFree(a, game.tiles) || !isFree(b, game.tiles) || !isMatch(a, b)) return false;
  a.active = false; b.active = false; game.history.push([aId, bId]);
  return true;
}
export function undo(game) {
  const pair = game.history.pop();
  if (!pair) return false;
  for (const id of pair) game.tiles[id].active = true;
  return true;
}
export function reshuffle(game) {
  const active = game.tiles.filter(t => t.active).map(t => t.id);
  if (!active.length) return { reset: false };
  game.shuffleCount = (game.shuffleCount ?? 0) + 1;
  const seed = ((game.seed >>> 0) + Math.imul(game.shuffleCount, 0x9e3779b9)) >>> 0;
  const sequence = proveGeometry(game.tiles, seed, active, 256);
  if (sequence) {
    const groups = new Map();
    for (const id of active) {
      const t = game.tiles[id], key = t.suit === 'flower' || t.suit === 'season' ? t.suit : `${t.suit}:${t.val}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ suit: t.suit, val: t.val });
    }
    if ([...groups.values()].every(group => group.length % 2 === 0)) {
      const pairs = [];
      for (const group of groups.values()) for (let i = 0; i < group.length; i += 2) pairs.push([group[i], group[i + 1]]);
      shuffleArray(pairs, seededRandom(seed ^ 0x85ebca6b));
      sequence.forEach(([a, b], i) => { Object.assign(game.tiles[a], pairs[i][0]); Object.assign(game.tiles[b], pairs[i][1]); });
      game.solution = sequence; game.history = [];
      return { reset: false };
    }
  }
  // A remaining two-tile vertical stack cannot be paired. Free fresh deal of
  // the same level provides an exit for every reachable state, without cost.
  const deal = generateDeal(game.tiles, seed, game.difficulty);
  game.tiles.forEach((t, i) => Object.assign(t, FACES[deal.faces[i]], { active: true }));
  game.solution = deal.solution; game.history = [];
  return { reset: true };
}
export function validateSolution(layout, faces, solution) {
  if (faces.length !== layout.length || solution.length * 2 !== layout.length) return false;
  const present = new Set(layout.map((_, i) => i));
  for (const pair of solution) {
    if (!Array.isArray(pair) || pair.length !== 2) return false;
    const [a, b] = pair;
    if (a === b || !present.has(a) || !present.has(b) || !FACES[faces[a]] || !FACES[faces[b]]) return false;
    if (!isFreeAmong(layout[a], layout, present) || !isFreeAmong(layout[b], layout, present) || !isMatch(FACES[faces[a]], FACES[faces[b]])) return false;
    present.delete(a); present.delete(b);
  }
  return present.size === 0;
}


