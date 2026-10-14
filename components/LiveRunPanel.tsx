"use client";
import { useEffect, useState } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { parseEventLogs } from "viem";
import { ADDR, runAbi } from "../lib/contracts";
import { defaultConfig, type Risk } from "../lib/engine";
import { noteText, UI } from "../lib/notes";
import { SCAR_NAMES } from "../lib/scars";
import { monadTestnet } from "../lib/wagmi";
import type { ChainChog } from "../lib/useOnchainState";

const cfg = defaultConfig();

/** Sends an experiment to the registry. The contract (not this page) rolls the dice. */
export default function LiveRunPanel({ ids, chain, onDone }: { ids: number[]; chain: Record<number, ChainChog>; onDone: () => void }) {
  const [token, setToken] = useState<number>(ids[0]);
  const [exp, setExp] = useState(0);
  const [risk, setRisk] = useState<Risk>(1);
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  const c = chain[token];
  const originDone = c?.originDone ?? false;
  const standing = c?.standing ?? 0;
  const options = Object.values(cfg.experiments).filter((e) => (originDone ? !e.oncePerToken && standing >= e.minStanding : e.oncePerToken));
  const optionKey = options.map((o) => o.id).join(",");

  useEffect(() => { if (!ids.includes(token)) setToken(ids[0]); }, [ids, token]);
  useEffect(() => {
    const list = optionKey.split(",").filter(Boolean).map(Number);
    if (!list.includes(exp)) setExp(list[0] ?? 0);
  }, [optionKey, exp]);
  useEffect(() => { if (receipt.isSuccess) onDone(); }, [receipt.isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  const busy = isPending || (!!hash && receipt.isLoading);
  const ev = receipt.data ? parseEventLogs({ abi: runAbi, logs: receipt.data.logs, eventName: "ExperimentRun" })[0] : undefined;
  const msg = error?.message ?? "";
  const friendly = /reject|denied/i.test(msg) ? "No problem. Try again when you're ready."
    : /Not the keeper/.test(msg) ? "Only this Chog's keeper can do that."
    : /Daily runs used|allowance|insufficient/i.test(msg) ? UI.dailyDone
    : /Locked/.test(msg) ? "That experiment is still locked."
    : error ? UI.retry : "";

  return (
    <div className="panel">
      <b>Run an experiment on-chain</b>
      <p style={{ margin: "4px 0 14px", color: "var(--muted)", fontSize: 13 }}>
        The contract rolls the dice and writes the result to that Chog&apos;s file. Only its keeper can do this.
      </p>
      <div className="run-grid">
        <label>Chog
          <select className="sel" value={token} disabled={busy} onChange={(e) => setToken(Number(e.target.value))}>
            {ids.map((id) => <option key={id} value={id}>Nº {id}</option>)}
          </select>
        </label>
        <label>Experiment
          <select className="sel" value={exp} disabled={busy} onChange={(e) => setExp(Number(e.target.value))}>
            {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </label>
        {exp !== 0 && (
          <label>Risk
            <select className="sel" value={risk} disabled={busy} onChange={(e) => setRisk(Number(e.target.value) as Risk)}>
              {([0, 1, 2] as Risk[]).map((r) => <option key={r} value={r}>{UI.risk[String(r) as "0" | "1" | "2"].name}</option>)}
            </select>
          </label>
        )}
        <button className="btn btn-primary" disabled={busy || options.length === 0}
          onClick={() => { reset(); writeContract({ address: ADDR.registry, abi: runAbi, functionName: "runExperiment", args: [BigInt(token), exp, exp === 0 ? 1 : risk], chainId: monadTestnet.id }); }}>
          {isPending ? "Confirm in your wallet…" : busy ? "The lab is humming…" : exp === 0 ? "Begin" : "Run on-chain"}
        </button>
      </div>
      {friendly && <p className="note err" style={{ color: friendly.startsWith("No problem") ? "var(--paper)" : undefined }}>{friendly}</p>}

      {ev && (
        <div className="live-report">
          <span className={`stamp ${ev.args.success ? "win" : "fail"}`}>{ev.args.success ? "Breakthrough" : "Failed"}</span>
          <p className="big">{noteText(ev.args.noteId)}</p>
          <p className="math">
            Chog Nº {String(ev.args.tokenId)} · {ev.args.scarId ? `scar: ${SCAR_NAMES[ev.args.scarId]} · ` : ""}weirdness now {ev.args.weirdnessAfter}<br />
            rolled {(Number(BigInt(ev.args.seed) % BigInt(10000)) / 100).toFixed(2)} ·{" "}
            <a className="link" href={`${monadTestnet.blockExplorers.default.url}/tx/${hash}`} target="_blank" rel="noreferrer">view transaction</a>
          </p>
        </div>
      )}
    </div>
  );
}
