import { join } from "path";
import { readFileSync } from "fs";
import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, Token } from "@solana/spl-token";
import { TokenStaking } from "../target/types/token_staking";
import { assert } from "chai";

describe("token-staking", () =>
{
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.TokenStaking as Program<TokenStaking>;

  const WALLET_PATH = join(process.env["HOME"]!, ".config/solana/id.json");

  console.log("wallet path", WALLET_PATH);
  const admin = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(readFileSync(WALLET_PATH, { encoding: "utf-8" })))
  );
  const userPK = Keypair.generate();
  const pool = Keypair.generate(); 
  const user = Keypair.generate();

  let token: Token;
  let adminTokenAccount: PublicKey;
  let userTokenAccount: PublicKey;

  before(async () =>
  {
    // await provider.connection.confirmTransaction(
    //   await provider.connection.requestAirdrop(
    //     userPK.publicKey,
    //     10 * LAMPORTS_PER_SOL
    //   ),
    //   "confirmed"
    // );

    token = await Token.createMint(
      provider.connection,
      admin,
      admin.publicKey,
      null,
      9,
      TOKEN_PROGRAM_ID
    );

    adminTokenAccount = await token.createAccount(admin.publicKey);
    userTokenAccount = await token.createAccount(userPK.publicKey);

    await token.mintTo(userTokenAccount, admin.publicKey, [admin], 1e10);
  });

  it("Initialize", async () =>
  {
    let _adminTokenAccount = await token.getAccountInfo(adminTokenAccount);
    assert.strictEqual(_adminTokenAccount.amount.toNumber(), 0);

    const tx = await program.methods
      .initialize(new BN(1), new BN(1e10))
      .accounts({
        admin: admin.publicKey,
        poolInfo: pool.publicKey,
        stakingToken: token.publicKey,
        adminStakingWallet: adminTokenAccount,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin, pool])
      .rpc();
    console.log("Tx Sig", tx);
  });

  // it("Stake", async () =>
  // {
  //   let _userTokenAccount = await token.getAccountInfo(userTokenAccount);
  //   assert.strictEqual(_userTokenAccount.amount.toNumber(), 1e10);

  //   const tx = await program.methods
  //     .stake(new BN(1e10))
  //     .accounts({
  //       user: userPK.publicKey,
  //       admin: admin.publicKey,
  //       userInfo: user.publicKey,
  //       userStakingWallet: userTokenAccount,
  //       adminStakingWallet: adminTokenAccount,
  //       stakingToken: token.publicKey,
  //       tokenProgram: TOKEN_PROGRAM_ID,
  //       systemProgram: SystemProgram.programId,
  //     })
  //     .signers([userPK, user])
  //     .rpc();
  //   console.log("Tx Sig", tx);

  //   let _adminTokenAccount = await token.getAccountInfo(adminTokenAccount);
  //   assert.strictEqual(_adminTokenAccount.amount.toNumber(), 1e10);
  // });

  // it("Claim Reward", async () =>
  // {
  //   let _adminTokenAccount = await token.getAccountInfo(adminTokenAccount);
  //   assert.strictEqual(_adminTokenAccount.amount.toNumber(), 1e10);

  //   const tx = await program.methods
  //     .claimReward()
  //     .accounts({
  //       user: userPK.publicKey,
  //       admin: admin.publicKey,
  //       userInfo: user.publicKey,
  //       userStakingWallet: userTokenAccount,
  //       adminStakingWallet: adminTokenAccount,
  //       stakingToken: token.publicKey,
  //       tokenProgram: TOKEN_PROGRAM_ID,
  //     })
  //     .rpc();
  //   console.log("Tx Sig", tx);

  //   let _userTokenAccount = await token.getAccountInfo(userTokenAccount);
  //   assert.strictEqual(_userTokenAccount.amount.toNumber(), 1);
  // });

  // it("Unstake", async () =>
  // {
  //   let _adminTokenAccount = await token.getAccountInfo(adminTokenAccount);
  //   assert.strictEqual(_adminTokenAccount.amount.toNumber(), 1e10);

  //   const tx = await program.methods
  //     .unstake()
  //     .accounts({
  //       user: userPK.publicKey,
  //       admin: admin.publicKey,
  //       userInfo: user.publicKey,
  //       userStakingWallet: userTokenAccount,
  //       adminStakingWallet: adminTokenAccount,
  //       stakingToken: token.publicKey,
  //       tokenProgram: TOKEN_PROGRAM_ID,
  //     })
  //     .rpc();
  //   console.log("Tx Sig", tx);

  //   let _userTokenAccount = await token.getAccountInfo(userTokenAccount);
  //   assert.strictEqual(_userTokenAccount.amount.toNumber(), 1e10 + 2);
  // });
});