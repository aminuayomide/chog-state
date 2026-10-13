"use client";
import type { ReactNode } from "react";
import TiltCard from "./TiltCard";
import "./specimen.css";

/** A Chog as a lab specimen card: cream paper, hazard tape, 3D tilt, holographic glare. */
export default function SpecimenCard({
  no, keeper, standingName = "Blank", sticker, small = false, children,
}: { no: number | string; keeper: string; standingName?: string; sticker?: string; small?: boolean; children: ReactNode }) {
  return (
    <TiltCard max={small ? 12 : 16} idle={!small}>
      <article className={`specimen ${small ? "sm" : ""}`}>
        <div className="tape" aria-hidden="true" />
        <div className="spec-head"><span>Specimen</span><span>Nº {String(no).padStart(4, "0")}</span></div>
        <div className="spec-window">{children}</div>
        <div className="spec-foot">
          <div><small>Keeper</small><b>{keeper}</b></div>
          <span className="stand">{standingName}</span>
        </div>
        <div className="barcode" aria-hidden="true" />
        {sticker && <div className="sticker" aria-hidden="true">{sticker}</div>}
      </article>
    </TiltCard>
  );
}
