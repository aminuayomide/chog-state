// Chog State demo engine: a line-for-line TypeScript mirror of ChogStateRegistry.sol.
// Same odds, same math, same milestones. Parity with the contract is tested.
import { keccak256, encodeAbiParameters, type Address } from "viem";
import experimentsJson from "../shared/experiments.json";
import combosJson from "../shared/combos.json";
import modifiersJson from "../shared/modifiers.json";

export const KIND = { FAIL: 0, SUCCESS: 1, MILESTONE: 2, HANDS: 3, COMBO: 4 } as const;
export const M = {
  FIRST_SCAR: 0, FIRST_BREAKTHROUGH: 1, TEN_FAILURES: 2, TWENTY_FIVE_RUNS: 3,
  STREAK_3: 4, STREAK_6: 5, STREAK_9: 6, KNOWN: 7, MARKED: 8, LEGENDARY: 9,
} as const;
export const STANDING_NAMES = ["Blank", "Known", "Marked", "Legendary"] as const;
export const DAY = 86400;
// BigInt constants (no literals like 32n: the Next default tsconfig targets ES2017)
const N32 = BigInt(32), N48 = BigInt(48), N10000 = BigInt(10000), N2 = BigInt(2), N3 = BigInt(3);

export type Risk = 0 | 1 | 2; // Careful, Normal, Reckless

export interface ExperimentCfg {
  id: number; name: string; failBps: number; failScar: number; minStanding: number;
  failMin: number; failMax: number; winMin: number; winMax: number; oncePerToken: boolean;
}
export interface ModifierCfg { id: number; text: string; experimentId: number; failDeltaBps: number; weirdnessMulBps: number }
export interface ComboCfg { id: number; name: string; first: number; second: number; bonus: number }
export interface EngineConfig {
  standingThresholds: [number, number, number];
  dailyFreeRuns: number;
  experiments: Record<number, ExperimentCfg>;
  combos: ComboCfg[];
  modifiers: ModifierCfg[];
}

export interface Entry {
  kind: number; experimentId: number; scarId: number; risk: number;
  noteId: number; weirdnessAfter: number; timestamp: number;
}
export interface State {
  weirdness: number; standing: number; failStreak: number; runCount: number;
  successCount: number; failCount: number; originDone: boolean; lastExperiment: number;
  combosFound: number; runsToday: number; runsDay: number; lastActive: number; milestones: number;
  scars: number[]; // index = scar id (1..8), index 0 unused
  history: Entry[];
}
export interface RunResult {
  success: boolean; scarId: number; noteId: number; roll: number; seed: bigint;
  gain: number; weirdnessAfter: number; entries: Entry[]; // everything written this run
  milestones: number[]; combos: number[]; standingUp: number | null;
}

export function defaultConfig(): EngineConfig {
  const experiments: Record<number, ExperimentCfg> = {};
  for (const e of experimentsJson.experiments) experiments[e.id] = e as ExperimentCfg;
  return {
    standingThresholds: experimentsJson.standingThresholds as [number, number, number],
    dailyFreeRuns: experimentsJson.dailyFreeRuns,
    experiments,
    combos: combosJson as ComboCfg[],
    modifiers: modifiersJson as ModifierCfg[],
  };
}

export function newState(): State {
  return {
    weirdness: 0, standing: 0, failStreak: 0, runCount: 0, successCount: 0, failCount: 0,
    originDone: false, lastExperiment: 0, combosFound: 0, runsToday: 0, runsDay: 0,
    lastActive: 0, milestones: 0, scars: new Array(9).fill(0), history: [],
  };
}

// ---- seeds (same formula as the contract) ----
export function seedFor(
  prevrandao: bigint, timestamp: number, sender: Address, tokenId: bigint, runCount: number, contract: Address
): bigint {
  return BigInt(
    keccak256(
      encodeAbiParameters(
        [{ type: "uint256" }, { type: "uint256" }, { type: "address" }, { type: "uint256" }, { type: "uint16" }, { type: "address" }],
        [prevrandao, BigInt(timestamp), sender, tokenId, runCount, contract]
      )
    )
  );
}
export function randomSeed(): bigint {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return BigInt("0x" + Array.from(b, (x) => x.toString(16).padStart(2, "0")).join(""));
}

// ---- odds ----
export function todaysModifier(cfg: EngineConfig, nowSec: number) {
  const len = cfg.modifiers.length;
  if (len === 0) return { id: 0, experimentId: 0, failDeltaBps: 0, weirdnessMulBps: 10000 };
  const dayIndex = BigInt(Math.floor(nowSec / DAY));
  const idx = Number(BigInt(keccak256(encodeAbiParameters([{ type: "uint256" }], [dayIndex]))) % BigInt(len));
  const m = cfg.modifiers[idx];
  return { id: idx + 1, experimentId: m.experimentId, failDeltaBps: m.failDeltaBps, weirdnessMulBps: m.weirdnessMulBps };
}
const applies = (m: { experimentId: number }, expId: number) => m.experimentId === 0 || m.experimentId === expId;

export function effectiveFailBps(cfg: EngineConfig, ex: ExperimentCfg, risk: Risk, nowSec: number): number {
  let fb = ex.failBps;
  if (risk === 0) fb -= 1500;
  else if (risk === 2) fb += 1000;
  const m = todaysModifier(cfg, nowSec);
  if (applies(m, ex.id)) fb += m.failDeltaBps;
  return Math.min(9500, Math.max(500, fb));
}

function gainFor(cfg: EngineConfig, ex: ExperimentCfg, risk: Risk, success: boolean, n: bigint, nowSec: number): number {
  const lo = success ? ex.winMin : ex.failMin;
  const hi = success ? ex.winMax : ex.failMax;
  const base = lo + Number((n >> N32) % BigInt(hi - lo + 1));
  if (ex.oncePerToken) return base;
  const riskMul = risk === 0 ? 7000 : risk === 2 ? 15000 : 10000;
  const m = todaysModifier(cfg, nowSec);
  const modMul = applies(m, ex.id) ? m.weirdnessMulBps : 10000;
  let g = Math.floor((Math.floor((base * riskMul) / 10000) * modMul) / 10000);
  if (g === 0) g = 1;
  return g;
}

export function standingFor(cfg: EngineConfig, w: number): number {
  const t = cfg.standingThresholds;
  if (w >= t[2]) return 3;
  if (w >= t[1]) return 2;
  if (w >= t[0]) return 1;
  return 0;
}

export function dailyRunsLeft(cfg: EngineConfig, s: State, nowSec: number): number {
  const today = Math.floor(nowSec / DAY);
  const used = s.runsDay === today ? s.runsToday : 0;
  return used >= cfg.dailyFreeRuns ? 0 : cfg.dailyFreeRuns - used;
}

export function isUnlocked(cfg: EngineConfig, s: State, experimentId: number): boolean {
  const ex = cfg.experiments[experimentId];
  if (!ex) return false;
  if (ex.oncePerToken && s.originDone) return false;
  return s.standing >= ex.minStanding;
}

// ---- the run ----
export interface RunOptions { enforceDailyLimit?: boolean }

export function runExperiment(
  prev: State, experimentId: number, risk: Risk, n: bigint, nowSec: number,
  cfg: EngineConfig = defaultConfig(), opts: RunOptions = {}
): { state: State; result: RunResult } {
  if (risk > 2) throw new Error("Bad risk");
  const ex = cfg.experiments[experimentId];
  if (!ex) throw new Error("No such experiment");
  const s: State = structuredClone(prev);
  if (s.standing < ex.minStanding) throw new Error("Locked");
  if (ex.oncePerToken) {
    if (s.originDone) throw new Error("Origin already done");
    s.originDone = true;
  }
  // daily runs
  const today = Math.floor(nowSec / DAY);
  if (s.runsDay !== today) { s.runsDay = today; s.runsToday = 0; }
  if (opts.enforceDailyLimit && s.runsToday >= cfg.dailyFreeRuns) throw new Error("Daily runs used");
  if (s.runsToday < 255) s.runsToday += 1;

  const startLen = s.history.length;
  const roll = Number(n % N10000);
  const success = ex.oncePerToken ? false : roll >= effectiveFailBps(cfg, ex, risk, nowSec);

  // resolve
  const gain = gainFor(cfg, ex, risk, success, n, nowSec);
  s.weirdness += gain;
  const variant = Number((n >> N48) % (success ? N2 : N3));
  const noteId = experimentId * 100 + (success ? 50 + variant : variant);
  let scarId = 0;
  if (success) {
    s.successCount = Math.min(65535, s.successCount + 1);
    s.failStreak = 0;
  } else {
    scarId = ex.failScar;
    s.failCount = Math.min(65535, s.failCount + 1);
    if (s.failStreak < 255) s.failStreak += 1;
    s.scars[scarId] += risk === 2 && !ex.oncePerToken ? 2 : 1;
  }
  s.runCount = Math.min(65535, s.runCount + 1);
  s.history.push({
    kind: success ? KIND.SUCCESS : KIND.FAIL, experimentId, scarId, risk, noteId,
    weirdnessAfter: s.weirdness, timestamp: nowSec,
  });
  const weirdnessAfter = s.weirdness;

  // after run
  const prevExperiment = s.lastExperiment;
  const prevActive = s.lastActive;
  const milestones: number[] = [];
  const combos: number[] = [];
  const milestone = (id: number, bonus: number) => {
    const bit = 1 << id;
    if (s.milestones & bit) return;
    s.milestones |= bit;
    s.weirdness += bonus;
    s.history.push({ kind: KIND.MILESTONE, experimentId: 0, scarId: 0, risk: 0, noteId: 1000 + id, weirdnessAfter: s.weirdness, timestamp: nowSec });
    milestones.push(id);
  };
  if (!success && s.failCount === 1) milestone(M.FIRST_SCAR, 0);
  if (success && s.successCount === 1) milestone(M.FIRST_BREAKTHROUGH, 0);
  if (s.failCount >= 10) milestone(M.TEN_FAILURES, 0);
  if (s.runCount >= 25) milestone(M.TWENTY_FIVE_RUNS, 0);
  if (!success) {
    if (s.failStreak === 3) milestone(M.STREAK_3, 5);
    else if (s.failStreak === 6) milestone(M.STREAK_6, 5);
    else if (s.failStreak === 9) milestone(M.STREAK_9, 5);
  }
  // combos: second experiment within 24h of the first, once per token
  if (prevExperiment !== 0 && prevActive !== 0 && nowSec - prevActive <= DAY) {
    for (let i = 0; i < 8; i++) {
      const c = cfg.combos.find((x) => x.id === i + 1);
      if (!c || c.first !== prevExperiment || c.second !== experimentId) continue;
      const bit = 1 << i;
      if (s.combosFound & bit) continue;
      s.combosFound |= bit;
      s.weirdness += c.bonus;
      s.history.push({ kind: KIND.COMBO, experimentId, scarId: 0, risk: 0, noteId: 2000 + (i + 1), weirdnessAfter: s.weirdness, timestamp: nowSec });
      combos.push(i + 1);
    }
  }
  // standing
  const old = s.standing;
  const next = standingFor(cfg, s.weirdness);
  let standingUp: number | null = null;
  if (next > old) {
    s.standing = next;
    standingUp = next;
    for (let st = old + 1; st <= next; st++) milestone(6 + st, 0);
  }
  s.lastExperiment = experimentId;
  s.lastActive = nowSec;

  return {
    state: s,
    result: { success, scarId, noteId, roll, seed: n, gain, weirdnessAfter, entries: s.history.slice(startLen), milestones, combos, standingUp },
  };
}

/** Mirror of syncOwner: records "Changed hands" (3000). */
export function recordChangedHands(prev: State, nowSec: number): State {
  const s = structuredClone(prev);
  s.history.push({ kind: KIND.HANDS, experimentId: 0, scarId: 0, risk: 0, noteId: 3000, weirdnessAfter: s.weirdness, timestamp: nowSec });
  return s;
}
