import { STANDING_NAMES, type EngineConfig, type State } from "./engine";
import { SCAR_NAMES, levelOf } from "./scars";

/** Atlas slots: scars 1-6 at 3 levels each + the First Mark. */
export const ATLAS_SLOTS = 19;

export function atlasProgress(s: State): number {
  let n = 0;
  for (let id = 1; id <= 6; id++) n += levelOf(s.scars[id] ?? 0);
  if ((s.scars[7] ?? 0) > 0) n += 1;
  return n;
}

interface Goal { remaining: number; text: string; weight: number }

/** The one line under the Chog: what is closest to happening. Pure rules, no AI. */
export function nextGoal(s: State, cfg: EngineConfig): string {
  if (!s.originDone) return "Begin with the Origin experiment.";
  const goals: Goal[] = [];

  if (s.standing < 3) {
    const need = cfg.standingThresholds[s.standing] - s.weirdness;
    const next = STANDING_NAMES[s.standing + 1];
    const unlock = Object.values(cfg.experiments).find((e) => e.minStanding === s.standing + 1);
    goals.push({
      remaining: need, weight: 1,
      text: `${need} more weirdness to ${next}${unlock ? ` and ${unlock.name} unlocks` : ""}`,
    });
  }
  for (let id = 1; id <= 6; id++) {
    const c = s.scars[id] ?? 0;
    const lvl = levelOf(c);
    if (c > 0 && lvl < 3) {
      const need = (lvl === 1 ? 3 : 6) - c;
      goals.push({ remaining: need, weight: 1.2, text: `${need} more ${SCAR_NAMES[id]} for level ${lvl + 1}` });
    }
  }
  if (s.failCount < 10) {
    const need = 10 - s.failCount;
    goals.push({ remaining: need, weight: 1.5, text: `${need} more failures to survive ten` });
  }
  if (s.runCount < 25) {
    const need = 25 - s.runCount;
    goals.push({ remaining: need, weight: 2, text: `${need} more runs to earn a lanyard` });
  }
  for (let id = 1; id <= 6; id++) {
    if ((s.scars[id] ?? 0) === 0) {
      const ex = Object.values(cfg.experiments).find((e) => e.failScar === id && s.standing >= e.minStanding);
      if (ex) goals.push({ remaining: 4, weight: 3, text: `Try ${ex.name} to discover ${SCAR_NAMES[id]}` });
    }
  }
  if (!goals.length) return `Atlas: ${atlasProgress(s)} of ${ATLAS_SLOTS} scars collected`;
  goals.sort((a, b) => a.remaining * a.weight - b.remaining * b.weight);
  return goals[0].text;
}
