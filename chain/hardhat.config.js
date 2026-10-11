require("@nomicfoundation/hardhat-toolbox");

const raw = process.env.PRIVATE_KEY || "";
const pk = raw ? (raw.startsWith("0x") ? raw : "0x" + raw) : "";

module.exports = {
  solidity: {
    version: "0.8.30",
    settings: {
      evmVersion: "prague",
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    monadTestnet: {
      url: "https://testnet-rpc.monad.xyz",
      chainId: 10143,
      accounts: pk ? [pk] : [],
    },
  },
};