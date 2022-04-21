const { ethToWei } = require("./helpers")
const { ETHER_ADDRESS } = require("../scripts/addresses")
const { EVM_REVERT, TOKENS } = require("../scripts/constants")
const { expect } = require('chai');

const Cheque = artifacts.require("./Cheque")
const Token = artifacts.require("./StonxeToken")

contract("Cheque", ([owner, feeAccount, user1, user2]) => {
    let token
    let cheque
    let feePercent = 10

    beforeEach(async () => {
        token = await Token.new()
        token.transfer(user1, ethToWei(100), { from: owner })

        cheque = await Cheque.new(ETHER_ADDRESS, token.address, feeAccount, feePercent)
    })

    describe("deployment", () => {
        it("tracks the fee account", async () => {
            const result = await cheque.feeAccount()
            expect(result).to.equal(feeAccount)
        })

        it("tracks the fee percent", async () => {
            const result = await cheque.feePercent()
            expect(result.toString()).to.equal(feePercent.toString())
        })
    })


    describe("fallback", () => {
        it("revert Ether sent", async () => {
            expect(cheque.sendTransaction({ from: user1, value: 1 })).be.revertedWith(EVM_REVERT)
        })
    })

    describe("new cheque", () => {
        describe("success", () => {
            let newChequeResult

            beforeEach(async () => {
                newChequeResult = await cheque.newCheque(TOKENS.ETH, { from: user1 })
            })
            
            it("handle NewCheque event", () => {
                const log = newChequeResult.logs[0]
                expect(log.event).to.equal("NewCheque")
                const event = log.args
                expect(event.account).to.equal(ETHER_ADDRESS)
                expect(event.token.toString()).to.equal(TOKENS.ETH.toString())
                expect(event.owner).to.equal(user1)
            })
        })
    })

    describe("deactivate cheque", () => {
        const chequeId = 1

        beforeEach(async () => {
            await cheque.newCheque(TOKENS.ETH, { from: user1 })
        })

        describe("success", () => {
            let deactivateResult

            beforeEach(async () => {
                deactivateResult = await cheque.deactivate(chequeId, { from: user1 })
            })

            it ("tracks the status of the cheque", async () => {
                const isActive = await cheque.chequeInactive(chequeId)
                expect(isActive).to.equal(true)
            })

            it("handle Deactivate event", () => {
                const log = deactivateResult.logs[0]
                expect(log.event).to.equal("Deactivate")
                const event = log.args
                expect(event.id.toString()).to.equal(chequeId.toString())
            })
        })

        describe("failue", () => {
            it("cheque does not exists", async () => {
                const invalidChequeId = 999
                expect(cheque.deactivate(invalidChequeId, { from: user1 })).be.revertedWith(EVM_REVERT)
            })

            it("invalid owner of the cheque", async () => {
                expect(cheque.deactivate(chequeId, { from: user2 })).be.revertedWith(EVM_REVERT)
            })

            it("cheque already inactive", async () => {
                await cheque.deactivate(chequeId, { from: user1 })
                const isActive = await cheque.chequeInactive(chequeId)
                expect(isActive).to.equal(true)
                
                expect(cheque.deactivate(chequeId, { from: user1 })).be.revertedWith(EVM_REVERT)
            })
        })
    }) 

    describe("topup cheque with ethers", () => {
        const chequeId = 1
        const topupAmount = ethToWei(1)

        beforeEach(async () => {
            await cheque.newCheque(TOKENS.ETH, { from: user1 })
            await cheque.newCheque(TOKENS.STX, { from: user1 })
        })

        describe("success", () => {
            let topupResult

            beforeEach(async () => {
                topupResult = await cheque.topupEther(chequeId, { from: user1, value: topupAmount })
            })

            it ("tracks the ether balance of the cheque", async () => {
                const chequeBalance = await cheque.balanceOf(chequeId, { from: user1 })
                expect(chequeBalance.toString()).to.equal(topupAmount.toString())
            })

            it("handle Topup event", () => {
                const log = topupResult.logs[0]
                expect(log.event).to.equal("Topup")
                const event = log.args
                expect(event.id.toString()).to.equal(chequeId.toString())
                expect(event.account).to.equal(ETHER_ADDRESS)
                expect(event.token.toString()).to.equal(TOKENS.ETH.toString())
                expect(event.sender).to.equal(user1)
                expect(event.amount.toString()).to.equal(topupAmount.toString())
                expect(event.balance.toString()).to.equal(topupAmount.toString())
            })
        })

        describe("failue", () => {    
            it("cheque does not exists", async () => {
                const invalidChequeId = 999
                expect(cheque.topupEther(invalidChequeId, { from: user1, value: topupAmount })).be.revertedWith(EVM_REVERT)
            })

            it("invalid cheque token for topup", async () => {
                const invalidChequeId = 2
                expect(cheque.topupEther(invalidChequeId, { from: user1, value: topupAmount })).be.revertedWith(EVM_REVERT)
            })

            it("cheque already inactive", async () => {
                await cheque.deactivate(chequeId, { from: user1 })
                const isActive = await cheque.chequeInactive(chequeId)
                expect(isActive).to.equal(true)
                
                expect(cheque.topupEther(chequeId, { from: user1, value: topupAmount })).be.revertedWith(EVM_REVERT)
            })
        })
    })

    describe("topup cheque with tokens", () => {
        const chequeId = 1
        const topupAmount = ethToWei(1)

        beforeEach(async () => {
            await cheque.newCheque(TOKENS.STX, { from: user1 })
            await cheque.newCheque(TOKENS.ETH, { from: user1 })
        })

        describe("success", () => {
            let topupResult

            beforeEach(async () => {
                await token.approve(cheque.address, topupAmount, { from: user1 })
                topupResult = await cheque.topupToken(chequeId, topupAmount, { from: user1 })
            })

            it ("tracks the token balance of the cheque", async () => {
                const chequeBalance = await cheque.balanceOf(chequeId, { from: user1 })
                expect(chequeBalance.toString()).to.equal(topupAmount.toString())
            })

            it("handle Topup event", () => {
                const log = topupResult.logs[0]
                expect(log.event).to.equal("Topup")
                const event = log.args
                expect(event.id.toString()).to.equal(chequeId.toString())
                expect(event.account).to.equal(token.address)
                expect(event.token.toString()).to.equal(TOKENS.STX.toString())
                expect(event.sender).to.equal(user1)
                expect(event.amount.toString()).to.equal(topupAmount.toString())
                expect(event.balance.toString()).to.equal(topupAmount.toString())
            })
        })

        describe("failue", () => {    
            beforeEach(async () => {
                await token.approve(cheque.address, topupAmount, { from: user1 })
            })
            
            it("cheque does not exists", async () => {
                const invalidChequeId = 999
                expect(cheque.topupToken(invalidChequeId, topupAmount, { from: user1 })).be.revertedWith(EVM_REVERT)
            })

            it("invalid cheque token for topup", async () => {
                const invalidChequeId = 2
                expect(cheque.topupToken(invalidChequeId, topupAmount, { from: user1 })).be.revertedWith(EVM_REVERT)
            })

            it("cheque already inactive", async () => {
                await cheque.deactivate(chequeId, { from: user1 })
                const isActive = await cheque.chequeInactive(chequeId)
                expect(isActive).to.equal(true)
                
                expect(cheque.topupToken(chequeId, topupAmount, { from: user1 })).be.revertedWith(EVM_REVERT)
            })
        })
    })

    describe("balance of", () => {
        let firstChequeId = 1
        let secondChequeId = 2
        let topupAmount = ethToWei(1)

        beforeEach(async () => {
            await cheque.newCheque(TOKENS.ETH, { from: user1 })
            await cheque.topupEther(firstChequeId, { from: user1, value: topupAmount })

            await cheque.newCheque(TOKENS.STX, { from: user1 })
            await token.approve(cheque.address, topupAmount, { from: user1 })
            await cheque.topupToken(secondChequeId, topupAmount, { from: user1 })
        })

        describe("success", () => { 
            it ("tracks the ether balance of the cheque", async () => {
                const chequeBalance = await cheque.balanceOf(firstChequeId, { from: user1 })
                expect(chequeBalance.toString()).to.equal(topupAmount.toString())
            })

            it ("tracks the token balance of the cheque", async () => {
                const chequeBalance = await cheque.balanceOf(secondChequeId, { from: user1 })
                expect(chequeBalance.toString()).to.equal(topupAmount.toString())
            })
        })

        describe("failue", () => {
            it("invalid owner of the cheque", async () => {
                expect(cheque.balanceOf(firstChequeId, { from: user2 })).be.revertedWith(EVM_REVERT)
            })
        })
    })

    describe("withdraw cheque", () => {
        describe("with ether", () => {
            let chequeId = 1
            let amount = ethToWei(1)

            beforeEach(async () => {
                await cheque.newCheque(TOKENS.ETH, { from: user1 })
                await cheque.topupEther(chequeId, { from: user1, value: amount })
            })
            
            describe("success", () => {
                let withdrawResult
                
                beforeEach(async () => {
                    withdrawResult = await cheque.withdraw(chequeId, amount, { from: user1 })
                })

                it ("tracks the ether balance of the cheque", async () => {
                    const chequeBalance = await cheque.balanceOf(chequeId, { from: user1 })
                    expect(chequeBalance.toString()).to.equal("0")
                })

                it("handle Withdraw event", () => {
                    const log = withdrawResult.logs[0]
                    expect(log.event).to.equal("Withdraw")
                    const event = log.args
                    expect(event.id.toString()).to.equal(chequeId.toString())
                    expect(event.account).to.equal(ETHER_ADDRESS)
                    expect(event.token.toString()).to.equal(TOKENS.ETH.toString())
                    expect(event.owner).to.equal(user1)
                    expect(event.amount.toString()).to.equal(amount.toString())
                    expect(event.balance.toString()).to.equal("0")
                })
            })

            describe("failue", () => {
                it("insufficient balance", async () => {
                    let invalidAmount = ethToWei(999)
                    expect(cheque.withdraw(chequeId, invalidAmount, { from: user1 })).be.revertedWith(EVM_REVERT)
                })

                it("invalid owner", async () => {
                    expect(cheque.withdraw(chequeId, amount, { from: user2 })).be.revertedWith(EVM_REVERT)
                })
            })
        })

        describe("with token", () => {
            let chequeId = 1
            let amount = ethToWei(1)
            
            beforeEach(async () => {
                await cheque.newCheque(TOKENS.STX, { from: user1 })
                await token.approve(cheque.address, amount, { from: user1 })
                await cheque.topupToken(chequeId, amount, { from: user1 })
            })
            
            describe("success", () => {
                let withdrawResult

                beforeEach(async () => {
                    withdrawResult = await cheque.withdraw(chequeId, amount, { from: user1 })
                })

                it ("tracks the token balance of the cheque", async () => {
                    const chequeBalance = await cheque.balanceOf(chequeId, { from: user1 })
                    expect(chequeBalance.toString()).to.equal("0")
                })

                it("handle Withdraw event", () => {
                    const log = withdrawResult.logs[0]
                    expect(log.event).to.equal("Withdraw")
                    const event = log.args
                    expect(event.id.toString()).to.equal(chequeId.toString())    
                    expect(event.account).to.equal(token.address)
                    expect(event.token.toString()).to.equal(TOKENS.STX.toString())
                    expect(event.owner).to.equal(user1)
                    expect(event.amount.toString()).to.equal(amount.toString())
                    expect(event.balance.toString()).to.equal("0")
                })
            })

            describe("failue", () => {
                it("insufficient balance", async () => {
                    let invalidAmount = ethToWei(999)
                    expect(cheque.withdraw(chequeId, invalidAmount, { from: user1 })).be.revertedWith(EVM_REVERT)
                })

                it("invalid owner", async () => {
                    expect(cheque.withdraw(chequeId, amount, { from: user2 })).be.revertedWith(EVM_REVERT)
                })
            })
        })
    })
})