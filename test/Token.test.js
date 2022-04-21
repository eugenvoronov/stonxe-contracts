const Token = artifacts.require("./StonxeToken")
import { ethToWei } from './helpers'
import { EVM_REVERT } from '../scripts/constants'

const { expect } = require('chai');

contract("StonxeToken", ([owner, receiver, exchange]) => {
    let token
    const name = 'Stonxe'
    const symbol = 'STX'
    const decimals = '18'
    const totalSupply = ethToWei(10000000)

    beforeEach(async () => {
        token = await Token.new() 
    })

    describe("deployment", () => {
        it("tracks the name", async () => {
            const result = await token.name();
            expect(result).to.equal(name)
        })

        it("tracks the symbol", async () => {
            const result = await token.symbol();
            expect(result).to.equal(symbol)
        })

        it("tracks the decimals", async () => {
            const result = await token.decimals()
            expect(result.toString()).to.equal(decimals)
        })

        it("tracks the total supply", async () => {
            const result = await token.totalSupply()
            expect(result.toString()).to.equal(totalSupply.toString())
        })

        it("assign total supply to the owner\'s balance", async () => {
            const balance = await token.balances(owner)
            expect(balance.toString()).to.equal(totalSupply.toString())
        })
    })

    describe("balances", () => {
        it("gets the balance of the specified address", async () => {
            const balance = await token.balanceOf(owner)
            expect(balance.toString()).to.equal(totalSupply.toString())
        })
    })

    describe("token\'s transfer", () => {
        let transferAmount = ethToWei(100)
        let transferResult

        describe("success", () => {

            beforeEach(async () => {
                transferResult = await token.transfer(receiver, transferAmount, { from: owner })
            })

            it("transfers token balances", async () => {
                let ownerBalance = await token.balances(owner)
                console.log("Owner balance before transfer: ", ownerBalance.toString())

                let receiverBalance = await token.balances(receiver)
                console.log("Receiver balance before transfer: ", receiverBalance.toString())

                ownerBalance = await token.balances(owner)
                expect(ownerBalance.toString()).to.equal(ethToWei(9999900).toString())
                console.log("Owner balance after transfer: ", ownerBalance.toString())

                receiverBalance = await token.balances(receiver)
                console.log("Receiver balance after transfer: ", receiverBalance.toString())
                expect(receiverBalance.toString()).to.equal(ethToWei(100).toString())
            });

            it("handle transfer event", () => {
                const log = transferResult.logs[0]
                expect(log.event).to.eq("Transfer")
                const event = log.args
                expect(event.from.toString()).to.equal(owner, "from is correct")
                expect(event.to).to.equal(receiver, "to is correct")
                expect(event.value.toString()).to.equal(transferAmount.toString(), "value is correct")
            })
        })

        describe("failure", () => {
            it("rejects insufficient balances", async () => {
                let invalidAmount
                invalidAmount = ethToWei(100000000) 
                expect(token.transfer(receiver, invalidAmount, { from: owner })).be.revertedWith(EVM_REVERT)
        
                invalidAmount = ethToWei(10)
                expect(token.transfer(owner, invalidAmount, { from: receiver })).be.revertedWith(EVM_REVERT)
            })
      
            it("rejects invalid recipients", () => {
                expect(token.transfer(0x0, transferAmount, { from: owner })).to.be.reverted
            })
        })
    })

    describe("approving tokens", () => {
        let allowedAmount
        let approveResult

        beforeEach(async () => {
            allowedAmount = ethToWei(100)
            approveResult = await token.approve(exchange, allowedAmount, { from: owner })
        }) 

        describe("success", () => {
            it("allocates an allowance for delegated token spending on exchange", async () => {
                const amount = await token.allowance(owner, exchange)
                expect(amount.toString()).to.equal(allowedAmount.toString())
            })

            it("handle approval event", () => {
                const log = approveResult.logs[0]
                expect(log.event).to.eq("Approval")
                const event = log.args
                expect(event.owner.toString()).to.equal(owner, "owner is correct")
                expect(event.spender).to.equal(exchange, "spender is correct")
                expect(event.value.toString()).to.equal(allowedAmount.toString(), "value is correct")
            })
        })

        describe("success", () => {
            it("rejects invalid spenders", () => {
                expect(token.approve(0x0, allowedAmount, { from: owner })).to.be.reverted
            })
        })
    })

    describe("delegated token\'s transfer", () => {
        let allowedAmount;
        let approveResult;

        beforeEach(async () => {
            allowedAmount = ethToWei(100);
            approveResult = await token.approve(exchange, allowedAmount, { from: owner })
        })

        describe("success", () => {
            let transferResult;

            beforeEach(async () => {
                transferResult = await token.transferFrom(owner, receiver, allowedAmount, { from: exchange })
            })

            it("transfers token balances", async () => {
                const ownerBalance = await token.balanceOf(owner)
                expect(ownerBalance.toString()).to.equal(ethToWei(9999900).toString())

                const receiverBalance = await token.balanceOf(receiver)
                expect(receiverBalance.toString()).to.equal(ethToWei(100).toString())
            })

            it("resets the allowance", async () => {
                const allowance = await token.allowance(owner, exchange);
                expect(allowance.toString()).to.equal("0")
              })
        

            it("emits a Transfer event", () => {
                const log = transferResult.logs[0]
                expect(log.event).to.eq("Transfer")
                const event = log.args
                expect(event.from.toString()).to.equal(owner, "from is correct")
                expect(event.to).to.equal(receiver, "to is correct")
                expect(event.value.toString()).to.equal(allowedAmount.toString(), "value is correct")
            })
        })

        describe("failure", () => {
            it("rejects insufficient amounts", () => {
                const invalidAmount = ethToWei(100000000)
                expect(token.transferFrom(owner, receiver, invalidAmount, { from: exchange })).be.revertedWith(EVM_REVERT)
            })
        
            it("rejects invalid recipients", () => {
                expect(token.transferFrom(owner, 0x0, allowedAmount, { from: exchange })).to.be.reverted
            })
        })
    })
})