"use client";
import { useRef, type ReactNode } from "react";
import "./tilt-card.css";

/** Pointer-driven 3D tilt with a light glare and holographic foil. Idles with a slow sway (great on phones). */
export default function TiltCard({ children, className = "", max = 16, idle = true }: { children: ReactNode; className?: string; max?: number; idle?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(0.5 - py) * max}deg`);
    el.style.setProperty("--ry", `${(px - 0.5) * max}deg`);
    el.style.setProperty("--gx", `${px * 100}%`);
    el.style.setProperty("--gy", `${py * 100}%`);
    el.dataset.active = "1";
  };
  const leave = () => {
    const el = ref.current; if (!el) return;
    el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg");
    el.dataset.active = "0";
  };

  return (
    <div className="tilt-scene">
      <div className={idle ? "tilt-sway" : ""}>
        <div ref={ref} className={`tilt ${className}`} data-active="0" onPointerMove={move} onPointerLeave={leave} onPointerCancel={leave}>
          {children}
          <div className="foil" />
          <div className="glare" />
        </div>
      </div>
    </div>
  );
}
