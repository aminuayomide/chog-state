import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";

// Override with NEXT_PUBLIC_RPC_URL if the public RPC is slow or blocked.
const rpc = process.env.NEXT_PUBLIC_RPC_URL || "https://testnet-rpc.monad.xyz";

export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [rpc] } },
  blockExplorers: { default: { name: "MonadScan", url: "https://testnet.monadscan.com" } },
  testnet: true,
});

export const config = createConfig({
  chains: [monadTestnet],
  connectors: [injected()],
  // retry a throttled public RPC a few times, slowly, instead of failing fast
  transports: { [monadTestnet.id]: http(rpc, { retryCount: 5, retryDelay: 400 }) },
  ssr: true,
});
