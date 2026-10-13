"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LivingChog from "../../components/LivingChog";
import SpecimenCard from "../../components/SpecimenCard";
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

const KIND_MARK: Record<number, string> = { 0: "✕", 1: "✓", 2: "★", 3: "⇄", 4: "⚡" };

export default function LabClient({ chogs }: { chogs: DemoChog[] }) {
  const ids = useMemo(() => chogs.map((c) => c.tokenId), [chogs]);
  const { states, ready, phase, last, run, reset } = useDemoGame(ids);
  const [tokenId, setTokenId] = useState<number | null>(chogs[0]?.tokenId ?? null);
  const [risk, setRisk] = useState<Risk>(1);
  const [pick, setPick] = useState(0);
  const [now, setNow] = useState(0);
  const [muted, setMuted] = useState(false);

  const chog = chogs.find((c) => c.tokenId === tokenId);
  const st: State | undefined = tokenId !== null ? states[tokenId] : undefined;

  useEffect(() => { setNow(Math.floor(Date.now() / 1000)); }, [st, phase]);
  useEffect(() => { setMuted(sfx.isMuted()); }, []);
  useEffect(() => {
    if (!st) return;
    if (!st.originDone) { if (pick !== 0) setPick(0); }
    else if (!isUnlocked(cfg, st, pick)) setPick(1);
  }, [st, pick]);
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
    return <main className="live-main">No Chog images found in public/chogs (expected chog-&lt;tokenId&gt;.png or .webp).</main>;
  }
  if (!ready || !st || !chog || !now) {
    return <main className="live-main"><p className="eyebrow">{UI.loading}</p></main>;
  }

  const busy = phase !== "idle";
  const effRisk: Risk = pick === 0 ? 1 : risk;
  const title = titleFor(st.scars, st.standing);
  const reaction = reactionFor({ scars: st.scars, standing: st.standing, successCount: st.successCount, lastActive: st.lastActive, nowSec: now });
  const goal = nextGoal(st, cfg);
  const mod = todaysModifier(cfg, now);
  const modText = cfg.modifiers[mod.id - 1]?.text;
  const experiments = st.originDone ? Object.values(cfg.experiments).filter((e) => !e.oncePerToken) : [cfg.experiments[0]];
  const showReport = last && (phase === "landed" || phase === "idle");
  const pickedEx = cfg.experiments[pick];
  const pickedPct = Math.round(effectiveFailBps(cfg, pickedEx, effRisk, now) / 100);

  const shake =
    phase === "running" ? { x: [0, -3, 3, -2, 2, 0], transition: { repeat: Infinity, duration: 0.3 } }
    : phase === "landed" && last && !last.result.success ? { x: [0, -12, 10, -8, 6, 0], rotate: [0, -1.5, 1.5, -1, 0], transition: { duration: 0.45 } }
    : { x: 0, rotate: 0 };

  return (
    <main className="live-main lab-main">
      <header className="live-top">
        <Link href="/" className="brand" style={{ textDecoration: "none", color: "inherit" }}><span className="brand-mark" aria-hidden="true" />CHOG STATE</Link>
        <div className="top-right">
          <span className="net-pill"><i aria-hidden="true" />Demo · saved in this browser</span>
          <button className="keeper-chip sfx" aria-pressed={!muted} onClick={() => { const m = !muted; sfx.setMuted(m); setMuted(m); if (!m) { sfx.unlock(); sfx.milestone(); } }}>
            Sound {muted ? "off" : "on"}
          </button>
          <Link href="/live" className="link small">Wallet: mint a Chog</Link>
        </div>
      </header>

      <div className="lab-grid">
        <section aria-label="Your Chog">
          <div className="picker" role="group" aria-label="Choose a Chog">
            {chogs.map((c) => (
              <button key={c.tokenId} className="thumb" disabled={busy} aria-pressed={c.tokenId === tokenId} aria-label={`Chog number ${c.tokenId}`} onClick={() => setTokenId(c.tokenId)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.src} alt="" />
              </button>
            ))}
          </div>

          <motion.div animate={shake}>
            <SpecimenCard no={chog.tokenId} keeper="demo" standingName={STANDING_NAMES[st.standing]}>
              <div className="stage">
                <LivingChog src={chog.src} scars={st.scars} standing={0} boons={st.successCount} tokenId={chog.tokenId} alt={`Chog number ${chog.tokenId}`} />
                <AnimatePresence>
                  {phase === "pause" && (
                    <motion.div key="dim" className="ov" style={{ background: "#000" }} initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} />
                  )}
                  {phase === "landed" && last && (
                    <motion.div key={`flash-${last.at}-${last.result.noteId}`} className="ov" style={{ background: last.result.success ? "#B6FF3B" : "#fff" }} initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.55 }} />
                  )}
                </AnimatePresence>
              </div>
            </SpecimenCard>
          </motion.div>

          <div className="title-block">
            <p className="eyebrow">Chog Nº {chog.tokenId} · {STANDING_NAMES[st.standing]}</p>
            <h1 className="title">{title}</h1>
            <p className="reaction">{reaction}</p>
          </div>
          <WeirdnessMeter value={st.weirdness} standing={st.standing} thresholds={cfg.standingThresholds} />
          <div className="goal"><b>Next</b>{goal}</div>
        </section>

        <section aria-label="The lab">
          {!st.originDone && (
            <div className="origin">{ORIGIN_CINEMATIC.map((l, i) => (<p key={i}>{l}</p>))}</div>
          )}
          {modText && <p className="today">Today in the lab: <b>{modText}</b></p>}

          {pick !== 0 && (
            <>
              <p className="sect" style={{ marginTop: 0 }}>How reckless?</p>
              <div className="seg" role="group" aria-label="Risk level">
                {([0, 1, 2] as Risk[]).map((r) => (
                  <button key={r} disabled={busy} aria-pressed={risk === r} onClick={() => setRisk(r)}>
                    <b>{UI.risk[String(r) as "0" | "1" | "2"].name}</b>
                    <span>{UI.risk[String(r) as "0" | "1" | "2"].hint}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <p className="sect">{st.originDone ? "Choose an experiment" : "Where it started"}</p>
          <div className="xps">
            {experiments.map((e) => {
              const open = isUnlocked(cfg, st, e.id);
              const pct = e.oncePerToken ? 100 : Math.round(effectiveFailBps(cfg, e, effRisk, now) / 100);
              return (
                <button key={e.id} className={`xp ${open ? "" : "locked"}`} disabled={!open || busy} aria-pressed={pick === e.id} onClick={() => setPick(e.id)}>
                  <span className="xp-tag">EXP {String(e.id).padStart(2, "0")}</span>
                  <b>{open ? "" : "🔒 "}{e.name}</b>
                  <span className="xp-odds">{open ? <><i>{pct}%</i>fails</> : fill(UI.locked, { standing: STANDING_NAMES[e.minStanding] })}</span>
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {showReport && last && (
              <motion.div key={`${last.at}-${last.result.seed}`} className="report" initial={{ opacity: 0, y: 16, rotate: -1 }} animate={{ opacity: 1, y: 0, rotate: 0 }} exit={{ opacity: 0 }}>
                <span className={`stamp ${last.result.success ? "win" : "fail"}`}>{last.result.success ? "Breakthrough" : "Failed"}</span>
                <p className="big">{noteText(last.result.noteId)}</p>
                <p className="sub">{pickLine(last.result.success ? UI.afterSuccess : UI.afterScar, Number(last.result.seed % BigInt(1000)))}</p>
                <div className="math">
                  {last.result.scarId ? `Scar: ${SCAR_NAMES[last.result.scarId]} ×${st.scars[last.result.scarId]} · ` : ""}+{last.result.gain} weirdness<br />
                  Fail chance {Math.round(last.failBps / 100)}% · rolled {(last.result.roll / 100).toFixed(2)} (needs {(last.failBps / 100).toFixed(2)}+ to succeed)
                </div>
                {last.result.entries.slice(1).map((e, i) => (<div key={i} className="chip">{KIND_MARK[e.kind]} {noteText(e.noteId)}</div>))}
                {last.result.standingUp !== null && (
                  <div className="chip gold">{STANDING_INFO[last.result.standingUp].name}: {STANDING_INFO[last.result.standingUp].tagline}</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <p className="sect">Life so far · {st.history.length}</p>
          {st.history.length === 0 && <p style={{ color: "var(--muted)" }}>{UI.emptyChronicle}</p>}
          <ul className="life">
            {st.history.slice().reverse().slice(0, 8).map((e, i) => (
              <li key={i} className={e.kind === 2 || e.kind === 4 ? "m" : ""}>{noteText(e.noteId)}</li>
            ))}
          </ul>
          <button className="reset" onClick={() => reset(chog.tokenId)} disabled={busy}>Reset this Chog</button>
        </section>
      </div>

      <div className="runbar">
        <div className="runbar-in">
          <div className="runbar-info">
            <b>{pickedEx?.name}</b>
            <span>{pick === 0 ? "The beginning" : UI.risk[String(effRisk) as "0" | "1" | "2"].name} · fails {pickedPct}%</span>
          </div>
          <div className="runbar-btn">
            <RunButton disabled={busy} label={pick === 0 ? "Begin" : "Run"} onFire={() => run(chog.tokenId, pick, effRisk)} />
          </div>
        </div>
      </div>
    </main>
  );
}
