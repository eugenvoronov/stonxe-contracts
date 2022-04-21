// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.7.6;
pragma abicoder v2;

import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@uniswap/v3-periphery/contracts/base/PeripheryImmutableState.sol";
import "@uniswap/v3-periphery/contracts/base/PeripheryPayments.sol";
import "@uniswap/v3-periphery/contracts/libraries/CallbackValidation.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/v3-periphery/contracts/libraries/PoolAddress.sol";
import "@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3FlashCallback.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

contract Swap is IUniswapV3FlashCallback, PeripheryImmutableState, PeripheryPayments {
    using SafeMathUpgradeable for uint256;

    ISwapRouter public immutable swapRouter;
    address internal WETH;
    
    address public owner;

    struct FlashParams {
        address token0;
        address token1;
        address token2;
        uint24 fee1;
        uint256 amount0;
        uint256 amount1;
        uint24 fee2;
    }
    
    struct FlashCallbackData {
        uint256 amount0;
        uint256 amount1;
        address target;
        address payer;
        PoolAddress.PoolKey poolKey;
        uint24 poolFee2;
    }

    event Received(address recipient, uint amount);

    constructor(
        ISwapRouter _swapRouter,
        address _factory,
        address _WETH9
    ) PeripheryImmutableState(_factory, _WETH9) {
        swapRouter = _swapRouter;
        WETH = _WETH9;
    }

    // @dev Payback
    // @param _amount0 uint256
    // @param _amount1 uint256
    // @param _fee0 uint256
    // @param _fee1 uint256
    // @param _token0 address
    // @param _token1 address
    // @param _amountOut1 uint256
    // @param _payer address
    function payback(
        uint256 _amount0,
        uint256 _amount1,
        uint256 _fee0,
        uint256 _fee1,
        address _token0,
        address _token1,
        uint256 _amountOut1,
        address _payer
    ) internal {
        uint256 amount0Owed = _amount0.add(_fee0);
        uint256 amount1Owed = _amount1.add(_fee1);

        TransferHelper.safeApprove(_token0, address(this), amount0Owed);
        TransferHelper.safeApprove(_token1, address(this), amount1Owed);

        if (amount0Owed > 0)
            pay(_token0, address(this), msg.sender, amount0Owed);
        if (amount1Owed > 0)
            pay(_token1, address(this), msg.sender, amount1Owed);

        if (_amountOut1 > amount0Owed) {
            uint256 profit1 = _amountOut1.sub(amount0Owed);
            TransferHelper.safeApprove(_token0, address(this), profit1);
            pay(_token0, address(this), _payer, profit1);
        }
    }

    // @dev Swap on Uniswap
    // @param _amountIn uint256
    // @param _inputToken address
    // @param _outputToken address
    // @param _poolFee uint24
    function swapOnUniswap(
        uint256 _amountIn,
        address _inputToken,
        address _outputToken,
        uint24 poolFee
    ) internal returns (uint256 amountOut) {
        TransferHelper.safeApprove(_inputToken, address(swapRouter), _amountIn);

        if (_inputToken == WETH || _outputToken == WETH) {
            amountOut = swapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: _inputToken,
                    tokenOut: _outputToken,
                    fee: poolFee,
                    recipient: address(this),
                    deadline: block.timestamp,
                    amountIn: _amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
        } else {
            ISwapRouter.ExactInputParams memory params = ISwapRouter
                .ExactInputParams({
                    path: abi.encodePacked(
                        _inputToken,
                        poolFee,
                        WETH,
                        poolFee,
                        _outputToken
                    ),
                    recipient: address(this),
                    deadline: block.timestamp,
                    amountIn: _amountIn,
                    amountOutMinimum: 0
                });

            amountOut = swapRouter.exactInput(params);
        }
    }

    // @dev Uniswap V3 flash callback
    // @param _fee0 uint256
    // @param _fee1 uint256
    // @param _data bytes
    function uniswapV3FlashCallback(
        uint256 _fee0,
        uint256 _fee1,
        bytes calldata _data
    ) external override {
        FlashCallbackData memory decoded = abi.decode(
            _data,
            (FlashCallbackData)
        );
        CallbackValidation.verifyCallback(factory, decoded.poolKey);

        address token0 = decoded.poolKey.token0;
        address token1 = decoded.poolKey.token1;

        uint256 amountOut = swapOnUniswap(
            decoded.amount0,
            token0,
            decoded.target,
            decoded.poolFee2
        );

        payback(
            decoded.amount0,
            decoded.amount1,
            _fee0,
            _fee1,
            token0,
            token1,
            amountOut,
            decoded.payer
        );
    }

    // @dev Flash
    // @param _params FlashParams
    function flash(FlashParams memory _params) external {
        PoolAddress.PoolKey memory poolKey = PoolAddress.PoolKey({
            token0: _params.token0,
            token1: _params.token1,
            fee: _params.fee1
        });

        IUniswapV3Pool pool = IUniswapV3Pool(
            PoolAddress.computeAddress(factory, poolKey)
        );

        pool.flash(
            address(this),
            _params.amount0,
            _params.amount1,
            abi.encode(
                FlashCallbackData({
                    amount0: _params.amount0,
                    amount1: _params.amount1,
                    target: _params.token2,
                    payer: msg.sender,
                    poolKey: poolKey,
                    poolFee2: _params.fee2
                })
            )
        );
    }

    // @dev Only owner modifier
    // @param _token address
    // @param _recipient address
    // @param _value uint256
    function withdrawToken(
        address _token,
        address _recipient,
        uint256 _value
    ) external onlyOwner {
        pay(_token, address(this), _recipient, _value);
    }

    // @dev Only owner modifier
    modifier onlyOwner() {
        require(owner == msg.sender, "Swap: caller is not a owner");
        _;
    }
}