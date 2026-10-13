"use client";
import { useCallback, useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { ADDR, chogAbi } from "./contracts";

const SCAN = 60; // look at the most recent 60 minted test Chogs

/** Finds the test Chogs owned by the connected wallet (the mock NFT is not enumerable). */
export function useMyChogs() {
  const { address } = useAccount();
  const client = usePublicClient();
  const [ids, setIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!address || !client) { setIds([]); return; }
    setLoading(true);
    try {
      const next = Number(await client.readContract({ address: ADDR.chog, abi: chogAbi, functionName: "nextId" }));
      const from = Math.max(1, next - SCAN);
      const all = Array.from({ length: Math.max(0, next - from) }, (_, i) => from + i);
      const owners = await Promise.all(
        all.map((id) =>
          client.readContract({ address: ADDR.chog, abi: chogAbi, functionName: "ownerOf", args: [BigInt(id)] }).catch(() => null)
        )
      );
      setIds(all.filter((_, i) => typeof owners[i] === "string" && (owners[i] as string).toLowerCase() === address.toLowerCase()));
    } catch {
      setIds([]);
    } finally {
      setLoading(false);
    }
  }, [address, client]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { ids, loading, refresh };
}
