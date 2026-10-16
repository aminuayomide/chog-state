import { seededLife } from "../lib/seeded";
import { STANDING_NAMES } from "../lib/engine";
import { titleFor } from "../lib/reactions";
for (const now of [1_790_000_000, 1_800_000_000, 1_810_000_000]) {
  console.log("now =", now);
  for (let i = 0; i < 5; i++) {
    const s = seededLife(i, now);
    console.log(" ", i, STANDING_NAMES[s.standing].padEnd(9), "w", String(s.weirdness).padEnd(4), "runs", String(s.runCount).padEnd(3), "|", titleFor(s.scars, s.standing), "| last", now - s.lastActive, "s ago");
  }
}
