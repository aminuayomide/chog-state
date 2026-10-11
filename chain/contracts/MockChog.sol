// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// Demo stand-in for Chog Genesis on testnet. Anyone can mint a test Chog.
contract MockChog is ERC721, Ownable {
    uint256 public nextId = 1;
    string public baseURI;

    constructor(string memory baseURI_) ERC721("Mock Chog", "MCHOG") Ownable(msg.sender) {
        baseURI = baseURI_;
    }

    function mint() external returns (uint256 id) {
        id = nextId++;
        _mint(msg.sender, id);
    }

    function setBaseURI(string calldata b) external onlyOwner {
        baseURI = b;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }
}