import { newState, runExperiment, randomSeed, defaultConfig, STANDING_NAMES, type Risk } from "../lib/engine";

const cfg = defaultConfig();
let st = newState();
let now = Math.floor(Date.now() / 1000);

const plan: [number, Risk][] = [[0, 1], [2, 1], [3, 2], [1, 0], [4, 1], [1, 1]];
for (const [exp, risk] of plan) {
  const { state, result } = runExperiment(st, exp, risk, randomSeed(), now, cfg);
  console.log(
    `${cfg.experiments[exp].name.padEnd(22)} risk ${risk} -> ${result.success ? "BREAKTHROUGH" : "FAILED      "}`,
    `| +${result.gain} weirdness (now ${result.weirdnessAfter})`,
    `| scar ${result.scarId}`,
    result.combos.length ? `| COMBO ${result.combos}` : "",
    result.milestones.length ? `| milestones ${result.milestones}` : ""
  );
  st = state;
  now += 600;
}
console.log("Standing:", STANDING_NAMES[st.standing], "| weirdness", st.weirdness, "| scars", st.scars.join(","), "| history entries", st.history.length);
