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
