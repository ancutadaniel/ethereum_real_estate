const hre = require('hardhat');

// Testing the getSigners() function from ethers.js
async function main() {
  const [buyer, seller, inspector, lender] = await hre.ethers.getSigners();

  console.log(`Accounts used:
    Buyer: ${buyer.address}
    Seller: ${seller.address}
    Inspector: ${inspector.address}
    Lender: ${lender.address}
  `);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
