// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.7.0;

interface IOracle {
    function getLatestPrice() external returns (uint256);
}