"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import LivingChog from "../../components/LivingChog";
import SpecimenCard from "../../components/SpecimenCard";
import { monadTestnet } from "../../lib/wagmi";
import { ADDR, chogAbi } from "../../lib/contracts";
import { useMyChogs } from "../../lib/useMyChogs";
import { useOnchainState } from "../../lib/useOnchainState";
import LiveLab from "../../components/LiveLab";
import { STANDING_NAMES } from "../../lib/engine";
import { UI } from "../../lib/notes";
import type { DemoChog } from "../../lib/chogs";

const FRESH = new Array(9).fill(0);
const HERO_SCARS = [0, 0, 0, 3, 0, 0, 0, 1, 0, 0].slice(0, 9); // Time Cracks lvl 2 + First Mark
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export default function LiveClient({ chogs }: { chogs: DemoChog[] }) {
  const { address, chainId, isConnected } = useAccount();
  const { connect, connectors, isPending: connecting, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { ids, loading, refresh } = useMyChogs();
  const { chain, refreshChain } = useOnchainState(ids);
  const { writeContract, data: hash, isPending: signing, error: mintError, reset } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const [hasWallet, setHasWallet] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => { setHasWallet(typeof (window as unknown as { ethereum?: unknown }).ethereum !== "undefined"); }, []);
  useEffect(() => { if (receipt.isSuccess) void refresh(); }, [receipt.isSuccess, refresh]);

  const wrongNetwork = isConnected && chainId !== monadTestnet.id;
  const minting = signing || (!!hash && receipt.isLoading);
  const rejected = mintError?.message.toLowerCase().includes("reject");

  // Mock tokens have no art of their own: reuse the demo art, recolored on each repeat so no two look alike.
  const art = (id: number) => {
    const n = Math.max(1, chogs.length);
    return { src: chogs[(id - 1) % n]?.src ?? "", tint: Math.floor((id - 1) / n) * 55 };
  };

  if (openId !== null && address) {
    return <LiveLab ids={ids} initial={openId} chogs={chogs} keeper={short(address)} onBack={() => { setOpenId(null); void refresh(); void refreshChain(); }} />;
  }

  return (
    <main className="live-main">
      <header className="live-top">
        <div className="brand"><span className="brand-mark" aria-hidden="true" />CHOG STATE</div>
        <div className="top-right">
          <span className="net-pill"><i aria-hidden="true" />Monad testnet</span>
          {isConnected && address && (
            <button className="keeper-chip" onClick={() => disconnect()} title="Disconnect wallet">{short(address)} · disconnect</button>
          )}
        </div>
      </header>

      {!isConnected ? (
        <section className="hero" aria-labelledby="hero-title">
          <div>
            <p className="eyebrow">Specimen file 001 · unclaimed</p>
            <h1 id="hero-title" className="h1">Every Chog gets a life. Yours gets <mark>scarred.</mark></h1>
            <p className="lead">
              Chog was born from a failed experiment. Claim one, run it through the lab, and every failure becomes a permanent scar on Monad. Sell it, and the scars go with it.
            </p>
            <div className="cta-row">
              <button className="btn btn-primary" disabled={connecting || !hasWallet} onClick={() => connect({ connector: connectors[0] })}>
                {connecting ? "Waiting for your wallet…" : "Connect wallet to claim a Chog"}
              </button>
              <Link href="/lab" className="link">Try the lab first, no wallet</Link>
            </div>
            {!hasWallet && <p className="note warn">No wallet found. Install MetaMask (or another browser wallet), then refresh.</p>}
            {connectError && <p className="note err">{UI.retry}</p>}
            <p className="fine">Testnet · free to mint · no real money</p>
          </div>
          <SpecimenCard no={1} keeper="unclaimed" standingName="Known" sticker={"Failed.\nLoved anyway."}>
            <LivingChog src={chogs[0]?.src ?? ""} scars={HERO_SCARS} standing={1} tokenId={chogs[0]?.tokenId} animate />
          </SpecimenCard>
        </section>
      ) : (
        <section aria-labelledby="dash-title">
          <div className="dash-head">
            <p className="eyebrow">Keeper dashboard</p>
            <h2 id="dash-title">Your specimens</h2>
            <p>Only the keeper of a Chog can run experiments on it. Mint a test Chog to open its file.</p>
          </div>

          {wrongNetwork && (
            <div className="panel alert">
              <p style={{ margin: "0 0 12px" }}>{UI.wrongNetwork}</p>
              <button className="btn btn-gold" disabled={switching} onClick={() => switchChain({ chainId: monadTestnet.id })}>Switch to Monad testnet</button>
            </div>
          )}

          {!wrongNetwork && (
            <>
              <div className="panel">
                <div className="mint-row">
                  <div>
                    <b>Mint a test Chog</b>
                    <p>Free. Needs a little test MON for gas (faucet.monad.xyz). Mock NFT, demo art.</p>
                  </div>
                  <button className="btn btn-lime" disabled={minting} onClick={() => { reset(); writeContract({ address: ADDR.chog, abi: chogAbi, functionName: "mint", chainId: monadTestnet.id }); }}>
                    {signing ? "Confirm in your wallet…" : minting ? "Minting…" : "Mint a test Chog"}
                  </button>
                </div>
                {rejected && <p className="note">No problem. Try again when you&apos;re ready.</p>}
                {mintError && !rejected && <p className="note err">{UI.retry}</p>}
                {receipt.isSuccess && <p className="note ok">Minted. He&apos;s yours now.</p>}
              </div>

              <p className="eyebrow">Your Chogs {loading ? "· looking…" : `· ${ids.length}`}</p>
              {loading && ids.length === 0 && <div className="grid-cards"><div className="skeleton" /><div className="skeleton" /></div>}
              {!loading && ids.length === 0 && <div className="empty">{UI.noChog}</div>}
              <div className="grid-cards">
                {ids.map((id) => {
                  const a = art(id);
                  return (
                    <div key={id}>
                      <SpecimenCard no={id} keeper={address ? short(address) : ""} standingName={STANDING_NAMES[chain[id]?.standing ?? 0]} small>
                        <LivingChog src={a.src} scars={chain[id]?.scars ?? FRESH} boons={chain[id]?.successCount ?? 0} tint={a.tint} tokenId={id} alt={`Test Chog number ${id}`} />
                      </SpecimenCard>
                      <div className="cap">Test Chog Nº {id}<small>{chain[id] && chain[id].runCount > 0 ? `on-chain · ${chain[id].runCount} runs · weirdness ${chain[id].weirdness}` : "mock art · on-chain file is empty"}</small></div>
                      <button className="btn btn-primary" style={{ marginTop: 12, width: "100%", padding: "12px 16px" }} onClick={() => setOpenId(id)}>Open in lab</button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}
    </main>
  );
}
