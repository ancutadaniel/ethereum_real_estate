require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config({ path: './.env' });

task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const MNEMONIC = process.env.MNEMONIC;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: '0.8.9',
  networks: {
    localhost: {
      accounts: {
        mnemonic: MNEMONIC,
      },
    },
    goerli: {
      url: `https://eth-goerli.alchemyapi.io/v2/${ALCHEMY_API_KEY}`,
      accounts: {
        mnemonic: MNEMONIC,
      },
    },
  },
};
