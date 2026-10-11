const path = require("path");
const { ethers } = require("hardhat");

const shared = path.join(__dirname, "..", "..", "..", "shared");
const exp = require(path.join(shared, "experiments.json"));
const combos = require(path.join(shared, "combos.json"));
const modifiers = require(path.join(shared, "modifiers.json"));

// Single source of truth: shared/*.json -> contract config.
async function configureRegistry(reg) {
  const send = async (p) => (await p).wait();
  await send(reg.setStandingThresholds(...exp.standingThresholds));
  await send(reg.setDailyFreeRuns(exp.dailyFreeRuns));
  await send(reg.setExtraRunFee(ethers.parseEther(exp.extraRunFee)));
  for (const e of exp.experiments) {
    await send(
      reg.setExperiment(e.id, {
        exists: true,
        failBps: e.failBps,
        failScar: e.failScar,
        minStanding: e.minStanding,
        failMin: e.failMin,
        failMax: e.failMax,
        winMin: e.winMin,
        winMax: e.winMax,
        oncePerToken: e.oncePerToken,
      })
    );
  }
  for (const c of combos) await send(reg.setCombo(c.id, c.first, c.second, c.bonus));
  await send(
    reg.setModifiers(
      modifiers.map((m) => ({
        experimentId: m.experimentId,
        failDeltaBps: m.failDeltaBps,
        weirdnessMulBps: m.weirdnessMulBps,
      }))
    )
  );
}

module.exports = { configureRegistry, exp, combos, modifiers };
