const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { configureRegistry } = require("./lib/configure");

const DEAD = "0x000000000000000000000000000000000000dEaD";

async function main() {
  const dep = JSON.parse(fs.readFileSync("deployed.json", "utf8"));
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const reg = await ethers.deployContract("ChogStateRegistry", [dep.mockChog, dep.mockChogToken, DEAD]);
  await reg.waitForDeployment();
  const regAddr = await reg.getAddress();
  console.log("Registry:", regAddr);

  console.log("Configuring from shared/*.json ...");
  await configureRegistry(reg);
  if (process.env.LOCK === "1") {
    await (await reg.lockConfig()).wait();
    console.log("Config locked for good.");
  }

  dep.registry = regAddr;
  dep.deployBlock = await ethers.provider.getBlockNumber();
  fs.writeFileSync("deployed.json", JSON.stringify(dep, null, 2));
  fs.writeFileSync(path.join(__dirname, "..", "..", "shared", "deployed.json"), JSON.stringify(dep, null, 2));

  // Smoke test with a fresh test Chog (leaves token 1 untouched).
  const chog = await ethers.getContractAt("MockChog", dep.mockChog);
  await (await chog.mint()).wait();
  const id = (await chog.nextId()) - 1n;
  console.log("Smoke test on new test Chog #" + id);
  await (await reg.runExperiment(id, 0, 1)).wait();
  const [state] = await reg.getState(id);
  console.log("After Origin: weirdness", state.weirdness.toString(), "| failCount", state.failCount.toString());
  const [entries, total] = await reg.getHistory(id, 0, 10);
  console.log("History entries:", total.toString());
  console.log("Scar counts:", (await reg.getScarCounts(id)).map(String).join(","));
  const mod = await reg.todaysModifier();
  console.log("Today's modifier id:", mod[0].toString());
  console.log("Saved to deployed.json");
}

main().catch((e) => { console.error(e); process.exit(1); });
