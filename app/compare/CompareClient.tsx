"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import LivingChog from "../../components/LivingChog";
import SpecimenCard from "../../components/SpecimenCard";
import { cfg, useDemoGame } from "../../lib/useDemoGame";
import { STANDING_NAMES, type State } from "../../lib/engine";
import { titleFor } from "../../lib/reactions";
import { SCAR_NAMES, levelOf } from "../../lib/scars";
import { UI } from "../../lib/notes";
import type { DemoChog } from "../../lib/chogs";

const SCAR_IDS = [1, 2, 3, 4, 5, 6, 7];

function verdict(a: State, b: State, an: number, bn: number): string[] {
  const out: string[] = [];
  const diff = Math.abs(a.weirdness - b.weirdness);
  if (diff > 0) out.push(`Nº ${a.weirdness > b.weirdness ? an : bn} is ${diff} weirdness ahead.`);
  const names = (x: State, y: State) => SCAR_IDS.filter((i) => (x.scars[i] ?? 0) > 0 && !((y.scars[i] ?? 0) > 0)).map((i) => SCAR_NAMES[i]);
  const onlyA = names(a, b), onlyB = names(b, a);
  if (onlyA.length) out.push(`Only Nº ${an} carries ${onlyA.join(", ")}.`);
  if (onlyB.length) out.push(`Only Nº ${bn} carries ${onlyB.join(", ")}.`);
  if (!onlyA.length && !onlyB.length) out.push("Same scars, but not the same depth.");
  return out;
}

function Side({ id, src, st }: { id: number; src: string; st: State }) {
  return (
    <div>
      <SpecimenCard no={id} keeper="demo" standingName={STANDING_NAMES[st.standing]} small>
        <LivingChog src={src} scars={st.scars} boons={st.successCount} tokenId={id} alt={`Chog number ${id}`} />
      </SpecimenCard>
      <h2 className="cmp-title">{titleFor(st.scars, st.standing)}</h2>
      <div className="cmp-stats">
        <div><b>{st.weirdness}</b><span>weirdness</span></div>
        <div><b>{st.runCount}</b><span>runs</span></div>
        <div><b>{st.failCount}</b><span>failures</span></div>
        <div><b>{st.successCount}</b><span>wins</span></div>
      </div>
      <ul className="cmp-scars">
        {SCAR_IDS.map((sid) => {
          const c = st.scars[sid] ?? 0, lv = levelOf(c);
          return (
            <li key={sid} className={c ? "" : "zero"}>
              <span>{SCAR_NAMES[sid]}</span>
              <span className="pips" aria-label={`level ${lv} of 3`}>{[1, 2, 3].map((l) => <i key={l} className={lv >= l ? "on" : ""} />)}</span>
              <em>{c || "–"}</em>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function CompareClient({ chogs }: { chogs: DemoChog[] }) {
  const ids = useMemo(() => chogs.map((c) => c.tokenId), [chogs]);
  const { states, ready } = useDemoGame(ids);
  const [a, setA] = useState<number | null>(null);
  const [b, setB] = useState<number | null>(null);
  const A = a ?? ids[1] ?? ids[0], B = b ?? ids[2] ?? ids[ids.length - 1];
  const src = (id: number) => chogs.find((c) => c.tokenId === id)?.src ?? "";

  if (chogs.length < 2) return <main className="live-main">Compare needs at least two Chog images in public/chogs.</main>;
  if (!ready || !states[A] || !states[B]) return <main className="live-main"><p className="eyebrow">{UI.loading}</p></main>;

  return (
    <main className="live-main">
      <header className="live-top">
        <Link href="/" className="brand" style={{ textDecoration: "none", color: "inherit" }}><span className="brand-mark" aria-hidden="true" />CHOG STATE</Link>
        <div className="top-right">
          <span className="net-pill"><i aria-hidden="true" />Demo · saved in this browser</span>
          <Link href="/lab" className="link small">Back to the lab</Link>
        </div>
      </header>
      <p className="eyebrow">Compare</p>
      <h1 className="h1" style={{ fontSize: "clamp(34px,6vw,64px)" }}>Same species. <mark>Different lives.</mark></h1>
      <p className="lead">Every Chog starts identical. What happens to it is written on-chain, scar by scar, and it travels with the NFT. Pick any two.</p>
      <div className="cmp-pick">
        <label className="run-grid"><span style={{ font: "700 11px var(--font-mono)", letterSpacing: ".12em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: 6 }}>Chog A</span>
          <select className="sel" value={A} onChange={(e) => setA(Number(e.target.value))}>{ids.map((id) => <option key={id} value={id}>Nº {id}</option>)}</select></label>
        <label className="run-grid"><span style={{ font: "700 11px var(--font-mono)", letterSpacing: ".12em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: 6 }}>Chog B</span>
          <select className="sel" value={B} onChange={(e) => setB(Number(e.target.value))}>{ids.map((id) => <option key={id} value={id}>Nº {id}</option>)}</select></label>
      </div>
      <div className="cmp-grid">
        <Side id={A} src={src(A)} st={states[A]} />
        <Side id={B} src={src(B)} st={states[B]} />
      </div>
      <div className="verdict">
        <small>The difference</small>
        {verdict(states[A], states[B], A, B).map((l, i) => <p key={i}>{l}</p>)}
      </div>
      <p className="fine"><Link href="/lab" className="link">Run experiments on any of them</Link> · experiments available: {Object.keys(cfg.experiments).length - 1}</p>
    </main>
  );
}
