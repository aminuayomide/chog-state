import { Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import "../live/live.css";
import "../lab/lab.css";
import "./compare.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["500", "700", "800"], display: "swap" });

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${display.variable} ${mono.variable} live-root`}>{children}</div>;
}
