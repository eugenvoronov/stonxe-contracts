// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.7.6;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "../interfaces/oracle/ICaller.sol";

/**
 //
 */
contract Oracle is AccessControlUpgradeable {
    using SafeMathUpgradeable for uint;

    address public owner;

    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    uint256 private nonce = 0;
    uint256 private modulus = 10**3;
    uint256 private oracleCount = 0;
    uint256 private responsesThreshold = 0;

    struct Response {
        address oracleAddress;
        address callerAddress;
        uint256 latestPrice;
    }

    mapping(uint256 => Response[]) public responses;
    mapping(uint256 => bool) pendingRequests;

    event AddOracle(address oracle);
    event RemoveOracle(address oracle);
    event GetLatestPrice(uint256 requestId, address callerAddress);
    event SetLatestPrice(address callerAddress, uint256 latestPrice);
    event SetResponsesThreshold(uint256 responsesThreshold);

    constructor() {
        owner = msg.sender;
    }

    function setResponsesThreshold(uint256 _responsesThreshold) public onlyOwner {
        responsesThreshold = _responsesThreshold;
        emit SetResponsesThreshold(responsesThreshold);
    }

    function getLatestPrice() public returns (uint256) {
        nonce++;
        uint256 requestId = uint(keccak256(abi.encodePacked(block.timestamp, msg.sender, nonce))) % modulus;
        pendingRequests[requestId] = true;

        emit GetLatestPrice(requestId, msg.sender);

        return requestId;
    }

    function setLatestPrice(uint256 _requestId, uint256 _latestPrice, address _callerAddress) public onlyOracle {
        require(pendingRequests[_requestId], "Oracle: pending request not found");
        delete pendingRequests[_requestId];

        Response memory response = Response(msg.sender, _callerAddress, _latestPrice);
        
        responses[_requestId].push(response);
        
        if (responses[_requestId].length >= responsesThreshold) {
            // Improve it: find the median
            uint256 medianPrice = responses[_requestId][0].latestPrice;
            
            ICaller callerContract = ICaller(_callerAddress);
            callerContract.fulfillPrice(_requestId, medianPrice);

            delete responses[_requestId];

            emit SetLatestPrice(_callerAddress, medianPrice);  
        }
    }
    
    function getOracleCount() public view onlyOwner returns (uint256) {
        return getRoleMemberCount(ORACLE_ROLE);
    }
    
    function addOracle(address _oracle) external onlyOwner {
        grantRole(ORACLE_ROLE, _oracle);
        oracleCount = oracleCount.add(1);

        emit AddOracle(_oracle);
    }

    function removeOracle(address _oracle) external onlyOwner {
        revokeRole(ORACLE_ROLE, _oracle);
        oracleCount = oracleCount.sub(1);

        emit RemoveOracle(_oracle);
    }

    modifier onlyOracle() {
        require(hasRole(ORACLE_ROLE, msg.sender), "Oracle: caller is not a oracle");
        _;
    }

    modifier onlyOwner() {
        require(owner == msg.sender, "Oracle: caller is not a owner");
        _;
    }
}