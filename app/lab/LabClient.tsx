"use client";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LivingChog from "../../components/LivingChog";
import WeirdnessMeter from "../../components/WeirdnessMeter";
import RunButton from "../../components/RunButton";
import { cfg, useDemoGame } from "../../lib/useDemoGame";
import { effectiveFailBps, isUnlocked, STANDING_NAMES, todaysModifier, type Risk, type State } from "../../lib/engine";
import { fill, noteText, ORIGIN_CINEMATIC, pickLine, STANDING_INFO, UI } from "../../lib/notes";
import { reactionFor, titleFor } from "../../lib/reactions";
import { nextGoal } from "../../lib/goals";
import { SCAR_NAMES } from "../../lib/scars";
import { sfx } from "../../lib/sfx";
import type { DemoChog } from "../../lib/chogs";

const KIND_ICON: Record<number, string> = { 0: "✕", 1: "✓", 2: "★", 3: "⇄", 4: "⚡" };

export default function LabClient({ chogs }: { chogs: DemoChog[] }) {
  const ids = useMemo(() => chogs.map((c) => c.tokenId), [chogs]);
  const { states, ready, phase, last, run, reset } = useDemoGame(ids);
  const [tokenId, setTokenId] = useState<number | null>(chogs[0]?.tokenId ?? null);
  const [risk, setRisk] = useState<Risk>(1);
  const [pick, setPick] = useState(0);
  const [now, setNow] = useState(0);

  const chog = chogs.find((c) => c.tokenId === tokenId);
  const st: State | undefined = tokenId !== null ? states[tokenId] : undefined;

  useEffect(() => { setNow(Math.floor(Date.now() / 1000)); }, [st, phase]);
  useEffect(() => {
    if (!st) return;
    if (!st.originDone) { if (pick !== 0) setPick(0); }
    else if (!isUnlocked(cfg, st, pick)) setPick(1);
  }, [st, pick]);

  // sound follows the phases of a run
  const [muted, setMuted] = useState(false);
  useEffect(() => { setMuted(sfx.isMuted()); }, []);
  useEffect(() => {
    if (phase === "running") sfx.hum();
    if (phase === "landed" && last) {
      if (last.result.success) sfx.win(); else sfx.fail();
      if (last.result.milestones.length || last.result.combos.length) window.setTimeout(() => sfx.milestone(), 450);
      if (last.result.standingUp !== null) window.setTimeout(() => sfx.standing(), 800);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (chogs.length === 0) {
    return <main className="p-8 text-[#F4EEFF]">No Chog images found in public/chogs (expected chog-&lt;tokenId&gt;.png or .webp).</main>;
  }
  if (!ready || !st || !chog || !now) {
    return <main className="min-h-screen bg-[#0E0A1F] p-8 text-[#9B90C4]">{UI.loading}</main>;
  }

  const busy = phase !== "idle";
  const title = titleFor(st.scars, st.standing);
  const reaction = reactionFor({ scars: st.scars, standing: st.standing, successCount: st.successCount, lastActive: st.lastActive, nowSec: now });
  const goal = nextGoal(st, cfg);
  const mod = todaysModifier(cfg, now);
  const modText = cfg.modifiers[mod.id - 1]?.text;
  const experiments = st.originDone ? Object.values(cfg.experiments).filter((e) => !e.oncePerToken) : [cfg.experiments[0]];
  const showReport = last && (phase === "landed" || phase === "idle");
  const effRisk: Risk = pick === 0 ? 1 : risk;

  const shake =
    phase === "running" ? { x: [0, -3, 3, -2, 2, 0], transition: { repeat: Infinity, duration: 0.3 } }
    : phase === "landed" && last && !last.result.success ? { x: [0, -12, 10, -8, 6, 0], rotate: [0, -1.5, 1.5, -1, 0], transition: { duration: 0.45 } }
    : { x: 0, rotate: 0 };

  return (
    <main className="min-h-screen bg-[#0E0A1F] pb-28 text-[#F4EEFF]">
      <div className="relative bg-[#B6FF3B] px-4 py-1 text-center text-xs font-bold uppercase tracking-widest text-[#0E0A1F]">
        {UI.demoBanner}
        <button onClick={() => { const m = !muted; sfx.setMuted(m); setMuted(m); if (!m) { sfx.unlock(); sfx.milestone(); } }}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-[#0E0A1F] px-2 py-0.5 text-[10px] text-[#B6FF3B]" aria-label="Toggle sound">
          {muted ? "SFX OFF" : "SFX ON"}
        </button>
      </div>

      <div className="mx-auto grid max-w-5xl gap-6 p-4 lg:grid-cols-[minmax(0,440px)_1fr]">
        {/* LEFT: the Chog */}
        <section className="space-y-4">
          <div className="flex gap-2">
            {chogs.map((c) => (
              <button key={c.tokenId} disabled={busy} onClick={() => setTokenId(c.tokenId)}
                className={`h-14 w-14 overflow-hidden rounded-xl border-4 transition ${c.tokenId === tokenId ? "border-[#836EF9]" : "border-transparent opacity-60"}`}
                aria-label={`Chog #${c.tokenId}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>

          <motion.div animate={shake} className="relative">
            <LivingChog src={chog.src} scars={st.scars} standing={st.standing} boons={st.successCount} tokenId={chog.tokenId} alt={`Chog #${chog.tokenId}`} />
            <AnimatePresence>
              {phase === "pause" && (
                <motion.div key="dim" className="pointer-events-none absolute inset-0 rounded-[20px] bg-black" initial={{ opacity: 0 }} animate={{ opacity: 0.55 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} />
              )}
              {phase === "landed" && last && (
                <motion.div key={`flash-${last.at}-${last.result.noteId}`} className={`pointer-events-none absolute inset-0 rounded-[20px] ${last.result.success ? "bg-[#B6FF3B]" : "bg-white"}`} initial={{ opacity: 0.85 }} animate={{ opacity: 0 }} transition={{ duration: 0.55 }} />
              )}
            </AnimatePresence>
          </motion.div>

          <div>
            <div className="text-xs uppercase tracking-widest text-[#9B90C4]">Chog #{chog.tokenId} · {STANDING_NAMES[st.standing]}</div>
            <h1 className="text-2xl font-black">{title}</h1>
            <p className="mt-1 text-sm italic text-[#B9AEE0]">{reaction}</p>
          </div>

          <WeirdnessMeter value={st.weirdness} standing={st.standing} thresholds={cfg.standingThresholds} />

          <div className="rounded-xl bg-[#1A1333] px-4 py-3 text-sm">
            <span className="mr-2 text-[#B6FF3B]">▸ Next</span>{goal}
          </div>
        </section>

        {/* RIGHT: the lab */}
        <section className="space-y-4">
          {!st.originDone && (
            <div className="rounded-2xl border-2 border-[#836EF9] bg-[#1A1333] p-4">
              {ORIGIN_CINEMATIC.map((l, i) => (<p key={i} className="text-sm leading-relaxed text-[#D8D0F5]">{l}</p>))}
            </div>
          )}

          {modText && <div className="text-xs text-[#9B90C4]">Today in the lab: <span className="text-[#F4EEFF]">{modText}</span></div>}

          {pick !== 0 && (
            <div className="grid grid-cols-3 gap-2">
              {([0, 1, 2] as Risk[]).map((r) => (
                <button key={r} disabled={busy} onClick={() => setRisk(r)}
                  className={`rounded-xl border-2 px-2 py-2 text-left transition ${risk === r ? "border-[#FF3D81] bg-[#2A1530]" : "border-[#2B2250] bg-[#1A1333]"}`}>
                  <div className="text-sm font-bold">{UI.risk[String(r) as "0" | "1" | "2"].name}</div>
                  <div className="text-[11px] leading-tight text-[#9B90C4]">{UI.risk[String(r) as "0" | "1" | "2"].hint}</div>
                </button>
              ))}
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            {experiments.map((e) => {
              const open = isUnlocked(cfg, st, e.id);
              const pct = e.oncePerToken ? 100 : Math.round(effectiveFailBps(cfg, e, effRisk, now) / 100);
              return (
                <button key={e.id} disabled={!open || busy} onClick={() => setPick(e.id)}
                  className={`rounded-2xl border-4 p-3 text-left transition ${pick === e.id ? "border-[#836EF9] bg-[#241B47]" : "border-[#2B2250] bg-[#1A1333]"} ${open ? "" : "opacity-45"}`}>
                  <div className="font-black">{open ? "" : "🔒 "}{e.name}</div>
                  <div className="mt-1 text-xs text-[#9B90C4]">
                    {open ? `Fails ${pct}% of the time` : fill(UI.locked, { standing: STANDING_NAMES[e.minStanding] })}
                  </div>
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {showReport && last && (
              <motion.div key={`${last.at}-${last.result.seed}`} initial={{ opacity: 0, y: 14, rotate: -1 }} animate={{ opacity: 1, y: 0, rotate: 0 }} exit={{ opacity: 0 }}
                className="space-y-2 rounded-2xl border-4 border-[#0E0A1F] bg-[#1A1333] p-4">
                <span className={`inline-block -rotate-3 rounded border-4 px-3 py-1 text-lg font-black uppercase ${last.result.success ? "border-[#B6FF3B] text-[#B6FF3B]" : "border-[#FF3D81] text-[#FF3D81]"}`}>
                  {last.result.success ? "Breakthrough" : "Failed"}
                </span>
                <p className="text-lg font-bold leading-snug">{noteText(last.result.noteId)}</p>
                <p className="text-sm text-[#B9AEE0]">{pickLine(last.result.success ? UI.afterSuccess : UI.afterScar, Number(last.result.seed % BigInt(1000)))}</p>
                <div className="font-mono text-xs text-[#9B90C4]">
                  {last.result.scarId ? `Scar: ${SCAR_NAMES[last.result.scarId]} (x${st.scars[last.result.scarId]}) · ` : ""}+{last.result.gain} weirdness<br />
                  Fail chance {Math.round(last.failBps / 100)}% · rolled {(last.result.roll / 100).toFixed(2)} (needs {(last.failBps / 100).toFixed(2)} or more to succeed)
                </div>
                {last.result.entries.slice(1).map((e, i) => (
                  <div key={i} className="rounded-lg bg-[#241B47] px-3 py-2 text-sm">{KIND_ICON[e.kind]} {noteText(e.noteId)}</div>
                ))}
                {last.result.standingUp !== null && (
                  <div className="rounded-lg bg-[#FFD76A] px-3 py-2 text-sm font-bold text-[#0E0A1F]">
                    {STANDING_INFO[last.result.standingUp].name}: {STANDING_INFO[last.result.standingUp].tagline}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <div className="mb-1 text-xs uppercase tracking-widest text-[#9B90C4]">Life so far ({st.history.length})</div>
            {st.history.length === 0 && <p className="text-sm text-[#9B90C4]">{UI.emptyChronicle}</p>}
            <ul className="space-y-1 text-sm">
              {st.history.slice().reverse().slice(0, 8).map((e, i) => (
                <li key={i} className="flex gap-2 text-[#D8D0F5]"><span className="w-4 text-center text-[#836EF9]">{KIND_ICON[e.kind]}</span>{noteText(e.noteId)}</li>
              ))}
            </ul>
          </div>

          <button onClick={() => reset(chog.tokenId)} disabled={busy} className="text-xs text-[#9B90C4] underline">Reset this Chog</button>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t-4 border-[#0E0A1F] bg-[#120C28]/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-bold">{cfg.experiments[pick]?.name}</div>
            <div className="truncate text-xs text-[#9B90C4]">
              {pick === 0 ? "The beginning" : UI.risk[String(effRisk) as "0" | "1" | "2"].name} · fails {Math.round(effectiveFailBps(cfg, cfg.experiments[pick], effRisk, now) / 100)}%
            </div>
          </div>
          <div className="w-44 shrink-0 sm:w-60">
            <RunButton disabled={busy} label={pick === 0 ? "Begin" : "Run"} onFire={() => run(chog.tokenId, pick, effRisk)} />
          </div>
        </div>
      </div>
    </main>
  );
}
