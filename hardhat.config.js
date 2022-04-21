require('babel-register');
require('babel-polyfill');
require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")
require("@nomiclabs/hardhat-ethers")
require('@nomiclabs/hardhat-truffle5');

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});


task("balance", "Prints an account's balance")
	.addParam("account", "The account's address")
	.setAction(async (taskArgs, { ethers }) => {
		const account = ethers.utils.getAddress(taskArgs.account)
		const provider = ethers.provider;
		const balance = await provider.getBalance(account)

		console.log(account, ethers.utils.formatEther(balance), "ETH")
	})


module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    local: {
        url: "http://localhost:7545"
    },
    hardhat: {
      forking: {
        url: process.env.HARDHAT_FORK_API_URL,
        blockNumber: 10541200
      },
    },
  },
  solidity: {
    version: "0.7.6"
  },
  mocha: {
    timeout: 200000
  }
};
