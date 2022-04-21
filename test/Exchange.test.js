import { ethToWei, ether, EVM_REVERT } from './helpers'
const { ETHER_ADDRESS } = require("../scripts/addresses")

const Token = artifacts.require("./StonxeToken")
const Exchange = artifacts.require("./Exchange")

const { expect } = require('chai');

contract("Exchange", ([owner, feeAccount, user1, user2]) => {
    let token;
    let exchange
    const feePercent = 10

    beforeEach(async () => {
        token = await Token.new()
        token.transfer(user1, ethToWei(100), { from: owner })

        exchange = await Exchange.new(feeAccount, feePercent)
    })

    describe("deployment", () => {
        it("tracks the fee account", async () => {
            const result = await exchange.feeAccount()
            expect(result).to.equal(feeAccount)
        })

        it("tracks the fee percent", async () => {
            const result = await exchange.feePercent()
            expect(result.toString()).to.equal(feePercent.toString())
        })
    })

    describe("fallback", () => {
        it("revert Ether sent", async () => {
            expect(exchange.sendTransaction({ from: user1, value: 1 })).be.revertedWith(EVM_REVERT)
        })
    })

    describe("deposit ethers", () => {
        let depositAmount;
        let depositResult; 

        beforeEach(async () => {
            depositAmount = ethToWei(1);
            depositResult = await exchange.depositEther({ from: user1, value: depositAmount });
        })
        
        it ("tracks the ether deposit", async () => {
            const exchangeBalance = await exchange.tokens(ETHER_ADDRESS, user1)
            expect(exchangeBalance.toString()).to.equal(depositAmount.toString())
        })

        it("handle Deposit event", () => {
            const log = depositResult.logs[0]
            expect(log.event).to.equal("Deposit")
            const event = log.args
            expect(event.token).to.equal(ETHER_ADDRESS)
            expect(event.user).to.equal(user1)
            expect(event.amount.toString()).to.equal(depositAmount.toString(), "amount is correct")
            expect(event.balance.toString()).to.equal(depositAmount.toString(), "balance is correct")
        })
    })

    describe("withdrawal ethers", () => {
        let amount;
        let withdrawResult;

        beforeEach(async () => {
            amount = ethToWei(1)
            await exchange.depositEther({ from: user1, value: amount })
        })

        describe("success", () => {
            beforeEach(async () => {
                withdrawResult = await exchange.withdrawEther(amount, { from: user1 })
            })

            it("tracks the ether withdrawal", async () => {
                const userBalance = await exchange.tokens(ETHER_ADDRESS, user1)
                expect(userBalance.toString()).to.equal("0")
            })

            it("handle Withdraw ether event", () => {
                const log  = withdrawResult.logs[0]
                expect(log.event).to.equal("Withdraw")
                const event = log.args
                expect(event.token).to.equal(ETHER_ADDRESS)
                expect(event.user).to.equal(user1)
                expect(event.amount.toString()).to.equal(amount.toString())
                expect(event.balance.toString()).to.equal("0")
            })
        })

        describe("failure", () => {
            it("fails for insufficient balances", async () => {
                expect(exchange.withdrawEther(ethToWei(100), { from: user1 })).be.revertedWith(EVM_REVERT)
            })
        })
    })

    describe("depositing tokens", () => {
        let depositAmount;
        let depositResult; 

        describe("success", () => {
            beforeEach(async () => {
                depositAmount = ethToWei(1)
                await token.approve(exchange.address, depositAmount, { from: user1 })
                depositResult = await exchange.depositToken(token.address, depositAmount, { from: user1 })
            })

            it("tracks the token deposit", async () => {
                // Check exchange token balance
                let balance
                balance = await token.balanceOf(exchange.address)
                expect(balance.toString()).to.equal(depositAmount.toString())
                // Check tokens on exchange
                balance = await exchange.tokens(token.address, user1)
                expect(balance.toString()).to.equal(depositAmount.toString())
              })

            it("handle Deposit event", () => {
                const log = depositResult.logs[0]
                expect(log.event).to.equal("Deposit")
                const event = log.args
                expect(event.token).to.equal(token.address, "token address is correct")
                expect(event.user).to.equal(user1, "user address is correct")
                expect(event.amount.toString()).to.equal(depositAmount.toString(), "amount is correct")
                expect(event.balance.toString()).to.equal(depositAmount.toString(), "balance is correct")
            })
        })

        describe("failure", () => {
            it("reject ether deposits", async () => {
                expect(exchange.depositToken(ETHER_ADDRESS, depositAmount, { from: user1 })).be.revertedWith(EVM_REVERT)
            })

            it("fails when no tokens are approved", async () => {
                expect(exchange.depositToken(token.address, depositAmount, { from: user1 })).be.revertedWith(EVM_REVERT)
            })
        }) 
    })

    describe("withdrawal tokens", () => {
        describe("succcess", () => {
            let amount;
            let withdrawResult;

            beforeEach(async () => {
                let userBalance = await exchange.tokens(token.address, user1)
                amount = ethToWei(1)
                await token.approve(exchange.address, amount, { from: user1 })
                await exchange.depositToken(token.address, amount, { from: user1 })
                withdrawResult = await exchange.withdrawToken(token.address, amount, { from: user1 })
                userBalance = await exchange.tokens(token.address, user1)
            })

            it("tracks the token withdrawal", async () => {
                const userBalance = await exchange.tokens(token.address, user1)
                expect(userBalance.toString()).to.equal("0")
            })

            it("handle Withdraw token event", () => {
                const log  = withdrawResult.logs[0]
                expect(log.event).to.equal("Withdraw")
                const event = log.args
                expect(event.token).to.equal(token.address)
                expect(event.user).to.equal(user1)
                expect(event.amount.toString()).to.equal(amount.toString())
                expect(event.balance.toString()).to.equal("0")
            })
        })

        describe("failure", () => {
            it("fails for insufficient balances", async () => {
                expect(exchange.withdrawToken(token.address, ethToWei(100), { from: user1 })).be.revertedWith(EVM_REVERT)
            })

            it("reject ether withdrawal", async () => {
                expect(exchange.withdrawToken(ETHER_ADDRESS, ethToWei(100), { from: user1 })).be.revertedWith(EVM_REVERT)
            })
        })
    })

    describe("checking balances", () => {
        beforeEach(async () => {
         await exchange.depositEther({ from: user1, value: ethToWei(1) })
        })
     
        it("returns user balance", async () => {
          const balance = await exchange.balanceOf(ETHER_ADDRESS, user1)
          expect(balance.toString()).to.equal(ethToWei(1).toString())
        })
    }) 

    describe("making orders", () => {
        let result
     
        beforeEach(async () => {
            result = await exchange.makeOrder(token.address, ethToWei(1), ETHER_ADDRESS, ethToWei(1), { from: user1 })
        })
     
        it("tracks the newly created order", async () => {
            const orderCount = await exchange.orderCount()
            expect(orderCount.toString()).to.equal("1")
            const order = await exchange.orders("1")
            expect(order.id.toString()).to.equal("1", "id is correct")
            expect(order.user).to.equal(user1, "user is correct")
            expect(order.tokenGet).to.equal(token.address, "tokenGet is correct")
            expect(order.amountGet.toString()).to.equal(ethToWei(1).toString(), "amountGet is correct")
            expect(order.tokenGive).to.equal(ETHER_ADDRESS, "tokenGive is correct")
            expect(order.amountGive.toString()).to.equal(ethToWei(1).toString(), "amountGive is correct")
            expect(order.timestamp.toString().length).to.be.at.least(1, "timestamp is present")
        })
     
        it("emits an Order event", () => {
            const log = result.logs[0]
            expect(log.event).to.eq("Order")
            const event = log.args
            expect(event.id.toString()).to.equal("1", "id is correct")
            expect(event.user).to.equal(user1, "user is correct")
            expect(event.tokenGet).to.equal(token.address, "tokenGet is correct")
            expect(event.amountGet.toString()).to.equal(ethToWei(1).toString(), "amountGet is correct")
            expect(event.tokenGive).to.equal(ETHER_ADDRESS, "tokenGive is correct")
            expect(event.amountGive.toString()).to.equal(ethToWei(1).toString(), "amountGive is correct")
            expect(event.timestamp.toString().length).to.be.at.least(1, "timestamp is present")
        })
    })
     
    describe("order actions", () => {
        beforeEach(async () => {
            // user1 deposits ether only
            await exchange.depositEther({ from: user1, value: ethToWei(1) })
            // give tokens to user2
            await token.transfer(user2, ethToWei(100), { from: owner })
            // user2 deposits tokens only
            await token.approve(exchange.address, ethToWei(2), { from: user2 })
            await exchange.depositToken(token.address, ethToWei(2), { from: user2 })
            // user1 makes an order to buy tokens with Ether
            await exchange.makeOrder(token.address, ethToWei(1), ETHER_ADDRESS, ethToWei(1), { from: user1 })
        })
    
        describe("filling orders", () => {
            let fillOrderResult
        
            describe("success", () => {
                beforeEach(async () => {
                    // user2 fills order
                    fillOrderResult = await exchange.fillOrder("1", { from: user2 })
                })
                    //user2 should receive 10% less ether
                it("executes the trade & charges fees", async () => {
                    let firsUserBalance = await exchange.balanceOf(token.address, user1)
                    expect(firsUserBalance.toString()).to.equal(ethToWei(1).toString(), "user1 received tokens")

                    firsUserBalance = await exchange.balanceOf(ETHER_ADDRESS, user1)
                    expect(firsUserBalance.toString()).to.equal("0", "user1 Ether deducted")

                    let secondUserBalance = await exchange.balanceOf(ETHER_ADDRESS, user2)
                    expect(secondUserBalance.toString()).to.equal(ethToWei(1).toString(), "user2 received Ether")

                    secondUserBalance = await exchange.balanceOf(token.address, user2)
                    expect(secondUserBalance.toString()).to.equal(ethToWei(0.9).toString(), "user2 tokens deducted with fee applied")

                    const feeAccount = await exchange.feeAccount()
                    let feeAccountBalance = await exchange.balanceOf(token.address, feeAccount)
                    expect(feeAccountBalance.toString()).to.equal(ethToWei(0.1).toString(), "feeAccount received fee")
                })
        
                it("updates filled orders", async () => {
                    const orderFilled = await exchange.orderFilled(1)
                    expect(orderFilled).to.equal(true)
                })
        
                it("emits Trade event", () => {
                    const log = fillOrderResult.logs[0]
                    expect(log.event).to.eq("Trade")
                    const event = log.args
                    expect(event.id.toString()).to.equal("1", "id is correct")
                    expect(event.user).to.equal(user1, "user is correct")
                    expect(event.tokenGet).to.equal(token.address, "tokenGet is correct")
                    expect(event.amountGet.toString()).to.equal(ethToWei(1).toString(), "amountGet is correct")
                    expect(event.tokenGive).to.equal(ETHER_ADDRESS, "tokenGive is correct")
                    expect(event.amountGive.toString()).to.equal(ethToWei(1).toString(), "amountGive is correct")
                    expect(event.userFill).to.equal(user2, "userFill is correct")
                    expect(event.timestamp.toString().length).to.be.at.least(1, "timestamp is present")
                })
            })
        
            describe("failure", () => {
                it("rejects invalid order ids", () => {
                    const invalidOrderId = 99999
                    expect(exchange.fillOrder(invalidOrderId, { from: user2 })).be.revertedWith(EVM_REVERT)
                })
        
                it("rejects already-filled orders", async () => {
                    // Fill the order
                    await exchange.fillOrder("1", { from: user2 })
                    // Try to fill it again
                    expect(exchange.fillOrder("1", { from: user2 })).be.revertedWith(EVM_REVERT)
                })
        
                it("rejects cancelled orders", async () => {
                    // Cancel the order
                    await exchange.cancelOrder("1", { from: user1 })
                    // Try to fill the order
                    expect(exchange.fillOrder("1", { from: user2 })).be.revertedWith(EVM_REVERT)
                })
            })
        })
    
        describe("cancelling orders", () => {
            let result
        
            describe("success", async () => {
                beforeEach(async () => {
                    result = await exchange.cancelOrder("1", { from: user1 })
                })
        
                it("updates cancelled orders", async () => {
                    const orderCancelled = await exchange.orderCancelled(1)
                    expect(orderCancelled).to.equal(true)
                })
        
                it("emits a Cancel event", () => {
                    const log = result.logs[0]
                    expect(log.event).to.eq("Cancel")
                    const event = log.args
                    expect(event.id.toString()).to.equal("1", "id is correct")
                    expect(event.user).to.equal(user1, "user is correct")
                    expect(event.tokenGet).to.equal(token.address, "tokenGet is correct")
                    expect(event.amountGet.toString()).to.equal(ethToWei(1).toString(), "amountGet is correct")
                    expect(event.tokenGive).to.equal(ETHER_ADDRESS, "tokenGive is correct")
                    expect(event.amountGive.toString()).to.equal(ethToWei(1).toString(), "amountGive is correct")
                    expect(event.timestamp.toString().length).to.be.at.least(1, "timestamp is present")
                })
            })
        
            describe("failure", () => {
                it("rejects invalid order ids", async () => {
                    const invalidOrderId = 99999
                    expect(exchange.cancelOrder(invalidOrderId, { from: user1 })).be.revertedWith(EVM_REVERT)
                })
        
                it("rejects unauthorized cancelations", async () => {
                    // Try to cancel the order from another user
                    expect(exchange.cancelOrder("1", { from: user2 })).be.revertedWith(EVM_REVERT)
                })
            })
        })
    })
    
    describe("fillOrder", () => {
        describe("Check balances after filling user1 buy Tokens order", () => {
            beforeEach(async () => {
                // user1 deposit 1 ETHER to the exchange
                await exchange.depositEther({from: user1, value: ethToWei(1)})
                // user1 create order to buy 10 tokens for 1 ETHER
                await exchange.makeOrder(token.address, ethToWei(10), ETHER_ADDRESS, ethToWei(1), {from: user1})
                // user2 gets tokens
                await token.transfer(user2, ethToWei(11), {from: owner})
                // user2 approve exchange to spend his tokensf
                await token.approve(exchange.address, ethToWei(11), {from: user2})
                // user2 deposit tokens + fee cost (1 token) to the exchange
                await exchange.depositToken(token.address, ethToWei(11), {from: user2})
                // user2 fills the order
                await exchange.fillOrder("1", {from: user2})
            })
        
            it("user1 tokens balance on exchange should eq. 10", async () => {
                expect((await exchange.balanceOf(token.address, user1)).toString()).to.equal(ethToWei(10).toString())
            })
        
            it("user1 ether balance on exchange should eq. 0", async () => {
                expect((await exchange.balanceOf(ETHER_ADDRESS, user1)).toString()).to.equal("0")
            })
        
            it("user2 tokens balance on exchange should eq. 0", async () => {
                expect((await exchange.balanceOf(token.address, user2)).toString()).to.equal("0")
            })
        
            it("user2 ether balance on exchange should eq. 1", async () => {
                expect((await exchange.balanceOf(ETHER_ADDRESS, user2)).toString()).to.equal(ethToWei(1).toString())
            })
        })
    
        describe("Check balances after filling user1 buy Ether order", () => {
            beforeEach(async () => {
                // Uuser1 Gets the 10 tokens
                await token.transfer(user1, ethToWei(10), {from: owner})
                // user1 approve exchange to spend his tokens
                await token.approve(exchange.address, ethToWei(10), {from: user1})
                // user1 approve send tokens to the exchange 
                await exchange.depositToken(token.address, ethToWei(10), {from: user1})
                // user1 create order to buy 1 Ether for 10 tokens
                await exchange.makeOrder(ETHER_ADDRESS, ethToWei(1), token.address, ethToWei(10), {from: user1})
                // user2 deposit 1 ETHER + fee cost (.1 ETH) to the exchange
                await exchange.depositEther({from: user2, value: ethToWei(1.1)})
                // user2 fills the order
                await exchange.fillOrder("1", {from: user2})
            })
        
            it("user1 tokens balance on exchange should eq. 0", async () => {
                expect((await exchange.balanceOf(token.address, user1)).toString()).to.equal("0")
            })
        
            it("user1 Ether balance on exchange should eq. 1", async () => {
                expect((await exchange.balanceOf(ETHER_ADDRESS, user1)).toString()).to.equal(ethToWei(1).toString())
            })
        
            it("user2 tokens balance on exchange should eq. 10", async () => {
                expect((await exchange.balanceOf(token.address, user2)).toString()).to.equal(ethToWei(10).toString())
            })
        
            it("user2 ether balance on exchange should eq. 0", async () => {
                expect((await exchange.balanceOf(ETHER_ADDRESS, user2)).toString()).to.equal("0")
            })
        })
    })
})