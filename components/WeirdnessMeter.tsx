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
    <div>
      <div className="flex items-end justify-between">
        <span className="text-xs uppercase tracking-widest text-[#9B90C4]">Weirdness</span>
        <motion.span className="font-mono text-4xl font-bold text-[#FF3D81]">{rounded}</motion.span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#2B2250]">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-[#836EF9] to-[#FF3D81]" animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.9, ease: "easeOut" }} />
      </div>
    </div>
  );
}
