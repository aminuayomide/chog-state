const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log("Balance (MON):", ethers.formatEther(bal));

  const chog = await ethers.deployContract("MockChog", [""]);
  await chog.waitForDeployment();
  const token = await ethers.deployContract("MockChogToken");
  await token.waitForDeployment();
  const probe = await ethers.deployContract("RandomProbe");
  await probe.waitForDeployment();

  await (await chog.mint()).wait();
  await (await probe.record()).wait();

  const out = {
    chainId: 10143,
    mockChog: await chog.getAddress(),
    mockChogToken: await token.getAddress(),
    randomProbe: await probe.getAddress(),
  };
  console.log(out);
  console.log("prevrandao:", (await probe.lastPrevrandao()).toString());
  console.log("timestamp: ", (await probe.lastTimestamp()).toString());
  console.log("blockhash: ", await probe.lastBlockHash());
  fs.writeFileSync("deployed.json", JSON.stringify(out, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });