const { getNamedAccounts, deployments, ethers } = require("hardhat");
const { expect } = require("chai");

let firstAccount;
let nft;
let wnft;
let nftPoolLockandRelease;
let nftPoolBurnandMine;
let chainSelector;
let ccipSimulator;

before(async function () {
  firstAccount = (await getNamedAccounts()).firstAccount;
  await deployments.fixture(["all"]);
  nft = await ethers.getContract("MyToken", firstAccount);
  wnft = await ethers.getContract("WrappedMyToken", firstAccount);
  nftPoolLockandRelease = await ethers.getContract(
    "NFTPoolLockandRelease",
    firstAccount
  );
  nftPoolBurnandMine = await ethers.getContract(
    "NFTPoolBurnandMine",
    firstAccount
  );
  ccipSimulator = await ethers.getContract("CCIPLocalSimulator", firstAccount);
  chainSelector = (await ccipSimulator.configuration()).chainSelector_;
});

describe("test if the nft can be minted successfully", async function () {
  it("test if the owner of nft is minter", async function () {
    // get nft
    await nft.safeMint(firstAccount);
    // check the owner
    const ownerOfNft = await nft.ownerOf(0);
    expect(ownerOfNft).to.equal(firstAccount);
  });
  it("test if user can lock the nft in the pool and send ccip message on source chain", async function () {
    await nft.approve(nftPoolLockandRelease.target, 0);
    await ccipSimulator.requestLinkFromFaucet(
      nftPoolLockandRelease,
      ethers.parseEther("10")
    );
    await nftPoolLockandRelease.lockAndSendNFT(
      0,
      firstAccount,
      chainSelector,
      nftPoolBurnandMine.target
    );
    const owner = await nft.ownerOf(0);
    expect(owner).to.equal(nftPoolLockandRelease);
  });
  it("test if user can get a wappednft in the dest chain", async function () {
    const owner = await wnft.ownerOf(0);
    expect(owner).to.equal(firstAccount);
  });
});

describe("dest chain->source cahin test", async function () {
  it("test if user can bun the wnft and send ccip message on dest chain", async function () {
    await wnft.approve(nftPoolBurnandMine.target, 0);
    await ccipSimulator.requestLinkFromFaucet(
      nftPoolBurnandMine,
      ethers.parseEther("10")
    );
    await nftPoolBurnandMine.burnAndSendNFT(
      0,
      firstAccount,
      chainSelector,
      nftPoolLockandRelease.target
    );
    const totalSupply = await wnft.totalSupply();
    expect(totalSupply).to.equal(0);
  });
  it("test if user have the nft unlock on source chain", async function () {
    const newowner = await nft.ownerOf(0);
    console.log(newowner, firstAccount);
    expect(newowner).to.equal(firstAccount);
  });
});
