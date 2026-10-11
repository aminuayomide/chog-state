const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { configureRegistry } = require("../scripts/lib/configure");

const DEAD = "0x000000000000000000000000000000000000dEaD";

async function setup() {
  const [owner, alice, bob] = await ethers.getSigners();
  const nft = await ethers.deployContract("MockChog", [""]);
  const token = await ethers.deployContract("MockChogToken");
  const reg = await ethers.deployContract("ChogStateRegistry", [
    await nft.getAddress(),
    await token.getAddress(),
    DEAD,
  ]);
  await configureRegistry(reg);
  await nft.connect(alice).mint(); // token 1 belongs to alice
  return { owner, alice, bob, nft, token, reg };
}

async function run(reg, signer, tokenId, exp, risk = 1) {
  const tx = await reg.connect(signer).runExperiment(tokenId, exp, risk);
  const rc = await tx.wait();
  const log = rc.logs
    .map((l) => { try { return reg.interface.parseLog(l); } catch { return null; } })
    .find((l) => l && l.name === "ExperimentRun");
  return { tx, success: log.args.success, scarId: Number(log.args.scarId) };
}

describe("ChogStateRegistry", () => {
  it("only the keeper can run experiments", async () => {
    const { reg, bob } = await setup();
    await expect(reg.connect(bob).runExperiment(1, 1, 1)).to.be.revertedWith("Not the keeper");
  });

  it("Origin always fails beautifully, once, leaving the First Mark", async () => {
    const { reg, alice } = await setup();
    const r = await run(reg, alice, 1, 0);
    expect(r.success).to.equal(false);
    const [state] = await reg.getState(1);
    expect(state.weirdness).to.equal(5n);
    expect(state.failCount).to.equal(1n);
    expect((await reg.getScarCounts(1))[7]).to.equal(1n);
    const [entries, total] = await reg.getHistory(1, 0, 10);
    expect(total).to.equal(2n); // fail + "first scar" milestone
    expect(entries[0].kind).to.equal(0n);
    expect(entries[1].kind).to.equal(2n);
    await expect(reg.connect(alice).runExperiment(1, 0, 1)).to.be.revertedWith("Origin already done");
  });

  it("locked experiments need standing", async () => {
    const { reg, alice } = await setup();
    await expect(reg.connect(alice).runExperiment(1, 5, 1)).to.be.revertedWith("Locked");
    await expect(reg.connect(alice).runExperiment(1, 6, 1)).to.be.revertedWith("Locked");
    await expect(reg.connect(alice).runExperiment(1, 99, 1)).to.be.revertedWith("No such experiment");
  });

  it("weirdness only goes up and standing follows the thresholds", async () => {
    const { reg, alice } = await setup();
    let last = 0n;
    for (let i = 0; i < 40; i++) {
      if (i % 8 === 0 && i > 0) await time.increase(86400);
      await run(reg, alice, 1, 1);
      const [s] = await reg.getState(1);
      expect(s.weirdness).to.be.gte(last);
      last = s.weirdness;
      const expected = s.weirdness >= 180n ? 3 : s.weirdness >= 70n ? 2 : s.weirdness >= 20n ? 1 : 0;
      expect(Number(s.standing)).to.equal(expected);
    }
    expect(last).to.be.gt(100n);
    // reached Known, so experiment 5 should now be open
    await time.increase(86400);
    await run(reg, alice, 1, 5);
  });

  it("history travels with the NFT and 'Changed hands' is recorded", async () => {
    const { reg, nft, alice, bob } = await setup();
    await run(reg, alice, 1, 0);
    await nft.connect(alice).transferFrom(alice.address, bob.address, 1);
    await expect(reg.connect(alice).runExperiment(1, 1, 1)).to.be.revertedWith("Not the keeper");
    await expect(reg.connect(bob).syncOwner(1)).to.emit(reg, "ChangedHands").withArgs(1, alice.address, bob.address);
    await run(reg, bob, 1, 1);
    const [state] = await reg.getState(1);
    expect(state.runCount).to.equal(2n); // the old life continues
    const [entries] = await reg.getHistory(1, 0, 20);
    expect(entries.some((e) => e.kind === 3n)).to.equal(true);
  });

  it("daily free runs, then the mock $CHOG fee is burned", async () => {
    const { reg, token, alice } = await setup();
    for (let i = 0; i < 8; i++) await run(reg, alice, 1, 1);
    expect(await reg.dailyRunsLeft(1)).to.equal(0n);
    await expect(reg.connect(alice).runExperiment(1, 1, 1)).to.be.reverted;
    await token.connect(alice).claim();
    await token.connect(alice).approve(await reg.getAddress(), ethers.parseEther("10"));
    await run(reg, alice, 1, 1);
    expect(await token.balanceOf(DEAD)).to.equal(ethers.parseEther("10"));
    await time.increase(86400);
    expect(await reg.dailyRunsLeft(1)).to.equal(8n);
  });

  it("combo triggers once when two experiments run back to back", async () => {
    const { reg, alice } = await setup();
    await run(reg, alice, 1, 2);
    const before = (await reg.getState(1))[0].weirdness;
    await expect(reg.connect(alice).runExperiment(1, 3, 1)).to.emit(reg, "ComboFound").withArgs(1, 1);
    expect(await reg.combosFound(1)).to.equal(1n);
    const after = (await reg.getState(1))[0].weirdness;
    expect(after - before).to.be.gte(10n);
    // a second time gives no second combo
    await run(reg, alice, 1, 2);
    await expect(reg.connect(alice).runExperiment(1, 3, 1)).to.not.emit(reg, "ComboFound");
  });

  it("Reckless failures cut deeper scars", async () => {
    const { reg, alice } = await setup();
    const r = await run(reg, alice, 1, 1, 2);
    const scars = await reg.getScarCounts(1);
    expect(scars[1]).to.equal(r.success ? 0n : 2n);
  });

  it("history is paginated", async () => {
    const { reg, alice } = await setup();
    await run(reg, alice, 1, 0);
    await run(reg, alice, 1, 1);
    const [one, total] = await reg.getHistory(1, 0, 1);
    expect(one.length).to.equal(1);
    expect(total).to.be.gte(3n);
    const [none] = await reg.getHistory(1, 999, 10);
    expect(none.length).to.equal(0);
  });

  it("config can be locked for good, and only the owner can set it", async () => {
    const { reg, owner, alice } = await setup();
    await expect(reg.connect(alice).setDailyFreeRuns(50)).to.be.reverted;
    await reg.connect(owner).lockConfig();
    await expect(reg.connect(owner).setDailyFreeRuns(50)).to.be.revertedWith("Config locked");
  });

  it("odds sanity: Overclock Brain fails roughly 80% of the time", async () => {
    const { reg, nft, alice } = await setup();
    for (let i = 0; i < 40; i++) await nft.connect(alice).mint(); // tokens 2..41
    let fails = 0, total = 0;
    for (let id = 2; id <= 41; id++) {
      for (let k = 0; k < 5; k++) {
        const r = await run(reg, alice, id, 1);
        total++;
        if (!r.success) fails++;
      }
    }
    const rate = fails / total;
    expect(rate).to.be.within(0.6, 0.95);
  });

  it("today's modifier is one of the configured ones", async () => {
    const { reg } = await setup();
    const [id] = await reg.todaysModifier();
    expect(Number(id)).to.be.within(1, 6);
  });
});
