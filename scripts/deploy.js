// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require('hardhat');

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether');
};

async function main() {
  // Setup accounts
  const [buyer, seller, inspector, lender] = await hre.ethers.getSigners();

  console.log(`Accounts used:
    Buyer: ${buyer.address}
    Seller: ${seller.address}
    Inspector: ${inspector.address}
    Lender: ${lender.address}
  `);

  // Deploy Real Estate
  const RealEstate = await ethers.getContractFactory('RealEstate');
  const realEstate = await RealEstate.deploy();
  await realEstate.deployed();

  console.log(`Deployed Real Estate Contract at: ${realEstate.address}`);
  console.log(`Minting 3 properties...\n`);

  for (let i = 0; i < 3; i++) {
    const transaction = await realEstate
      .connect(seller)
      .mint(
        `https://ipfs.io/ipfs/QmdMW4iyq6zs1j2DCQ1o73fg3EYKhkZJZ7HF7JjZTStJSJ/${
          i + 1
        }.json`
      );
    await transaction.wait();
  }

  // Deploy Escrow
  const Escrow = await ethers.getContractFactory('Escrow');
  const escrow = await Escrow.deploy(
    realEstate.address,
    seller.address,
    inspector.address,
    lender.address
  );
  await escrow.deployed();

  console.log(`Deployed Escrow Contract at: ${escrow.address}`);
  console.log(`Listing 3 properties...\n`);

  for (let i = 0; i < 3; i++) {
    // Approve properties...
    let transaction = await realEstate
      .connect(seller)
      .approve(escrow.address, i + 1);
    await transaction.wait();
  }

  // Listing properties...
  let transaction = await escrow
    .connect(seller)
    .list(1, buyer.address, tokens(0.01), tokens(0.01));
  await transaction.wait();

  transaction = await escrow
    .connect(seller)
    .list(2, buyer.address, tokens(0.02), tokens(0.01));
  await transaction.wait();

  transaction = await escrow
    .connect(seller)
    .list(3, buyer.address, tokens(0.03), tokens(0.01));
  await transaction.wait();

  console.log(`Finished.`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
