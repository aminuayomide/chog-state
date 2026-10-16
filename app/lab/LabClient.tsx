"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import LabScreen from "../../components/LabScreen";
import { UI } from "../../lib/notes";
import { useDemoGame } from "../../lib/useDemoGame";
import type { DemoChog } from "../../lib/chogs";

export default function LabClient({ chogs }: { chogs: DemoChog[] }) {
  const ids = useMemo(() => chogs.map((c) => c.tokenId), [chogs]);
  const { states, ready, phase, last, run, reset } = useDemoGame(ids);
  const [tokenId, setTokenId] = useState<number>(chogs[0]?.tokenId ?? 0);

  if (chogs.length === 0) return <main className="live-main">No Chog images found in public/chogs (expected chog-&lt;tokenId&gt;.png or .webp).</main>;
  const st = states[tokenId];
  if (!ready || !st) return <main className="live-main"><p className="eyebrow">{UI.loading}</p></main>;

  return (
    <LabScreen
      tokenIds={ids} tokenId={tokenId} onSelect={setTokenId}
      artFor={(id) => ({ src: chogs.find((c) => c.tokenId === id)?.src ?? "", tint: 0 })}
      st={st} phase={phase} last={last}
      onRun={(exp, risk) => run(tokenId, exp, risk)} onReset={() => reset(tokenId)}
      banner="Demo · saved in this browser" keeperLabel="demo"
      topRight={<><Link href="/compare" className="link small">Compare</Link><Link href="/live" className="link small">Wallet: mint a Chog</Link></>}
    />
  );
}
