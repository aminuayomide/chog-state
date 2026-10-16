"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { seededLife } from "./seeded";
import { defaultConfig, effectiveFailBps, newState, randomSeed, runExperiment, type Risk, type RunResult, type State } from "./engine";

const KEY = "chog-state-demo-v2";
export const cfg = defaultConfig();

export type Phase = "idle" | "running" | "pause" | "landed";
export interface LastRun { result: RunResult; experimentId: number; risk: Risk; failBps: number; at: number }

// Timing of the scar moment (ms)
const ANTICIPATION = 800; // the lab hums, the Chog trembles
const PAUSE = 550;        // the held breath before the scar lands
const SETTLE = 1400;      // landed: buttons stay off while it sinks in

function persist(all: Record<number, State>) {
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* storage may be unavailable */ }
}

/** Demo Mode game: runs the engine locally, no wallet, saved in this browser only. */
export function useDemoGame(tokenIds: number[]) {
  const [states, setStates] = useState<Record<number, State>>({});
  const [ready, setReady] = useState(false);
  const [phase, setPhaseState] = useState<Phase>("idle");
  const [last, setLast] = useState<LastRun | null>(null);
  const phaseRef = useRef<Phase>("idle");
  const store = useRef<Record<number, State>>({});
  const timers = useRef<number[]>([]);

  const setPhase = (p: Phase) => { phaseRef.current = p; setPhaseState(p); };

  useEffect(() => {
    let saved: Record<number, State> = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { saved = {}; }
    const init: Record<number, State> = {};
    const nowSec = Math.floor(Date.now() / 1000);
    // the first Chog is fresh (so visitors meet the Origin); the others arrive with a seeded past
    tokenIds.forEach((id, i) => { init[id] = saved[id] ?? seededLife(i, nowSec); });
    store.current = init;
    persist(init);
    setStates(init);
    setReady(true);
    const ts = timers.current;
    return () => ts.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = useCallback((tokenId: number, experimentId: number, risk: Risk) => {
    if (phaseRef.current !== "idle") return;
    const cur = store.current[tokenId] ?? newState();
    const now = Math.floor(Date.now() / 1000);
    let out;
    try {
      out = runExperiment(cur, experimentId, risk, randomSeed(), now, cfg);
    } catch {
      return; // locked or already done: the UI prevents this
    }
    const ex = cfg.experiments[experimentId];
    const failBps = ex.oncePerToken ? 10000 : effectiveFailBps(cfg, ex, risk, now);
    const after = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

    setPhase("running");
    after(() => setPhase("pause"), ANTICIPATION);
    after(() => {
      store.current = { ...store.current, [tokenId]: out.state };
      setStates(store.current);
      persist(store.current);
      setLast({ result: out.result, experimentId, risk, failBps, at: now });
      setPhase("landed");
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(out.result.success ? 30 : [60, 40, 60]);
      }
    }, ANTICIPATION + PAUSE);
    after(() => setPhase("idle"), ANTICIPATION + PAUSE + SETTLE);
  }, []);

  const reset = useCallback((tokenId: number) => {
    store.current = { ...store.current, [tokenId]: newState() };
    setStates(store.current);
    persist(store.current);
    setLast(null);
  }, []);

  return { states, ready, phase, last, run, reset };
}
