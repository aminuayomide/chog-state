"use client";
import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";

export default function WeirdnessMeter({ value, standing, thresholds }: { value: number; standing: number; thresholds: number[] }) {
  const mv = useMotionValue(value);
  const rounded = useTransform(mv, (v) => Math.round(v));
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.9, ease: "easeOut" });
    return () => c.stop();
  }, [value, mv]);

  const lo = standing === 0 ? 0 : thresholds[standing - 1];
  const hi = standing < 3 ? thresholds[standing] : null;
  const pct = hi ? Math.max(0, Math.min(1, (value - lo) / (hi - lo))) : 1;

  return (
    <div className="meter">
      <div className="meter-top">
        <span className="meter-label">Weirdness</span>
        <motion.span className="meter-num">{rounded}</motion.span>
      </div>
      <div className="meter-track">
        <motion.div className="meter-fill" animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.9, ease: "easeOut" }} />
      </div>
    </div>
  );
}
