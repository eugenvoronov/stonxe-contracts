export const ethToWei = (eth) => {
    return new web3.utils.BN(
        web3.utils.toWei(eth.toString(), "ether")
    )
}

export const getAccounts = async () => {
    return web3.eth.getAccounts()
}

export const wait = (seconds) => {
    const milliseconds = seconds * 1000
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}