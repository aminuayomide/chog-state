import { noteText } from "../lib/notes";
import notes from "../shared/notes.json";
import reactionsData from "../shared/reactions.json";
import { titleFor, reactionFor } from "../lib/reactions";
import { newState, runExperiment, randomSeed, defaultConfig, type Risk } from "../lib/engine";

const cfg = defaultConfig();
const entries = notes.entries as Record<string, string>;
const missing: number[] = [];
const need = (id: number) => { if (!entries[String(id)]) missing.push(id); };

// every noteId the contract can produce
for (let e = 0; e <= 6; e++) for (let v = 0; v < 3; v++) need(e * 100 + v);          // failures
for (let e = 1; e <= 6; e++) for (let v = 0; v < 2; v++) need(e * 100 + 50 + v);     // successes
for (let m = 0; m <= 9; m++) need(1000 + m);                                         // milestones
for (const c of cfg.combos) need(2000 + c.id);                                       // combos
need(3000);                                                                           // changed hands

// and every noteId the engine really writes over 3000 random runs
let st = newState(), now = 1_800_000_000, seen = new Set<number>();
for (let i = 0; i < 3000; i++) {
  const unlocked = Object.values(cfg.experiments).filter((x) => st.standing >= x.minStanding && !(x.oncePerToken && st.originDone));
  const ex = unlocked[Math.floor(Math.random() * unlocked.length)];
  const out = runExperiment(st, ex.id, Math.floor(Math.random() * 3) as Risk, randomSeed(), now, { ...cfg, dailyFreeRuns: 255 });
  out.result.entries.forEach((e) => { seen.add(e.noteId); need(e.noteId); });
  st = out.state; now += 3000;
}

const lines = Object.keys(entries).length + notes.originCinematic.length + notes.ui.afterScar.length + notes.ui.afterSuccess.length;
console.log("note lines:", lines, "| distinct noteIds seen in 3000 runs:", seen.size, "| missing:", missing.length ? missing : "none");
console.log("titles:", titleFor([0, 6, 0, 0, 0, 0, 0, 1, 0], 2), "|", titleFor([0, 0, 0, 0, 0, 0, 0, 1, 0], 0), "|", titleFor([0, 0, 0, 0, 0, 0, 0, 0, 0], 0));
const f = { scars: [0, 3, 0, 1, 0, 0, 0, 1, 0], standing: 2, successCount: 1, lastActive: now, nowSec: now };
console.log("reaction:", reactionFor(f));
console.log("reaction (away 2d):", reactionFor({ ...f, nowSec: now + 2 * 86400 }));
console.log("reaction (fresh):", reactionFor({ scars: new Array(9).fill(0), standing: 0, successCount: 0, lastActive: 0, nowSec: now }));
console.log("reaction rules:", reactionsData.rules.length);
