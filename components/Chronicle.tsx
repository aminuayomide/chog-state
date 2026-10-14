"use client";
import { useState } from "react";
import { cfg } from "../lib/useDemoGame";
import { fill, noteText, UI } from "../lib/notes";
import { SCAR_NAMES } from "../lib/scars";
import type { Entry } from "../lib/engine";

const RISK = ["Careful", "Normal", "Reckless"];
const when = (ts: number) =>
  new Date(ts * 1000).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

function Item({ e }: { e: Entry }) {
  if (e.kind === 2) {
    return <div className="ev milestone"><span className="ev-tag">★ Milestone</span><p className="ev-note">{noteText(e.noteId)}</p></div>;
  }
  if (e.kind === 4) {
    const combo = cfg.combos.find((c) => c.id === e.noteId - 2000);
    return <div className="ev combo"><span className="ev-tag">⚡ Combo{combo ? ` · ${combo.name}` : ""}</span><p className="ev-note">{noteText(e.noteId)}</p></div>;
  }
  if (e.kind === 3) {
    return <div className="ev hands"><span className="ev-tag">⇄ New keeper</span><p className="ev-note">{noteText(e.noteId)}</p></div>;
  }
  const ex = cfg.experiments[e.experimentId];
  const win = e.kind === 1;
  return (
    <div className={`ev ${win ? "win" : "fail"}`}>
      <div className="ev-head">
        <span className="ev-tag">{win ? "✓ Breakthrough" : "✕ Failed"} · EXP {String(e.experimentId).padStart(2, "0")} {ex?.name}</span>
        <span className="ev-time">{when(e.timestamp)}</span>
      </div>
      <p className="ev-note">{noteText(e.noteId)}</p>
      <div className="ev-meta">
        {e.scarId ? <span className="pill">Scar · {SCAR_NAMES[e.scarId]}</span> : null}
        {e.experimentId !== 0 && e.risk !== 1 ? <span className="pill">{RISK[e.risk]}</span> : null}
        <span className="pill">weirdness → {e.weirdnessAfter}</span>
      </div>
    </div>
  );
}

/** The life story: newest first, split into chapters whenever the Chog changes hands. */
export default function Chronicle({ history, limit = 10 }: { history: Entry[]; limit?: number }) {
  const [all, setAll] = useState(false);
  if (history.length === 0) return <p style={{ color: "var(--muted)" }}>{UI.emptyChronicle}</p>;

  const chapters: { n: number; entries: Entry[] }[] = [{ n: 1, entries: [] }];
  for (const e of history) {
    if (e.kind === 3) chapters.push({ n: chapters.length + 1, entries: [e] });
    else chapters[chapters.length - 1].entries.push(e);
  }

  let budget = all ? Infinity : limit;
  const view = [...chapters].reverse().map((c) => {
    const list = [...c.entries].reverse();
    const take = list.slice(0, Math.max(0, budget));
    budget -= take.length;
    return { n: c.n, entries: take };
  }).filter((c) => c.entries.length > 0);

  return (
    <div className="chronicle">
      {view.map((c) => (
        <section key={c.n}>
          {chapters.length > 1 && (
            <h3 className="chap">{fill(UI.chapter, { n: c.n })}{c.n > 1 ? ` · ${UI.chapterNewKeeper}` : ""}</h3>
          )}
          <div className="evs">{c.entries.map((e, i) => <Item key={`${c.n}-${i}`} e={e} />)}</div>
        </section>
      ))}
      {history.length > limit && (
        <button className="reset" onClick={() => setAll(!all)}>{all ? "Show less" : `Show all ${history.length} entries`}</button>
      )}
    </div>
  );
}
