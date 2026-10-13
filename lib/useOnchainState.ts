"use client";
import { useCallback, useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { ADDR, registryAbi } from "./contracts";

export interface ChainChog {
  scars: number[]; standing: number; weirdness: number; successCount: number; runCount: number; originDone: boolean;
}

/** Reads each Chog's life (scars, standing, weirdness) straight from the registry contract. */
export function useOnchainState(ids: number[]) {
  const client = usePublicClient();
  const [data, setData] = useState<Record<number, ChainChog>>({});
  const key = ids.join(",");

  const refresh = useCallback(async () => {
    if (!client || !key) { setData({}); return; }
    const list = key.split(",").map(Number);
    const out: Record<number, ChainChog> = {};
    await Promise.all(list.map(async (id) => {
      try {
        const [res, scars] = await Promise.all([
          client.readContract({ address: ADDR.registry, abi: registryAbi, functionName: "getState", args: [BigInt(id)] }),
          client.readContract({ address: ADDR.registry, abi: registryAbi, functionName: "getScarCounts", args: [BigInt(id)] }),
        ]);
        const s = res[0];
        out[id] = {
          scars: scars.map(Number), standing: Number(s.standing), weirdness: Number(s.weirdness),
          successCount: Number(s.successCount), runCount: Number(s.runCount), originDone: s.originDone,
        };
      } catch { /* leave this Chog blank if the read fails */ }
    }));
    setData(out);
  }, [client, key]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { chain: data, refreshChain: refresh };
}
