import { parseAbi } from "viem";
import deployed from "../shared/deployed.json";

// Written by chain/scripts/deploy-registry.js
export const ADDR = {
  chog: deployed.mockChog as `0x${string}`,
  token: deployed.mockChogToken as `0x${string}`,
  registry: deployed.registry as `0x${string}`,
};

export const chogAbi = parseAbi([
  "function mint() returns (uint256)",
  "function nextId() view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
]);

export const registryAbi = parseAbi([
  "function getState(uint256 tokenId) view returns ((uint32 weirdness, uint8 standing, uint8 failStreak, uint16 runCount, uint16 successCount, uint16 failCount, bool originDone, uint8 lastExperiment, uint8 combosFound, uint8 runsToday, uint32 runsDay, uint64 lastActive, uint16 milestones) state, address lastKnownOwner)",
  "function getScarCounts(uint256 tokenId) view returns (uint16[9])",
]);
