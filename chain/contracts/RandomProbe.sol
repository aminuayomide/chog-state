// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// Temporary test: does block.prevrandao return a usable value on Monad testnet?
contract RandomProbe {
    uint256 public lastPrevrandao;
    uint256 public lastTimestamp;
    bytes32 public lastBlockHash;

    function record() external {
        lastPrevrandao = block.prevrandao;
        lastTimestamp = block.timestamp;
        lastBlockHash = blockhash(block.number - 1);
    }
}