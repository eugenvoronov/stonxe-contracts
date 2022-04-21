import { network, ethers } from "hardhat";

export const ethToWei = (eth) => {
    return new web3.utils.BN(
        web3.utils.toWei(eth.toString(), "ether")
    )
}

async function impersonateAccount(account) {
    return network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [account],
    });
}
  
async function stopImpersonatingAccount(account) {
    return network.provider.request({
        method: 'hardhat_stopImpersonatingAccount',
        params: [account],
    });
}

export const fund = async (
	contract, sender, recepient, amount
) => {
	const FUND_AMOUNT = ethers.utils.parseUnits(amount, 18)
	const MrWhale = await ethers.getSigner(sender)

	const contractSigner = contract.connect(MrWhale)
	await contractSigner.transfer(recepient, FUND_AMOUNT)

}

export const impersonateFund = async(
	contract, sender, recepient, amount
) => {
    await impersonateAccount(sender)
	await fund(contract, sender, recepient, amount)
    await stopImpersonatingAccount(sender)
}