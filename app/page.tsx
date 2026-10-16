import Link from "next/link";
import { Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import "./live/live.css";
import LivingChog from "../components/LivingChog";
import SpecimenCard from "../components/SpecimenCard";
import { listDemoChogs } from "../lib/chogs";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["500", "700", "800"], display: "swap" });

const HERO_SCARS = [0, 0, 0, 3, 0, 0, 0, 1, 0]; // Time Cracks level 2 + the First Mark

export default function Home() {
  const chogs = listDemoChogs();
  const hero = chogs[1] ?? chogs[0];
  return (
    <div className={`${display.variable} ${mono.variable} live-root`}>
      <main className="live-main">
        <header className="live-top">
          <div className="brand"><span className="brand-mark" aria-hidden="true" />CHOG STATE</div>
          <div className="top-right">
            <Link href="/compare" className="link small">Compare</Link>
            <span className="net-pill"><i aria-hidden="true" />Monad testnet</span>
          </div>
        </header>

        <section className="hero" aria-labelledby="hero-title">
          <div>
            <p className="eyebrow">Chogathon 2026 · specimen file 001</p>
            <h1 id="hero-title" className="h1">Every Chog gets a life. Yours gets <mark>scarred.</mark></h1>
            <p className="lead">
              Chog was born from a failed experiment. Run yours through the lab: most experiments fail, and every failure becomes a permanent scar on Monad. Sell it, and the scars go with it.
            </p>
            <div className="cta-row">
              <Link href="/lab" className="btn btn-primary">Try the demo, no wallet</Link>
              <Link href="/live" className="link">Connect a wallet to keep your own Chog</Link>
            </div>
            <p className="fine">Free · testnet only · no real money</p>
          </div>
          {hero && (
            <SpecimenCard no={1} keeper="unclaimed" standingName="Known" sticker="Failed. Loved anyway.">
              <LivingChog src={hero.src} scars={HERO_SCARS} standing={1} tokenId={hero.tokenId} alt="A scarred Chog" />
            </SpecimenCard>
          )}
        </section>

        <section className="steps" aria-label="How it works">
          <div className="step"><b>01</b><h3>Run risky experiments</h3><p>Pick an experiment and a risk level, then hold the button. Most of them fail. That&apos;s the point.</p></div>
          <div className="step"><b>02</b><h3>Failures become scars</h3><p>Every failure is written to that Chog and you can see it: melted, cracked, haunted, third-eyed.</p></div>
          <div className="step"><b>03</b><h3>The story travels with the NFT</h3><p>Sell the Chog and its whole life goes with it. Any app can read that story from the chain.</p></div>
        </section>

        <p className="fine" style={{ marginTop: 48 }}>
          Built for Chogathon 2026 by Ayomide · <Link href="/compare" className="link">Compare two Chogs</Link>
        </p>
      </main>
    </div>
  );
}
