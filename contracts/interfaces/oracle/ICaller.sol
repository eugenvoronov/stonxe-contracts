// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.7.0;

interface ICaller {
    function fulfillPrice(uint256 _requestId, uint256 _ethPrice) external;
}