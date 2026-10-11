// Proves the TypeScript demo engine behaves exactly like the contract.
// Build the engine first (see README line in the zip), then:
//   npx hardhat test test-optional/engine-parity.test.js
const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const E = require("../build/engine.cjs");
const { configureRegistry } = require("../scripts/lib/configure");

function rng(seed) { // mulberry32
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("engine parity with ChogStateRegistry", function () {
  this.timeout(600000);

  it("matches the contract step by step over hundreds of random runs", async () => {
    const [owner, alice] = await ethers.getSigners();
    const nft = await ethers.deployContract("MockChog", [""]);
    const token = await ethers.deployContract("MockChogToken");
    const reg = await ethers.deployContract("ChogStateRegistry", [
      await nft.getAddress(), await token.getAddress(), "0x000000000000000000000000000000000000dEaD",
    ]);
    await configureRegistry(reg);
    await reg.setDailyFreeRuns(255);
    const cfg = E.defaultConfig();
    cfg.dailyFreeRuns = 255;
    const regAddr = await reg.getAddress();
    const rand = rng(12345);

    let ts = (await time.latest()) + 1000;
    let compared = 0, successes = 0, combosSeen = 0, standingsSeen = new Set(), milestonesSeen = new Set();

    for (let id = 1; id <= 6; id++) {
      await nft.connect(alice).mint();
      let st = E.newState();
      for (let step = 0; step < 70; step++) {
        const unlocked = [0, 1, 2, 3, 4, 5, 6].filter((x) => E.isUnlocked(cfg, st, x));
        // bias toward combo pairs now and then
        let exp = unlocked[Math.floor(rand() * unlocked.length)];
        if (rand() < 0.2 && st.lastExperiment === 2 && unlocked.includes(3)) exp = 3;
        if (rand() < 0.2 && st.lastExperiment === 4 && unlocked.includes(1)) exp = 1;
        const risk = Math.floor(rand() * 3);
        ts += rand() < 0.1 ? Math.floor(86400 * (1 + rand())) : 600 + Math.floor(rand() * 20000);

        const prevrandao = BigInt("0x" + Array.from({ length: 32 }, () => Math.floor(rand() * 256).toString(16).padStart(2, "0")).join(""));
        await network.provider.send("hardhat_setPrevRandao", [ethers.toBeHex(prevrandao, 32)]);
        await time.setNextBlockTimestamp(ts);

        const seed = E.seedFor(prevrandao, ts, alice.address, BigInt(id), st.runCount, regAddr);
        const out = E.runExperiment(st, exp, risk, seed, ts, cfg);

        const rc = await (await reg.connect(alice).runExperiment(id, exp, risk)).wait();
        const ev = rc.logs.map((l) => { try { return reg.interface.parseLog(l); } catch { return null; } })
          .find((l) => l && l.name === "ExperimentRun");
        expect(ev.args.success, "success").to.equal(out.result.success);
        expect(Number(ev.args.scarId), "scar").to.equal(out.result.scarId);
        expect(Number(ev.args.noteId), "note").to.equal(out.result.noteId);
        expect(Number(ev.args.weirdnessAfter), "weirdnessAfter").to.equal(out.result.weirdnessAfter);
        expect(ev.args.seed, "seed").to.equal(ethers.toBeHex(out.result.seed, 32));

        const s = (await reg.getState(id))[0];
        const e = out.state;
        const fields = ["weirdness", "standing", "failStreak", "runCount", "successCount", "failCount",
          "lastExperiment", "combosFound", "runsToday", "runsDay", "lastActive", "milestones"];
        for (const f of fields) expect(Number(s[f]), `${f} (token ${id} step ${step})`).to.equal(e[f]);
        expect(s.originDone).to.equal(e.originDone);
        const scars = (await reg.getScarCounts(id)).map(Number);
        expect(scars).to.deep.equal(e.scars);
        const [hist, total] = await reg.getHistory(id, 0, 1000);
        expect(Number(total), "history length").to.equal(e.history.length);
        for (let i = st.history.length; i < e.history.length; i++) {
          const a = hist[i], b = e.history[i];
          expect([Number(a.kind), Number(a.experimentId), Number(a.scarId), Number(a.risk), Number(a.noteId), Number(a.weirdnessAfter), Number(a.timestamp)],
            `history[${i}] token ${id} step ${step}`)
            .to.deep.equal([b.kind, b.experimentId, b.scarId, b.risk, b.noteId, b.weirdnessAfter, b.timestamp]);
        }
        if (out.result.success) successes++;
        combosSeen += out.result.combos.length;
        standingsSeen.add(e.standing);
        out.result.milestones.forEach((m) => milestonesSeen.add(m));
        st = e;
        compared++;
      }
    }
    console.log(`      compared ${compared} runs | successes ${successes} | combos ${combosSeen} | standings seen ${[...standingsSeen].sort()} | milestones seen ${[...milestonesSeen].sort((a,b)=>a-b)}`);
    expect(combosSeen).to.be.gt(0);
    expect(standingsSeen.size).to.be.gte(3);
  });
});
