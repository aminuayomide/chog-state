# Chog State

Chog was born from a failed experiment. Chog State gives every Chog a life that can be scarred: you run risky experiments, most fail, and every failure becomes a permanent scar. Built for Chogathon 2026 on Monad.

> Status: work in progress. Demo Mode is complete. Wallet minting works. Running experiments on a wallet Chog (writing scars on-chain from the UI) is being built next.

## Try it in 2 minutes (no wallet)
1. `npm install` then `npm run dev`, open http://localhost:3000
2. Click **Meet a Chog** (or open `/lab`).
3. Press and **hold** the pink button. The first run is always the Origin experiment.
4. Keep running experiments. Failures leave scars; breakthroughs are rare. Try the risk dial (Careful / Normal / Reckless).
5. Switch Chogs with the thumbnails. Progress is saved in your browser only (Demo Mode).

## Try the wallet page
Open `/live`, connect a wallet on **Monad testnet** (chain id 10143, free MON at https://faucet.monad.xyz), and mint a test Chog.

## How it works
- `chain/contracts/ChogStateRegistry.sol`: the registry. Only the keeper (NFT owner) can run an experiment on a token. The contract rolls every outcome and stores scar counts, milestones, combos and history against the token id, so the history travels with the NFT.
- `lib/engine.ts`: the Demo Mode engine, a TypeScript mirror of the contract. It was tested against the contract over 420 random runs with identical results (`chain/test-optional/engine-parity.test.js`).
- `shared/*.json`: single source of truth for odds, combos, daily modifiers, text and reactions.
- No AI makes any decision. Outcomes follow published odds. All text is pre-written.

## Honesty notes
- The registry runs on Monad **testnet** with a **mock** Chog NFT (and a mock $CHOG token). The real Chog Genesis NFT lives on mainnet, so a testnet contract cannot verify real Chog ownership.
- Randomness uses `block.prevrandao`: fine for a demo, not for production.
- Scars are shown in this app (and any app reading the registry). They do not change the original NFT's marketplace metadata.
- Demo art: Chog Genesis by CHOGLABS. This is an unofficial hackathon entry.

## Contracts (Monad testnet)
See `shared/deployed.json`.

## Run the contract tests
```
cd chain
npm install
npx hardhat test
```

Built by Ayomide (github.com/aminuayomide, X @cryptoQuazz).
