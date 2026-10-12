// Server-only: finds demo Chog images in public/chogs named chog-<tokenId>.<ext>
import fs from "node:fs";
import path from "node:path";

export interface DemoChog { tokenId: number; src: string }

export function listDemoChogs(): DemoChog[] {
  const dir = path.join(process.cwd(), "public", "chogs");
  if (!fs.existsSync(dir)) return [];
  const out: DemoChog[] = [];
  for (const f of fs.readdirSync(dir)) {
    const m = /^chog-(\d+)\.(png|jpe?g|webp)$/i.exec(f);
    if (m) out.push({ tokenId: Number(m[1]), src: `/chogs/${f}` });
  }
  return out.sort((a, b) => a.tokenId - b.tokenId);
}
