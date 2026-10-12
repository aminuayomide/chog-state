"use client";
import { useState } from "react";
import LivingChog from "../../../components/LivingChog";
import { SCAR_NAMES } from "../../../lib/scars";

interface Props { chogs: { tokenId: number; src: string }[] }

const PRESETS: Record<string, { scars: number[]; standing: number; boons: number }> = {
  Fresh: { scars: [0, 0, 0, 0, 0, 0, 0, 0, 0], standing: 0, boons: 0 },
  "First Mark": { scars: [0, 0, 0, 0, 0, 0, 0, 1, 0], standing: 0, boons: 0 },
  "Melted Philosopher": { scars: [0, 6, 0, 1, 0, 0, 0, 1, 0], standing: 2, boons: 1 },
  "Haunted & Cracked": { scars: [0, 0, 0, 4, 0, 0, 6, 1, 0], standing: 2, boons: 0 },
  "Floaty Legend": { scars: [0, 2, 1, 1, 1, 6, 0, 1, 0], standing: 3, boons: 3 },
  "Stress test: ALL scars, level 3": { scars: [0, 6, 6, 6, 6, 6, 6, 1, 0], standing: 3, boons: 4 },
};

export default function GalleryClient({ chogs }: Props) {
  const [scars, setScars] = useState<number[]>(PRESETS.Fresh.scars);
  const [standing, setStanding] = useState(0);
  const [boons, setBoons] = useState(0);
  const [animate, setAnimate] = useState(true);

  const apply = (name: string) => {
    const p = PRESETS[name];
    setScars([...p.scars]); setStanding(p.standing); setBoons(p.boons);
  };
  const setScar = (id: number, v: number) => setScars((s) => s.map((x, i) => (i === id ? v : x)));

  return (
    <main style={{ padding: 20, maxWidth: 1200, margin: "0 auto", color: "#F4EEFF", background: "#0E0A1F", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>Living Chog gallery</h1>
      <p style={{ opacity: 0.7, marginBottom: 16 }}>Pick a preset or drag the sliders. Check every scar on every Chog.</p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {Object.keys(PRESETS).map((n) => (
          <button key={n} onClick={() => apply(n)} style={{ padding: "6px 12px", borderRadius: 999, background: "#836EF9", color: "#fff", border: 0, cursor: "pointer" }}>{n}</button>
        ))}
        <label style={{ marginLeft: "auto" }}><input type="checkbox" checked={animate} onChange={(e) => setAnimate(e.target.checked)} /> animate</label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10, marginBottom: 20, background: "#1A1333", padding: 14, borderRadius: 12 }}>
        {[1, 2, 3, 4, 5, 6, 7].map((id) => (
          <label key={id} style={{ fontSize: 13 }}>
            {SCAR_NAMES[id]}: <b>{scars[id]}</b>
            <input type="range" min={0} max={8} value={scars[id]} onChange={(e) => setScar(id, Number(e.target.value))} style={{ width: "100%" }} />
          </label>
        ))}
        <label style={{ fontSize: 13 }}>Standing: <b>{["Blank", "Known", "Marked", "Legendary"][standing]}</b>
          <input type="range" min={0} max={3} value={standing} onChange={(e) => setStanding(Number(e.target.value))} style={{ width: "100%" }} />
        </label>
        <label style={{ fontSize: 13 }}>Breakthroughs (glints): <b>{boons}</b>
          <input type="range" min={0} max={4} value={boons} onChange={(e) => setBoons(Number(e.target.value))} style={{ width: "100%" }} />
        </label>
      </div>

      {chogs.length === 0 && <p>No images found in public/chogs (expected chog-&lt;tokenId&gt;.png/webp).</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 18 }}>
        {chogs.map((c) => (
          <div key={c.tokenId}>
            <LivingChog src={c.src} scars={scars} standing={standing} boons={boons} tokenId={c.tokenId} animate={animate} alt={`Chog #${c.tokenId}`} />
            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8 }}>Chog #{c.tokenId}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
