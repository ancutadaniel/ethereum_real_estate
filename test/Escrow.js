const { ethers } = require('hardhat');
const { expect } = require('chai');

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether');
};

describe('Escrow', () => {
  let buyer, seller, inspector, lender;
  let realEstate, escrow;

  beforeEach(async () => {
    // Setup accounts
    [buyer, seller, inspector, lender] = await ethers.getSigners();
    // Deploy Real Estate
    const RealEstate = await ethers.getContractFactory('RealEstate');
    realEstate = await RealEstate.deploy();

    // Mint
    let tx = await realEstate
      .connect(seller)
      .mint(
        'https://ipfs.io/ipfs/QmQVcpsjrA6cr1iJjZAodYwmPekYgbnXGo4DFubJiLc2EB/1.json'
      );
    await tx.wait();
    // Deploy Escrow
    const Escrow = await ethers.getContractFactory('Escrow');
    escrow = await Escrow.deploy(
      realEstate.address,
      seller.address,
      inspector.address,
      lender.address
    );
    // Approve
    tx = await realEstate.connect(seller).approve(escrow.address, 1);
    await tx.wait();
    // List
    tx = await escrow
      .connect(seller)
      .list(1, buyer.address, tokens(20), tokens(10));
    await tx.wait();
  });

  describe('Deployment', () => {
    it('should return the NFT address', async () => {
      expect(await escrow.nftAddress()).to.be.equal(realEstate.address);
    });
    it('should return the seller address', async () => {
      expect(await escrow.seller()).to.be.equal(seller.address);
    });
    it('should return the inspector address', async () => {
      expect(await escrow.inspector()).to.be.equal(inspector.address);
    });
    it('should return the lender address', async () => {
      expect(await escrow.lender()).to.be.equal(lender.address);
    });
  });

  describe('Listing', () => {
    it('should transfer the NFT to the Escrow contract', async () => {
      // Check owner of NFT
      expect(await realEstate.ownerOf(1)).to.be.equal(escrow.address);
    });
    it('should set the NFT as listed', async () => {
      // Check if NFT is listed
      expect(await escrow.isListed(1)).to.be.true;
    });
    it('should set the correct buyer address', async () => {
      // Check buyer address
      expect(await escrow.buyer(1)).to.be.equal(buyer.address);
    });
    it('should set the correct price', async () => {
      // Check price
      expect(await escrow.purchasePrice(1)).to.be.equal(tokens(20));
    });
    it('should set the correct deposit', async () => {
      // Check deposit
      expect(await escrow.escrowAmount(1)).to.be.equal(tokens(10));
    });

    it('should reject if the sender is not the seller', async () => {
      // List (should fail) - buyer is not the seller
      await expect(
        escrow.connect(buyer).list(1, buyer.address, tokens(20), tokens(10))
      ).to.be.revertedWith('Only seller can call this function');
    });
    it('should reject if the NFT is already listed', async () => {
      // List (should fail) - NFT is already listed
      await expect(
        escrow.connect(seller).list(1, buyer.address, tokens(20), tokens(10))
      ).to.be.revertedWith('NFT is already listed');
    });
  });

  describe('Deposits', () => {
    it('should deposit earnest', async () => {
      // Deposit earnest
      let tx = await escrow
        .connect(buyer)
        .depositEarnest(1, { value: tokens(10) });
      await tx.wait();
      // Check balance
      expect(await escrow.getBalance()).to.be.equal(tokens(10));
    });

    it('should reject if the sender is not the buyer', async () => {
      // Deposit earnest (should fail) - buyer is not the buyer
      await expect(
        escrow.connect(seller).depositEarnest(1, { value: tokens(10) })
      ).to.be.revertedWith('Only buyer can call this function');
    });

    it('should reject if the deposit is not correct', async () => {
      // Deposit earnest (should fail) - deposit is not correct
      await expect(
        escrow.connect(buyer).depositEarnest(1, { value: tokens(5) })
      ).to.be.revertedWith('Deposit amount is incorrect');
    });
  });

  describe('Inspection', () => {
    it('should update the inspection status', async () => {
      // Update inspection status
      let tx = await escrow.connect(inspector).updateInspectionStatus(1, true);
      await tx.wait();
      // Check inspection status
      expect(await escrow.inspectionPassed(1)).to.be.true;
    });

    it('should reject if the sender is not the inspector', async () => {
      // Inspect (should fail) - buyer is not the inspector
      await expect(
        escrow.connect(buyer).updateInspectionStatus(1, false)
      ).to.be.revertedWith('Only inspector can call this function');
    });
  });

  describe('Approval', () => {
    it('should approve the sale', async () => {
      let tx = await escrow.connect(buyer).approveSale(1);
      await tx.wait();
      tx = await escrow.connect(seller).approveSale(1);
      await tx.wait();
      tx = await escrow.connect(lender).approveSale(1);
      await tx.wait();
      // Check approval status
      expect(await escrow.approval(1, buyer.address)).to.be.true;
      expect(await escrow.approval(1, seller.address)).to.be.true;
      expect(await escrow.approval(1, lender.address)).to.be.true;
    });
  });

  describe('Sale', () => {
    let tx;
    beforeEach(async () => {
      // Deposit earnest
      tx = await escrow.connect(buyer).depositEarnest(1, { value: tokens(10) });
      await tx.wait();

      // Update inspection status
      tx = await escrow.connect(inspector).updateInspectionStatus(1, true);
      await tx.wait();
      // Approve
      tx = await escrow.connect(buyer).approveSale(1);
      await tx.wait();
      tx = await escrow.connect(seller).approveSale(1);
      await tx.wait();
      tx = await escrow.connect(lender).approveSale(1);
      await tx.wait();

      // Send funds from lender to escrow
      tx = await lender.sendTransaction({
        to: escrow.address,
        value: tokens(10),
      });
      await tx.wait();

      // Check balance
      tx = await escrow.connect(seller).finalizeSale(1);
      await tx.wait();
    });

    it('should have no balance on escrow', async () => {
      // Check balance
      expect(await escrow.getBalance()).to.be.equal(0);
    });

    it('should transfer the NFT to the buyer', async () => {
      // Check owner of NFT
      expect(await realEstate.ownerOf(1)).to.be.equal(buyer.address);
    });
  });
});
