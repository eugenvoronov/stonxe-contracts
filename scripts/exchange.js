const Token = artifacts.require("./StonxeToken")
const Exchange = artifacts.require("./Exchange")
const { ETHER_ADDRESS } = require("../scripts/addresses")

const ethToWei = (eth) => {
    return new web3.utils.BN(
        web3.utils.toWei(eth.toString(), "ether")
    )
}

const getAccounts = async () => {
    return web3.eth.getAccounts()
}

const wait = (seconds) => {
    const milliseconds = seconds * 1000
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

module.exports = async (callback) => {
    try {
        const token = await Token.deployed()
        console.log("Token address: ", token.address)

        const exchange = await Exchange.deployed()
        console.log("Exchange address: ", exchange.address)

        const accounts = await getAccounts();

        const user1 = accounts[0]
        const user2 = accounts[1]
        let amount = ethToWei(10000)
        console.log(123, user2, user1, amount)

        /**
         //Deposit users accounts
         */

        // Give tokens to user2
        await token.transfer(user2, amount, { from: user1 })
        console.log(`Transferred ${amount} tokens from user1 ${user1} to user2 ${user2}`)

        // user1 deposits ether
        amount = ethToWei(1)
        await exchange.depositEther({ from: user1, value: amount })
        console.log(`Deposited ${amount} Ether from user1 ${user1}`)

        // user2 approves tokens
        amount = ethToWei(10000)
        await token.approve(exchange.address, amount, { from: user2 })
        console.log(`Approved ${amount} tokens from user2 ${user2}`)

        // user2 deposits tokens
        await exchange.depositToken(token.address, amount, { from: user2 })
        console.log(`Deposited ${amount} tokens from user2 ${user2}`)

        /**
         //Seed a cancelled order
         */

        // user1 makes order to get tokens
        let result, orderId
        let amountGet = ethToWei(100), amountGive = ethToWei(0.1)

        result = await exchange.makeOrder(token.address, amountGet, ETHER_ADDRESS, amountGive, { from: user1 })
        console.log(`Made order from user1 ${user1}`)

        // user1 cancells order
        orderId = result.logs[0].args.id
        await exchange.cancelOrder(orderId, { from: user1 })
        console.log(`Cancelled order from user1 ${user1}`)

        /**
         //Seed filled orders
         */

        // User 1 makes order
        result = await exchange.makeOrder(token.address, amountGet, ETHER_ADDRESS, amountGive, { from: user1 })
        console.log(`Made order from ${user1}`)

        // user2 fills order
        orderId = result.logs[0].args.id
        await exchange.fillOrder(orderId, { from: user2 })
        console.log(`Filled order from ${user1}`)

        await wait(1)

        // user1 makes another order
        amountGet = ethToWei(50), amountGive = ethToWei(0.01)
        result = await exchange.makeOrder(token.address, amountGet, ETHER_ADDRESS, amountGive, { from: user1 })
        console.log(`Made order from user1 ${user1}`)

        // user2 fills another order
        orderId = result.logs[0].args.id
        await exchange.fillOrder(orderId, { from: user2 })
        console.log(`Filled order from user1 ${user1}`)

        await wait(1)

        // user1 makes final order
        amountGet = ethToWei(200), amountGive = ethToWei(0.15)
        result = await exchange.makeOrder(token.address, amountGet, ETHER_ADDRESS, amountGive, { from: user1 })
        console.log(`Made order from user1 ${user1}`)

        // user2 fills final order
        orderId = result.logs[0].args.id
        await exchange.fillOrder(orderId, { from: user2 })
        console.log(`Filled order from user1 ${user1}`)

        await wait(1)

        /**
         //Seed make multiple orders
         */

        // user1 makes 10 orders
        for (let i = 1; i <= 10; i++) {
            amountGet = ethToWei(10 * i), amountGive = ethToWei(0.01)
            result = await exchange.makeOrder(token.address, amountGet, ETHER_ADDRESS, amountGive, { from: user1 })
            console.log(`Made order from ${user1}`)
            
            await wait(1)
        }

        // user2 makes 10 orders
        for (let i = 1; i <= 10; i++) {
            amountGet = ethToWei(0.01), amountGive = ethToWei(10 * i)
            result = await exchange.makeOrder(ETHER_ADDRESS, amountGet, token.address, amountGive, { from: user2 })
            console.log(`Made order from ${user2}`)

            await wait(1)
        }
    } catch (e) {
        console.log(e)
    }
    
    callback()
}