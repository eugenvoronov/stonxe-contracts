// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.7.6;

import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import './StonxeToken.sol';

contract Cheque {
    using SafeMathUpgradeable for uint;
 
    address public owner;

    address public feeAccount;
    uint256 public feePercent;
    uint256 public chequeCount;
    address constant ETHER = address(0);
    address constant STX = address(0);

    mapping(TOKENS => address) public tokens;
    mapping(uint256 => _Cheque) public cheques;
    mapping(uint256 => bool) public chequeInactive;

    event NewCheque(uint256 indexed id, address indexed account, TOKENS token, address indexed owner);
    event Topup(uint256 indexed id, address indexed account, TOKENS token, address indexed sender, uint256 amount, uint256 balance);
    event Withdraw(uint256 indexed id, address indexed account, TOKENS token, address indexed owner, uint256 amount, uint256 balance);
    event ChangeOwner(uint256 indexed id, address indexed newOwner);
    event Transfer(uint256 indexed from, uint256 indexed to, uint256 amount);
    event ChangeToken(uint256 indexed id, uint256 indexed goalToken);
    event Deactivate(uint256 indexed id);

    enum TOKENS {
        ETH,
        STX,
        AAVE,
        UNI
    }

    struct _Cheque {
        uint256 id;
        address owner;
        address account;
        TOKENS token;
        uint256 balance;
        uint256 timestamp;
    }

    constructor(address ethAccount, address stxAccount, address _feeAccount, uint256 _feePercent) {
        owner = msg.sender;

        feeAccount = _feeAccount;
        feePercent = _feePercent;
        chequeCount = 0;

        tokens[TOKENS.ETH] = ethAccount;
        tokens[TOKENS.STX] = stxAccount;
    }

    fallback() external {
        revert();
    }


    // @dev Create new cheque.
    // @param _token address
    function newCheque(TOKENS _token) public {
        chequeCount = chequeCount.add(1);
        cheques[chequeCount] = _Cheque({
            id: chequeCount,
            owner: msg.sender,
            account: tokens[_token],
            token: _token,
            balance: 0,
            timestamp: block.timestamp
        });

        emit NewCheque(chequeCount, tokens[_token], _token, msg.sender);
    }

 
    // @dev Topup cheque with ether for amount by cheque id.
    // @param _id uint256
    function topupEther(uint256 _id) payable public {
        require(_id > 0 && _id <= chequeCount, "Cheque: invalid cheque id");
        require(!chequeInactive[_id], "Cheque, cheque already inactive");

        _Cheque storage _cheque = cheques[_id];
        
        require(tokens[TOKENS.ETH] == _cheque.account, "Cheque: invalid cheque token");

        _cheque.balance = _cheque.balance.add(msg.value);
        emit Topup(_id, tokens[_cheque.token], _cheque.token, msg.sender, msg.value, _cheque.balance);
    }

    // @dev Topup cheque with token for amount by cheque id.
    // @param _id uint256
    // @param _amount uint256
    function topupToken(uint256 _id, uint256 _amount) public {
        require(_id > 0 && _id <= chequeCount, "Cheque: invalid cheque id");
        require(!chequeInactive[_id], "Cheque, cheque already inactive");

        _Cheque storage _cheque = cheques[_id];

        require(tokens[TOKENS.STX] == _cheque.account, "Cheque: invalid cheque token");
        require(StonxeToken(_cheque.account).transferFrom(msg.sender, address(this), _amount));

        _cheque.balance = _cheque.balance.add(_amount);
        emit Topup(_id, tokens[_cheque.token], _cheque.token, msg.sender, _amount, _cheque.balance);
    }

    // @dev Withdraw cheque for amount by cheque id.
    // @param _id uint256
    // @param _amount uint256
    function withdraw(uint256 _id, uint256 _amount) public {
        require(_id > 0 && _id <= chequeCount, "Cheque: invalid cheque id");
        require(!chequeInactive[_id], "Cheque, cheque already inactive");

        _Cheque storage _cheque = cheques[_id];

        require(msg.sender == _cheque.owner, "Cheque, invalid owner of the cheque");
        require(_cheque.balance >= _amount, "Cheque, insufficient balance");

        _cheque.balance = _cheque.balance.sub(_amount);

        if (tokens[TOKENS.ETH] == _cheque.account) {
            payable(msg.sender).transfer(_amount);
        } else {
            require(StonxeToken(_cheque.account).transfer(msg.sender, _amount));
        }

        emit Withdraw(_id, tokens[_cheque.token], _cheque.token, _cheque.owner, _amount, _cheque.balance);
    }

    // @dev Change owner of the cheque.
    // @param _id uint256
    // @param _newOwner address
    function changeOwner(uint256 _id, address _newOwner) public {
        require(_id > 0 && _id <= chequeCount, "Cheque: invalid cheque id");
        require(!chequeInactive[_id], "Cheque, cheque already inactive");

        _Cheque storage _cheque = cheques[_id];

        require(msg.sender == _cheque.owner, "Cheque, invalid owner of the cheque");
        _cheque.owner = _newOwner;

        emit ChangeOwner(_id, _newOwner);
    }

    // @dev Transfer amount from cheque to cheque.
    // @param _from uint256
    // @param _to uint256
    // @param _amount uint256
    function transfer(uint256 _from, uint256 _to, uint256 _amount) public {
        require(_from > 0 && _from <= chequeCount, "Cheque, invalid cheque number");
        require(_to > 0 && _to <= chequeCount);
        require(!chequeInactive[_from], "Cheque, cheque already inactive");
        require(!chequeInactive[_to], "Cheque, cheque already inactive");

        _Cheque storage _chequeFrom = cheques[_from];
        require(msg.sender == _chequeFrom.owner, "Cheque, invalid owner of the cheque");
        require(_chequeFrom.balance <= _amount, "Cheque, insufficient balance");

        _Cheque storage _chequeTo = cheques[_to];

        _chequeFrom.balance = _chequeFrom.balance.sub(_amount);
        _chequeTo.balance = _chequeTo.balance.add(_amount);

        emit Transfer(_from, _to, _amount);
    }

    // @dev Get balance by cheque id.
    // @param _id uint256
    // @return balance uint256
    function balanceOf(uint256 _id) public view returns (uint256 balance) {
        require(_id > 0 && _id <= chequeCount, "Cheque: invalid cheque id");
        require(!chequeInactive[_id], "Cheque: cheque already inactive");
        _Cheque storage _cheque = cheques[_id];

        require(msg.sender == _cheque.owner, "Cheque: invalid owner of the cheque");
        
        return _cheque.balance;
    }

    // @dev Deactivate cheque by cheque id.
    // @param _id uint256
    function deactivate(uint256 _id) public {
        require(_id > 0 && _id <= chequeCount, "Cheque: invalid cheque id");
        require(!chequeInactive[_id], "Cheque, cheque already inactive");

        _Cheque storage _cheque = cheques[_id];

        require(msg.sender == _cheque.owner, "Cheque, invalid owner of the cheque");

        chequeInactive[_id] = true;

        emit Deactivate(_id);
    }

    // @dev Only owner modifier
    modifier onlyOwner() {
        require(owner == msg.sender, "Exchange: caller is not a owner");
        _;
    }
}