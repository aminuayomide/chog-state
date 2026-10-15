"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePublicClient, useWriteContract } from "wagmi";
import { parseEventLogs } from "viem";
import { ADDR, histAbi, registryAbi, runAbi } from "./contracts";
import { cfg, type LastRun, type Phase } from "./useDemoGame";
import { effectiveFailBps, type Risk, type RunResult, type State } from "./engine";
import { monadTestnet } from "./wagmi";

type Client = NonNullable<ReturnType<typeof usePublicClient>>;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const WINDOW = 120; // read the latest 120 history entries

async function readChain(client: Client, id: number): Promise<{ state: State; total: number }> {
  const b = BigInt(id);
  const [res, scars, totalBig] = await Promise.all([
    client.readContract({ address: ADDR.registry, abi: registryAbi, functionName: "getState", args: [b] }),
    client.readContract({ address: ADDR.registry, abi: registryAbi, functionName: "getScarCounts", args: [b] }),
    client.readContract({ address: ADDR.registry, abi: histAbi, functionName: "historyLength", args: [b] }),
  ]);
  const total = Number(totalBig);
  const [entries] = await client.readContract({
    address: ADDR.registry, abi: histAbi, functionName: "getHistory",
    args: [b, BigInt(Math.max(0, total - WINDOW)), BigInt(WINDOW)],
  });
  const s = res[0];
  const state: State = {
    weirdness: Number(s.weirdness), standing: Number(s.standing), failStreak: Number(s.failStreak),
    runCount: Number(s.runCount), successCount: Number(s.successCount), failCount: Number(s.failCount),
    originDone: s.originDone, lastExperiment: Number(s.lastExperiment), combosFound: Number(s.combosFound),
    runsToday: Number(s.runsToday), runsDay: Number(s.runsDay), lastActive: Number(s.lastActive),
    milestones: Number(s.milestones), scars: scars.map(Number),
    history: entries.map((e) => ({
      kind: Number(e.kind), experimentId: Number(e.experimentId), scarId: Number(e.scarId), risk: Number(e.risk),
      noteId: Number(e.noteId), weirdnessAfter: Number(e.weirdnessAfter), timestamp: Number(e.timestamp),
    })),
  };
  return { state, total };
}

function friendly(msg: string): string {
  if (/reject|denied/i.test(msg)) return "No problem. Try again when you're ready.";
  if (/Not the keeper/.test(msg)) return "Only this Chog's keeper can do that.";
  if (/Daily runs used|allowance|insufficient/i.test(msg)) return "He's had enough for today. Come back tomorrow.";
  if (/Locked/.test(msg)) return "That experiment is still locked.";
  return "The lab flickered. Try again?";
}

async function withRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let err: unknown;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) { err = e; await sleep(500 * 2 ** i); }
  }
  throw err;
}

/** Same shape as the demo game, but every run is a real transaction and the contract rolls the dice.
 *  Only the open Chog is loaded (4 requests), and a failed read is retried instead of hanging. */
export function useLiveGame(tokenId: number) {
  const client = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [states, setStates] = useState<Record<number, State>>({});
  const [phase, setPhaseState] = useState<Phase>("idle");
  const [last, setLast] = useState<LastRun | null>(null);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const phaseRef = useRef<Phase>("idle");
  const statesRef = useRef<Record<number, State>>({});
  const totals = useRef<Record<number, number>>({});
  const setPhase = (p: Phase) => { phaseRef.current = p; setPhaseState(p); };

  const load = useCallback(async (id: number) => {
    if (!client) return;
    setLoading(true); setLoadError("");
    try {
      const r = await withRetry(() => readChain(client, id));
      totals.current[id] = r.total;
      statesRef.current = { ...statesRef.current, [id]: r.state };
      setStates(statesRef.current);
    } catch {
      setLoadError("The lab can't reach Monad right now. The public test network is busy.");
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    setLast(null); setError(""); setTxHash("");
    if (!statesRef.current[tokenId]) void load(tokenId);
  }, [tokenId, load]);

  const run = useCallback(async (experimentId: number, risk: Risk) => {
    if (phaseRef.current !== "idle" || !client) return;
    const before = statesRef.current[tokenId];
    if (!before) return;
    setError(""); setPhase("running");
    try {
      const hash = await writeContractAsync({
        address: ADDR.registry, abi: runAbi, functionName: "runExperiment",
        args: [BigInt(tokenId), experimentId, experimentId === 0 ? 1 : risk], chainId: monadTestnet.id,
      });
      setTxHash(hash);
      const receipt = await client.waitForTransactionReceipt({ hash });
      const ev = parseEventLogs({ abi: runAbi, logs: receipt.logs, eventName: "ExperimentRun" })[0];
      if (!ev) throw new Error("no event");
      const { state: after, total } = await withRetry(() => readChain(client, tokenId));
      const added = Math.max(0, total - (totals.current[tokenId] ?? before.history.length));
      let entries = after.history.slice(Math.max(0, after.history.length - added));
      const mi = entries.findIndex((e) => e.kind === 0 || e.kind === 1);
      if (mi > 0) entries = [entries[mi], ...entries.slice(0, mi), ...entries.slice(mi + 1)];
      const seed = BigInt(ev.args.seed);
      const now = Math.floor(Date.now() / 1000);
      const ex = cfg.experiments[experimentId];
      const result: RunResult = {
        success: ev.args.success, scarId: Number(ev.args.scarId), noteId: Number(ev.args.noteId),
        roll: Number(seed % BigInt(10000)), seed, gain: Number(ev.args.weirdnessAfter) - before.weirdness,
        weirdnessAfter: Number(ev.args.weirdnessAfter), entries,
        milestones: entries.filter((e) => e.kind === 2).map((e) => e.noteId - 1000),
        combos: entries.filter((e) => e.kind === 4).map((e) => e.noteId - 2000),
        standingUp: after.standing > before.standing ? after.standing : null,
      };
      const failBps = ex.oncePerToken ? 10000 : effectiveFailBps(cfg, ex, risk, now);
      setPhase("pause");
      await sleep(550);
      totals.current[tokenId] = total;
      statesRef.current = { ...statesRef.current, [tokenId]: after };
      setStates(statesRef.current);
      setLast({ result, experimentId, risk, failBps, at: now });
      setPhase("landed");
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(result.success ? 30 : [60, 40, 60]);
      await sleep(1400);
      setPhase("idle");
    } catch (e) {
      setError(friendly(e instanceof Error ? e.message : String(e)));
      setPhase("idle");
    }
  }, [client, writeContractAsync, tokenId]);

  return { st: states[tokenId], loading, loadError, phase, last, error, txHash, run, retry: () => load(tokenId) };
}
