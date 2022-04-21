// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.7.6;

import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";

contract StonxeToken {
    using SafeMathUpgradeable for uint;

    string public name = 'Stonxe';
    string public symbol = 'STX';
    uint256 public constant decimals = 18;
    uint256 public totalSupply = 10000000 * (10 ** decimals);

    mapping(address => uint256) public balances;
    mapping(address => mapping(address => uint256)) public allowed;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor() {
        balances[msg.sender] = totalSupply;
    }

    // @dev Get the balance of the address.
    // @param _owner address The address to query the the balance of. 
    // @return balance uint256 Representing the amount owned by the passed address.
    function balanceOf(address _owner) public view returns (uint256 balance) {
        return balances[_owner];
    }

    // @dev Get an addres of the contract.
    // @return token address Representing the address of the contract.
    function addressOf() public view returns (address token) {
        return address(this);
    }
    
    // @dev Transfer tokens to the address.
    // @param _to address The address to transfer to.
    // @param _value uint256 The amount to be transferred.
    function transfer(address _to, uint256 _value) public returns (bool) {
        require(_to != address(0));
        require(balances[msg.sender] >= _value);

        balances[msg.sender] = balances[msg.sender].sub(_value);
        balances[_to] = balances[_to] + _value;
        emit Transfer(msg.sender, _to, _value);

        return true;
    }

    // @dev Transfer amount tokens from sender to recipient using the allowance mechanism.
    // @param _sender address The address which you want to send tokens from.
    // @param _recipient address The address which you want to transfer to.
    // @param _value uint256 The amount of tokens to be transferred.
    // @return bool
    function transferFrom(address _sender, address _recipient, uint256 _value) public returns (bool) {
        require(_sender != address(0));
        require(_recipient != address(0));
        require(balances[_sender] >= _value);

        allowed[_sender][msg.sender] = allowed[_sender][msg.sender].sub(_value);

        balances[_sender] = balances[_sender].sub(_value);
        balances[_recipient] = balances[_recipient].add(_value);
        emit Transfer(_sender, _recipient, _value);

        return true;
    }

    // @dev Approve the transferred address to spend the specified number of tokens on behalf of msg.sender.
    // @param _spender address The address which will spend the funds.
    // @param _value uint256 The amount of tokens to be spent.
    function approve(address _spender, uint256 _value) public {
        require(_spender != address(0));
        require(balances[msg.sender] >= _value);

        allowed[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
    }

    
    // @dev Check the number of tokens that the owner allowed the spender.
    // @param _owner address The address which owns the funds.
    // @param _spender address The address which will spend the funds.
    // @return remining uint256 Specifying the number of tokens still available for spender.
    function allowance(address _owner, address _spender) public view returns (uint256 remining) {
        require(_owner != address(0));
        require(_spender != address(0));

        return allowed[_owner][_spender];
    }
}