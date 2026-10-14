"use client";
import { useState } from "react";
import LabScreen from "./LabScreen";
import { useLiveGame } from "../lib/useLiveGame";
import { monadTestnet } from "../lib/wagmi";
import { UI } from "../lib/notes";
import type { DemoChog } from "../lib/chogs";

/** The same Lab screen as Demo Mode, but every run is a real transaction on Monad testnet. */
export default function LiveLab({ ids, initial, chogs, keeper, onBack }: { ids: number[]; initial: number; chogs: DemoChog[]; keeper: string; onBack: () => void }) {
  const [tokenId, setTokenId] = useState(initial);
  const g = useLiveGame(ids);
  const art = (id: number) => {
    const n = Math.max(1, chogs.length);
    return { src: chogs[(id - 1) % n]?.src ?? "", tint: Math.floor((id - 1) / n) * 55 };
  };
  const st = g.states[tokenId];
  if (!g.ready || !st) return <main className="live-main"><p className="eyebrow">{UI.loading}</p></main>;

  return (
    <LabScreen
      tokenIds={ids} tokenId={tokenId} onSelect={setTokenId} artFor={art}
      st={st} phase={g.phase} last={g.last}
      onRun={(exp, risk) => void g.run(tokenId, exp, risk)}
      banner="Live · Monad testnet · mock Chog" keeperLabel={keeper}
      topRight={<button className="link small" style={{ background: "none", border: 0, cursor: "pointer" }} onClick={onBack}>← My Chogs</button>}
      error={g.error} txHash={g.txHash} explorerUrl={monadTestnet.blockExplorers.default.url}
    />
  );
}
