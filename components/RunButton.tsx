"use client";
import { useRef, useState } from "react";
import { sfx } from "../lib/sfx";

const HOLD_MS = 600;

/** Press and hold to arm (prevents accidental runs). Enter/Space fires instantly for keyboards. */
export default function RunButton({ disabled, label, onFire }: { disabled: boolean; label: string; onFire: () => void }) {
  const [progress, setProgress] = useState(0);
  const raf = useRef(0);
  const start = useRef(0);

  const stop = () => { cancelAnimationFrame(raf.current); setProgress(0); };
  const tick = () => {
    const p = Math.min(1, (performance.now() - start.current) / HOLD_MS);
    setProgress(p);
    if (p >= 1) { stop(); onFire(); } else raf.current = requestAnimationFrame(tick);
  };

  return (
    <button
      type="button"
      disabled={disabled}
      className="btn btn-primary run-btn"
      onPointerDown={() => { if (disabled) return; sfx.unlock(); sfx.arm(); start.current = performance.now(); raf.current = requestAnimationFrame(tick); }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => { if (!disabled && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); sfx.unlock(); onFire(); } }}
      style={{ touchAction: "manipulation" }}
    >
      <span className="run-fill" style={{ width: `${progress * 100}%` }} />
      <span className="run-label">{disabled ? "…" : progress > 0 ? "Hold…" : label}</span>
    </button>
  );
}
