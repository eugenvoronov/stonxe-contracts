const RINKEBY = 'rinkeby'
const GOERLI = 'goerli'
const AVALANCHE = 'avalanche'

const networks = {
    rinkeby: {
        etheriumSubgraphUrl: `https://api.thegraph.com/subgraphs/name/stonxe/etherium-${RINKEBY}`,
        uniswapSubgraphUrl: `https://api.thegraph.com/subgraphs/name/stonxe/uniswap-${RINKEBY}`,
        oracle: {
            contractAddress: process.env.RINKEBY_ORACLE_CONTRACT_ADDRESS
        },
        stonxeToken: {
            contractAddres: process.env.RINKEBY_STONXE_TOKEN_CONTRACT_ADDRESS
        },
        url: `${process.env.RINKEBY_URL}${process.env.INFURA_API_KEY}`
    },
    goerli: {
        etheriumSubgraphUrl: `https://api.thegraph.com/subgraphs/name/stonxe/etherium-${GOERLI}`,
        uniswapSubgraphUrl: `https://api.thegraph.com/subgraphs/name/stonxe/uniswap-${GOERLI}`,
        oracle: {
            contractAddress: process.env.GOERLI_ORACLE_CONTRACT_ADDRESS
        },
        stonxeToken: {
            contractAddres: process.env.GOERLI_STONXE_TOKEN_CONTRACT_ADDRESS
        },
        url: `${process.env.GOERLI_URL}${process.env.INFURA_API_KEY}`
    },
    avalanche: {
        etheriumSubgraphUrl: `https://api.thegraph.com/subgraphs/name/stonxe/etherium-${AVALANCHE}`,
        uniswapSubgraphUrl: `https://api.thegraph.com/subgraphs/name/stonxe/uniswap-${AVALANCHE}`,
        oracle: {
            contractAddress: process.env.AVALANCHE_ORACLE_CONTRACT_ADDRESS
        },
        stonxeToken: {
            contractAddres: process.env.AVALANCHE_STONXE_TOKEN_CONTRACT_ADDRESS
        },
        url: process.env.AVALANCHE_URL
    }
}

module.exports = {
    networks
}