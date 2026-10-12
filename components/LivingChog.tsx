"use client";
import { useId } from "react";
import "./living-chog.css";
import { levelsOf } from "../lib/scars";
import { thirdEyeAnchor } from "../lib/anchors";

export interface LivingChogProps {
  src: string;
  /** Scar counts by scar id (index 1..8), like the contract's getScarCounts. */
  scars: number[];
  /** 0 Blank, 1 Known, 2 Marked, 3 Legendary */
  standing?: number;
  /** Number of breakthroughs (successCount): shown as gold glints. */
  boons?: number;
  tokenId?: number;
  alt?: string;
  className?: string;
  animate?: boolean;
}

const MEME_WORDS = ["wen?", "gm", "lfg", "ngmi"];
const MEME_SPOTS: [number, number][] = [[7, 12], [60, 9], [68, 46], [10, 62]];
const SPARKS: [number, number][] = [[18, 24], [80, 18], [74, 72], [24, 78]];

export default function LivingChog({
  src, scars, standing = 0, boons = 0, tokenId, alt = "Chog", className = "", animate = true,
}: LivingChogProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const L = levelsOf(scars);
  const melt = L[1], eye = L[2], cracks = L[3], stat = L[4], weightless = L[5], ghost = L[6], mark = L[7];

  // colour treatment for the main image
  let sepia = 0, saturate = 1, hue = 0, contrast = 1, brightness = 1;
  if (melt) { sepia += [0, 0.15, 0.3, 0.45][melt]; saturate += 0.12 * melt; hue -= 6 * melt; }
  if (cracks) { sepia += [0, 0.2, 0.4, 0.6][cracks]; saturate -= [0, 0.05, 0.15, 0.3][cracks]; }
  if (stat) contrast += 0.04 * stat;
  if (ghost) { brightness += 0.02 * ghost; saturate -= 0.04 * ghost; }
  sepia = Math.min(sepia, 0.75);
  const filters: string[] = [];
  if (melt) filters.push(`url(#melt${melt}-${uid})`);
  if (melt || cracks || stat || ghost) {
    filters.push(`sepia(${sepia}) saturate(${saturate}) hue-rotate(${hue}deg) contrast(${contrast}) brightness(${brightness})`);
  }
  const filter = filters.length ? filters.join(" ") : undefined;

  const eyeAnchor = thirdEyeAnchor(tokenId);

  return (
    <div className={`chog-frame standing-${standing} ${className}`} data-animate={animate ? "true" : "false"}>
      {/* filter definitions (unique ids per instance) */}
      <svg className="defs" aria-hidden="true" focusable="false">
        <defs>
          {[1, 2, 3].map((lv) => (
            <filter key={lv} id={`melt${lv}-${uid}`} x="-10%" y="-10%" width="120%" height="125%">
              <feTurbulence type="fractalNoise" baseFrequency="0.01 0.04" numOctaves="2" seed="3" result="n">
                <animate attributeName="baseFrequency" dur="6s" values="0.01 0.04;0.014 0.06;0.01 0.04" repeatCount="indefinite" />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="n" scale={[0, 6, 11, 18][lv]} xChannelSelector="R" yChannelSelector="G" />
            </filter>
          ))}
          <filter id={`noise${uid}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <linearGradient id={`gold${uid}`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#FFB020" /><stop offset="0.5" stopColor="#FFD76A" /><stop offset="1" stopColor="#FFF3C4" />
          </linearGradient>
        </defs>
      </svg>

      {weightless > 0 && <div className="chog-shadow" />}

      <div className={`chog-stage ${weightless ? `float-${weightless}` : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="chog-img" src={src} alt={alt} draggable={false} style={{ filter, transform: melt ? `scale(${[1, 1.04, 1.07, 1.1][melt]})` : undefined }} />

        {ghost > 0 && Array.from({ length: ghost }).map((_, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} className={`chog-ghost g${i + 1}`} src={src} alt="" aria-hidden="true" draggable={false} />
        ))}
        {ghost > 0 && <div className="tint-cold" style={{ opacity: 0.12 * ghost }} />}

        {cracks > 0 && (
          <svg className="overlay-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {[
              { lv: 1, d: ["50,0 46,14 52,26 47,40 55,52", "100,38 84,44 78,55 66,58"] },
              { lv: 2, d: ["55,52 60,66 54,78 58,92 56,100", "0,62 14,60 22,70 34,69", "78,55 84,70 96,76"] },
              { lv: 3, d: ["46,14 34,18 28,30 14,34 0,32", "52,26 66,22 74,10 88,6 100,8", "47,40 36,48 30,60 18,66", "34,69 36,82 28,92 30,100"] },
            ].filter((g) => g.lv <= cracks).flatMap((g) => g.d).map((pts, i) => (
              <g key={i}>
                <polyline points={pts} fill="none" stroke="#0E0A1F" strokeOpacity="0.55" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
                <polyline points={pts} fill="none" stroke="#F4EEFF" strokeWidth="0.7" strokeLinejoin="round" strokeLinecap="round" />
              </g>
            ))}
          </svg>
        )}

        {stat > 0 && (
          <>
            <div className="scanlines" style={{ opacity: 0.35 + 0.2 * stat }} />
            <svg className="noise" aria-hidden="true" style={{ opacity: 0.1 + 0.08 * stat }}>
              <rect width="100%" height="100%" filter={`url(#noise${uid})`} />
            </svg>
            {MEME_WORDS.slice(0, stat + 1).map((w, i) => (
              <span key={w} className="meme-bubble" style={{ left: `${MEME_SPOTS[i][0]}%`, top: `${MEME_SPOTS[i][1]}%`, animationDelay: `${i * 0.9}s` }}>{w}</span>
            ))}
          </>
        )}

        {eye > 0 && (
          <svg
            className="third-eye"
            viewBox="0 0 40 24"
            aria-hidden="true"
            style={{ left: `${eyeAnchor.x}%`, top: `${eyeAnchor.y}%`, width: `${eyeAnchor.size * (0.85 + 0.15 * eye)}%` }}
          >
            <ellipse cx="20" cy="12" rx="18" ry="10" fill="#fff" stroke="#1A1333" strokeWidth="2" />
            {eye >= 2 && (<><path d="M4 12 L11 12 M6 7 L12 10 M6 17 L12 14" stroke="#FF3D81" strokeWidth="0.8" fill="none" /><path d="M36 12 L29 12 M34 7 L28 10 M34 17 L28 14" stroke="#FF3D81" strokeWidth="0.8" fill="none" /></>)}
            <circle cx="20" cy="12" r="6.6" fill="#FF3D81" />
            <circle cx="20" cy="12" r="3.2" fill="#0E0A1F" />
            <circle cx="22" cy="10" r="1.3" fill="#fff" />
          </svg>
        )}

        {mark > 0 && (
          <>
            <svg className="overlay-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" style={{ filter: "drop-shadow(0 0 3px rgba(255,215,106,.9))" }}>
              <path d="M5 95 L40 56 L52 63 L95 6" fill="none" stroke={`url(#gold${uid})`} strokeWidth="0.9" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
            <div className="shimmer" />
          </>
        )}

        {boons > 0 && SPARKS.slice(0, Math.min(boons, 4)).map(([x, y], i) => (
          <span key={i} className="spark" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.6}s` }} />
        ))}
      </div>
    </div>
  );
}
