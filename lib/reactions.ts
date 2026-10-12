import data from "../shared/reactions.json";

interface Rule {
  id: string; text: string; scar?: number; minCount?: number; standing?: number;
  minSuccesses?: number; awayHours?: number;
}
const rules = data.rules as Rule[];

export interface ChogFacts {
  scars: number[];        // scar counts by id (1..8)
  standing: number;       // 0..3
  successCount: number;
  lastActive: number;     // unix seconds, 0 if never
  nowSec: number;
}

/** "The Melted Philosopher": dominant scar + standing. */
export function titleFor(scars: number[], standing: number): string {
  let best = 0, bestCount = 0;
  for (let id = 1; id <= 8; id++) {
    // First Mark (7) only wins if it is the only scar
    const c = scars[id] ?? 0;
    if (c > bestCount && (id !== 7 || scars.slice(1, 7).every((x) => !x) && !scars[8])) { best = id; bestCount = c; }
  }
  const noun = (data.titleNouns as Record<string, string>)[String(standing)] ?? "Newcomer";
  if (!best) return `The Fresh ${noun}`;
  return `The ${(data.titleAdjectives as Record<string, string>)[String(best)]} ${noun}`;
}

/** One reaction line, chosen by rules (no AI): away > dominant scar > wins > standing. */
export function reactionFor(f: ChogFacts): string {
  if (f.lastActive > 0) {
    const hours = (f.nowSec - f.lastActive) / 3600;
    const away = rules.filter((r) => r.awayHours !== undefined && hours >= r.awayHours!)
      .sort((a, b) => b.awayHours! - a.awayHours!)[0];
    if (away) return away.text;
  }
  // dominant scar (ignore First Mark unless it is the only one)
  let dom = 0, domCount = 0;
  for (let id = 1; id <= 8; id++) {
    const c = f.scars[id] ?? 0;
    if (c > domCount && (id !== 7 || f.scars.slice(1, 7).every((x) => !x))) { dom = id; domCount = c; }
  }
  if (dom) {
    const rule = rules.filter((r) => r.scar === dom && domCount >= (r.minCount ?? 1))
      .sort((a, b) => (b.minCount ?? 0) - (a.minCount ?? 0))[0];
    if (rule) return rule.text;
  }
  const wins = rules.find((r) => r.minSuccesses !== undefined && f.successCount >= r.minSuccesses!);
  if (wins) return wins.text;
  return rules.find((r) => r.standing === f.standing)?.text ?? "He's here.";
}
