// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.7.6;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "./interfaces/oracle/IOracle.sol";
import "./StonxeToken.sol";

contract Exchange is AccessControlUpgradeable {
    using SafeMathUpgradeable for uint;

    address public owner;
    address public feeAccount;
    uint256 public feePercent;
    address constant ETHER = address(0);
    uint256 public orderCount;

    mapping(address => mapping(address => uint256)) public tokens;
    mapping(uint256 => _Order) public orders;
    mapping(uint256 => bool) public orderCancelled;
    mapping(uint256 => bool) public orderFilled;

    IOracle private ethUsdOracle;

    event Deposit(address indexed token, address indexed user, uint256 amount, uint256 balance);
    event Withdraw(address indexed token, address indexed user, uint256 amount, uint256 balance);
    event Order(
        uint256 indexed id,
        address indexed user,
        address tokenGet,
        uint256 amountGet,
        address tokenGive,
        uint256 amountGive,
        uint256 timestamp
    );
    event Cancel(
        uint256 indexed id,
        address indexed user,
        address tokenGet,
        uint256 amountGet,
        address tokenGive,
        uint256 amountGive,
        uint256 timestamp
    );
    event Trade(
        uint256 indexed id,
        address indexed user,
        address tokenGet,
        uint256 amountGet,
        address tokenGive,
        uint256 amountGive,
        address userFill,
        uint256 timestamp
    );

    event NewOracleAddress(
        address oracle 
    );

    struct _Order {
        uint256 id;
        address user;
        address tokenGet;
        uint256 amountGet;
        address tokenGive;
        uint256 amountGive;
        uint256 timestamp;
    }

    constructor(address _feeAccount, uint256 _feePercent) {
        owner = msg.sender;
        feeAccount = _feeAccount;
        feePercent = _feePercent;
        orderCount = 0;
    }


    fallback() external {
        revert();
    }

    // @dev Setup new oracle address
    // @param _oracle address
    function setEthUsdOracleAddress(address _oracle) public onlyOwner {
        ethUsdOracle = IOracle(_oracle);
        emit NewOracleAddress(_oracle);
    }

    // @dev Deposit ether to exchange contract from sender and increase sender account tokens deposit.
    function depositEther() payable public {
        tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].add(msg.value);
        emit Deposit(ETHER, msg.sender, msg.value, tokens[ETHER][msg.sender]);
    }

    // @dev Withdraw ethers from exchange contract to msg.sender account. 
    // @param _amount uint256
    function withdrawEther(uint256 _amount) public {
        require(tokens[ETHER][msg.sender] >= _amount);

        tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].sub(_amount);
        payable(msg.sender).transfer(_amount);
        emit Withdraw(ETHER, msg.sender, _amount, tokens[ETHER][msg.sender]);
    }

    // @dev Deposit token to exchange contract from sender and increase sender account tokens deposit.
    // @param _token address Token's contract address.
    // @param _amount uint256 Amount of tokens.
    function depositToken(address _token, uint _amount) public {
        require(_token != ETHER);
        require(StonxeToken(_token).transferFrom(msg.sender, address(this), _amount));

        tokens[_token][msg.sender] = tokens[_token][msg.sender].add(_amount);
        emit Deposit(_token, msg.sender, _amount, tokens[_token][msg.sender]);
    }

    // @dev Withdraw tokens from exchange contract to msg.sender account. 
    // @param _token address
    // @param _amount uint256
    function withdrawToken(address _token, uint256 _amount) public {
        require(tokens[_token][msg.sender] >= _amount);
        tokens[_token][msg.sender] = tokens[_token][msg.sender].sub(_amount);
        
        require(StonxeToken(_token).transfer(msg.sender, _amount));
        emit Withdraw(_token, msg.sender, _amount, tokens[_token][msg.sender]);
    }

    // @dev Get the balance of the user.
    // @param _token address
    // @param _user address
    // @return balance uint256 
    function balanceOf(address _token, address _user) public view returns (uint256 balance) {
        return tokens[_token][_user];
    }

    // @dev Make order for exchange.
    // @param _tokenGet address
    // @param _amountGet uint256
    // @param _tokenGive address
    // @param _amountGive uint256
    function makeOrder(address _tokenGet, uint256 _amountGet, address _tokenGive, uint256 _amountGive) public {
        orderCount = orderCount.add(1);

        orders[orderCount] = _Order({
            id: orderCount,
            user: msg.sender,
            tokenGet: _tokenGet,
            amountGet: _amountGet,
            tokenGive: _tokenGive,
            amountGive: _amountGive,
            timestamp: block.timestamp
        });

        emit Order(orderCount, msg.sender, _tokenGet, _amountGet, _tokenGive, _amountGive, block.timestamp);
    }

    // @dev Cancel order by order id.
    // @param _id uint256 Order id.
    function cancelOrder(uint256 _id) public {
        _Order storage _order = orders[_id];

        require(!orderCancelled[_id], "Error, order already cancelled");
        require(address(_order.user) == msg.sender);
        require(_order.id == _id);

        orderCancelled[_id] = true;
        emit Cancel(_order.id, msg.sender, _order.tokenGet, _order.amountGet, _order.tokenGive, _order.amountGive, block.timestamp);
    }

    // @dev Fill order by order id.
    // @param _id uint256 Order id.
    function fillOrder(uint256 _id) public {
        require(_id > 0 && _id <= orderCount, "Error, wrong id");
        require(!orderFilled[_id], "Error, order already filled");
        require(!orderCancelled[_id], "Error, order already cancelled");

        _Order storage _order = orders[_id];
        _trade(_order.id, _order.user, _order.tokenGet, _order.amountGet, _order.tokenGive, _order.amountGive);
        orderFilled[_order.id] = true;
    }

    // @dev Trade order.
    // @param _orderId uint256
    // @param _user address
    // @param _tokenGet address
    // @param _amountGet uint256
    // @param _tokenGive address
    // @param _amountGive uint256
    function _trade(uint256 _orderId, address _user, address _tokenGet, uint256 _amountGet, address _tokenGive, uint256 _amountGive) internal {
        uint256 _feeAmount = (_amountGet.mul(feePercent)).div(100);

        tokens[_tokenGet][msg.sender] = tokens[_tokenGet][msg.sender].sub((_amountGet.add(_feeAmount)));
        tokens[_tokenGet][_user] = tokens[_tokenGet][_user].add(_amountGet);
        tokens[_tokenGet][feeAccount] = tokens[_tokenGet][feeAccount].add(_feeAmount);
        tokens[_tokenGive][msg.sender] = tokens[_tokenGive][msg.sender].add(_amountGive);
        tokens[_tokenGive][_user] = tokens[_tokenGive][_user].sub(_amountGive);

        emit Trade(_orderId, _user, _tokenGet, _amountGet, _tokenGive, _amountGive, msg.sender, block.timestamp);
    }

    // @dev Only owner modifier
    modifier onlyOwner() {
        require(owner == msg.sender, "Exchange: caller is not a owner");
        _;
    }
}