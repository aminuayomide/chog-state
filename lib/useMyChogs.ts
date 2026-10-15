"use client";
import { useCallback, useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { ADDR, chogAbi } from "./contracts";

const SCAN = 60; // look at the most recent 60 minted test Chogs
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Finds the test Chogs owned by the connected wallet. Retries on its own, and never reports "none" after a failed read. */
export function useMyChogs() {
  const { address } = useAccount();
  const client = usePublicClient();
  const [ids, setIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const scan = useCallback(async () => {
    if (!address || !client) return null;
    const next = Number(await client.readContract({ address: ADDR.chog, abi: chogAbi, functionName: "nextId" }));
    const from = Math.max(1, next - SCAN);
    const all = Array.from({ length: Math.max(0, next - from) }, (_, i) => from + i);
    const owners = await Promise.all(
      all.map((id) => client.readContract({ address: ADDR.chog, abi: chogAbi, functionName: "ownerOf", args: [BigInt(id)] }))
    );
    return all.filter((_, i) => owners[i].toLowerCase() === address.toLowerCase());
  }, [address, client]);

  const refresh = useCallback(async () => {
    if (!address || !client) return;
    setLoading(true); setError(false);
    try {
      let result: number[] | null = null, err: unknown;
      for (let i = 0; i < 4 && result === null; i++) {
        try { result = await scan(); } catch (e) { err = e; await sleep(600 * 2 ** i); }
      }
      if (result === null) throw err;
      setIds(result); setLoaded(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [address, client, scan]);

  useEffect(() => {
    if (!address) { setIds([]); setLoaded(false); setError(false); return; }
    void refresh();
  }, [address, refresh]);

  return { ids, loading, loaded, error, refresh };
}
