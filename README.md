# Stonxe contracts 

This repository contains smart contracts that implement several features. All features have `in progress` status

## Contracts

### Cheque 
Cheques allow users to hold, exchange and sharing coins. Each cheque has its own owner. Also, using the Uniswap integration tools, it is possible to change the coin of your cheque to another one (In progress). 

### Exchange
A simple coin exchange. Allows users to exchange coins at their set price.

### Oracle
Allows exchanges to get current exchange rates for currency pairs.

### Swap 
Flash swaps implementation

### Mocks 
In progress

## Installation and Setup

### 1. Install [Node.js](https://nodejs.org/en/), if you haven't already.

### 2. Clone This Repo
Run the following command.
```console
git clone https://github.com/voronovege/stonxe-contracts.git
```

## Quickstart
### 1. Setup Environment Variables
You'll need an HARDHAT_FORK_API_URL environment variable. You can use Alchemy. You can get one from [Alchemy website](https://alchemy.com) for free.

Then, you can create a .env file with the following.

```
HARDHAT_FORK_API_URL='<your-own-alchemy-mainnet-rpc-url>'
```

### 2. Install Dependencies
Run the following command.
```console
npm install
```

### 3. Compile Smart Contracts
Run the following command.
```console
npm run compile
```

## 4. Test smart contracts
```console
npm test
```

