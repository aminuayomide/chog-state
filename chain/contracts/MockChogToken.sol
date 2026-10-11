// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// Demo stand-in for $CHOG on testnet. 100 free tokens per address per day.
contract MockChogToken is ERC20 {
    mapping(address => uint256) public lastClaim;

    constructor() ERC20("Mock CHOG", "mCHOG") {}

    function claim() external {
        require(block.timestamp >= lastClaim[msg.sender] + 1 days, "Come back tomorrow");
        lastClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, 100 ether);
    }
}