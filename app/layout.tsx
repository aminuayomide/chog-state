import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE = "https://chog-state.vercel.app";
const DESC =
  "Chog was born from a failed experiment. Run yours through the lab: most experiments fail, and every failure becomes a permanent scar on Monad. Sell it, and the scars go with it.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Chog State: every Chog gets a life", template: "%s · Chog State" },
  description: DESC,
  applicationName: "Chog State",
  openGraph: { title: "Chog State", description: DESC, url: SITE, siteName: "Chog State", type: "website" },
  twitter: { card: "summary_large_image", title: "Chog State", description: DESC },
};

export const viewport: Viewport = { themeColor: "#0B0816" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
