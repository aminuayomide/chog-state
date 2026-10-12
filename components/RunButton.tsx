"use client";
import { useRef, useState } from "react";

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
      onPointerDown={() => { if (disabled) return; start.current = performance.now(); raf.current = requestAnimationFrame(tick); }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => { if (!disabled && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onFire(); } }}
      className="relative w-full select-none overflow-hidden rounded-2xl border-4 border-[#0E0A1F] bg-[#FF3D81] px-6 py-5 text-xl font-black uppercase tracking-wider text-white shadow-[0_6px_0_#7a1b43] transition active:translate-y-1 active:shadow-[0_2px_0_#7a1b43] disabled:cursor-not-allowed disabled:opacity-40"
      style={{ touchAction: "manipulation", WebkitUserSelect: "none" }}
    >
      <span className="absolute inset-y-0 left-0 bg-white/35" style={{ width: `${progress * 100}%` }} />
      <span className="relative">{disabled ? "..." : progress > 0 ? "Hold..." : label}</span>
    </button>
  );
}
