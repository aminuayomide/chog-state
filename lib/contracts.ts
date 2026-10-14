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

export const runAbi = parseAbi([
  "function runExperiment(uint256 tokenId, uint8 experimentId, uint8 risk)",
  "event ExperimentRun(uint256 indexed tokenId, uint8 experimentId, uint8 risk, bool success, uint8 scarId, uint16 noteId, bytes32 seed, uint32 weirdnessAfter)",
]);

export const histAbi = parseAbi([
  "function historyLength(uint256 tokenId) view returns (uint256)",
  "function getHistory(uint256 tokenId, uint256 offset, uint256 limit) view returns ((uint8 kind, uint8 experimentId, uint8 scarId, uint8 risk, uint16 noteId, uint32 weirdnessAfter, uint64 timestamp)[] entries, uint256 total)",
]);
