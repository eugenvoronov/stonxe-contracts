// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.7.6;

import "../interfaces/oracle/IOracle.sol";

contract CallerContract {
    address public owner;

    uint256 private ethPrice;
    mapping(uint256 => bool) requestIds;

    address private oracleAddress;
    
    event NewOracleAddress(address oracleAddress);
    event NewRequestId(uint256 requestId);
    event FullfillPrice(uint256 requestId, uint256 ethPrice);

    IOracle private oracle;

    constructor() {
        owner = msg.sender;
    }

    function setOracleInstanceAddress(address _oracleInstanceAddress) public onlyOwner {
        oracleAddress = _oracleInstanceAddress;
        oracle = IOracle(oracleAddress);
        emit NewOracleAddress(oracleAddress);
    }

    function updateEthPrice() public returns (uint256) {
        uint256 requestId = oracle.getLatestPrice();
        requestIds[requestId] = true;
        emit NewRequestId(requestId);

        return requestId;
    }

    function fulfillPrice(uint256 _requestId, uint256 _ethPrice) public onlyOracle {
        require(requestIds[_requestId], 'Caller: request not found');
        ethPrice = _ethPrice;
        delete requestIds[_requestId];
        emit FullfillPrice(_requestId, ethPrice);
    }

    modifier onlyOracle() {
        require(msg.sender != oracleAddress, "Caller: caller is not an oracle");
        _;
    }

    modifier onlyOwner() {
        require(owner == msg.sender, "Caller: caller is not a owner");
        _;
    }
}
