import * as anchor from "@coral-xyz/anchor";
import { Program, utils, BN } from "@coral-xyz/anchor";
import { Staking } from "../target/types/staking";
import {PublicKey} from "@solana/web3.js";
import * as token from "@solana/spl-token";

//constants
const collectionAddress = new PublicKey(""); // Mint Address of the Collection NFT for which the staking to be activated
const tokenMint = new PublicKey(""); // Mint of the Token to be given as reward
const tokenAccount = new PublicKey(""); // Token account for the reward token

// NFT of the collection - must be owned by the Signer
const nftMint = new PublicKey("");
const nftToken = new PublicKey("");
const nftMetadata = new PublicKey("")
const nftEdition = new PublicKey("");

anchor.setProvider(anchor.AnchorProvider.env());

const program = anchor.workspace.Staking as Program<Staking>;
const programId = program.programId;

const [stakeDetails] = PublicKey.findProgramAddressSync([
    utils.bytes.utf8.encode("STAKE"),
    collectionAddress.toBytes(),
    program.provider.publicKey.toBytes()
], programId);

const [tokenAuthority] = PublicKey.findProgramAddressSync([
    utils.bytes.utf8.encode("TOKEN_AUTHORITY"),
    stakeDetails.toBytes()
], programId);

const [nftAuthority] = PublicKey.findProgramAddressSync([
    utils.bytes.utf8.encode("NFT_AUTHORITY"),
    stakeDetails.toBytes()
], programId);

const [nftRecord] = PublicKey.findProgramAddressSync([
    utils.bytes.utf8.encode("NFT_RECORD"),
    stakeDetails.toBytes(),
    nftMint.toBytes()
], programId);

const nftCustody = token.getAssociatedTokenAddressSync(nftMint, nftAuthority, true);

describe("staking", () => {
  it("initializes staking", async() => {
    const minimumPeriod = new BN(0);
    const reward = new BN(100);

    const tx = await program.methods.initStaking(
      reward,
      minimumPeriod
    )
    .accounts({
      stakeDetails,
      tokenMint,
      tokenAuthority,
      collectionAddress,
      nftAuthority
    })
    .rpc();

    console.log("tx: ", tx);

    let stakeAccount = await program.account.details.fetch(stakeDetails);
    console.log(stakeAccount);
  });

  it("stakes NFT", async() => {
    const tx = await program.methods.stake()
    .accounts({
      stakeDetails,
      nftRecord,
      nftMint,
      nftToken,
      nftMetadata,
      nftAuthority,
      nftEdition,
      nftCustody,
    })
    .rpc()

    console.log("tx: ", tx);

    let stakeAccount = await program.account.details.fetch(stakeDetails);
    let nftRecordAccount = await program.account.nftRecord.fetch(nftRecord);

    console.log("Stake Details: ", stakeAccount);
    console.log("NFT Record: ", nftRecordAccount);
  });

  it("claims rewards without unstaking", async() => {
    let nftRecordAccount = await program.account.nftRecord.fetch(nftRecord);
    console.log("NFT Staked at: ", nftRecordAccount.stakedAt.toNumber());

    const tx = await program.methods.withdrawReward()
    .accounts({
      stakeDetails,
      nftRecord,
      rewardMint: tokenMint,
      rewardReceiveAccount: tokenAccount,
      tokenAuthority            
    })
    .rpc()

    console.log("tx: ", tx);


    nftRecordAccount = await program.account.nftRecord.fetch(nftRecord);
    console.log("NFT Staked at: ", nftRecordAccount.stakedAt.toNumber());
  });

  it("claims rewards and unstakes", async() => {
    let nftRecordAccount = await program.account.nftRecord.fetch(nftRecord);
    console.log("NFT Staked at: ", nftRecordAccount.stakedAt.toNumber());

    const tx = await program.methods.unstake()
    .accounts({
      stakeDetails,
      nftRecord,
      rewardMint: tokenMint,
      rewardReceiveAccount: tokenAccount,
      tokenAuthority,
      nftAuthority,
      nftCustody,
      nftMint,
      nftReceiveAccount: nftToken         
    })
    .rpc()

    console.log("tx: ", tx);
  });

  it("closes staking", async() => {
    const tx = await program.methods.closeStaking()
    .accounts({
      stakeDetails,
      tokenMint,
      tokenAuthority       
    })
    .rpc()

    console.log("tx: ", tx);
  });
});