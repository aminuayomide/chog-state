// Pre-seeded demo lives: the same engine, run with fixed seeds, so Demo Mode opens with Chogs that already have a past.
import { defaultConfig, isUnlocked, newState, runExperiment, type Risk, type State } from "./engine";

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function bigSeed(r: () => number): bigint {
  let h = BigInt(0);
  for (let i = 0; i < 8; i++) h = (h << BigInt(32)) | BigInt(Math.floor(r() * 4294967296));
  return h;
}

interface Recipe {
  runs: number;
  weights: (s: State) => Record<number, number>;
  risk: (r: () => number) => Risk;
  stopAtStanding?: number;
}

const RECIPES: Recipe[] = [
  { // the Melted one: obsessed with Overclock Brain
    runs: 4,
    weights: () => ({ 1: 8, 2: 1, 4: 1 }),
    risk: (r) => (r() < 0.7 ? 2 : 1),
  },
  { // the Haunted one: worked its way up to the Haunted Server Rack
    runs: 11,
    weights: (s: State): Record<number, number> => (s.standing >= 2 ? { 6: 8, 5: 3, 3: 1 } : s.standing >= 1 ? { 5: 4, 3: 2, 1: 1, 2: 1, 4: 1 } : { 3: 3, 2: 2, 1: 1, 4: 2 }),
    risk: (r) => (r() < 0.4 ? 2 : 1),
  },
  { // the Marked one: tried everything a little
    runs: 5,
    weights: () => ({ 1: 3, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 }),
    risk: (r) => (r() < 0.25 ? 2 : r() < 0.5 ? 0 : 1),
  },
  { // the Legend: ran until it became one
    runs: 90,
    weights: () => ({ 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 3 }),
    risk: (r) => (r() < 0.5 ? 2 : 1),
    stopAtStanding: 3,
  },
];

/** index 0 is always a fresh Blank Chog (so new visitors meet the Origin). Others get a seeded past. */
export function seededLife(index: number, nowSec: number, runsOverride?: number): State {
  if (index <= 0) return newState();
  const recipe = RECIPES[(index - 1) % RECIPES.length];
  const cfg = { ...defaultConfig(), dailyFreeRuns: 255 };
  const r = rng(4242 + index * 7919);
  const runs = runsOverride ?? recipe.runs;
  const BASE = 1_800_000_000; // fixed clock while seeding, so results never depend on today's date
  let t = BASE;
  let s = runExperiment(newState(), 0, 1, bigSeed(r), t, cfg).state;
  let extra = 0;
  for (let i = 0; i < runs; i++) {
    t += 2300 + Math.floor(r() * 800);
    const w = recipe.weights(s);
    const pool = Object.keys(w).map(Number).filter((id) => isUnlocked(cfg, s, id));
    const ids = pool.length ? pool : [1];
    let total = ids.reduce((sum, id) => sum + w[id], 0), pick = r() * total, chosen = ids[0];
    for (const id of ids) { pick -= w[id]; if (pick <= 0) { chosen = id; break; } }
    s = runExperiment(s, chosen, recipe.risk(r), bigSeed(r), t, cfg).state;
    if (recipe.stopAtStanding && s.standing >= recipe.stopAtStanding && ++extra > 2) break;
  }
  // move the whole history so it ends shortly before now
  const shift = nowSec - s.lastActive - 900;
  s.history = s.history.map((e) => ({ ...e, timestamp: e.timestamp + shift }));
  s.lastActive += shift;
  s.runsToday = 0;
  s.runsDay = 0;
  return s;
}
