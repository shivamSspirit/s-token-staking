# How Mint and Transfer Tokens and NFTs (under Token-NFT Mint-Transfer)

## Step 1 - Project Setup
Create a new anchor project using `anchor init [project_name]`, paste the following dependencies under Corgo.toml
```
[dependencies]
anchor-lang = {version = "0.28.0", features = ["init-if-needed"]}
anchor-spl = { version = "0.28.0", features = ["metadata"] }
mpl-token-metadata = "1.13.1"
ahash = "=0.8.4"
```
Then open Anchor.toml and change cluster to `Devnet`

## Step 2 - Imports
Open `lib.rs`, and paste in the following imports
```
use anchor_lang::prelude::*;
use anchor_spl::{ associated_token::AssociatedToken, token::{self, Transfer}, metadata::
    {create_master_edition_v3, create_metadata_accounts_v3, CreateMasterEditionV3, CreateMetadataAccountsV3, Metadata}, token::{mint_to, Mint, MintTo, Token, TokenAccount }};
use mpl_token_metadata::{ pda::{ find_master_edition_account, find_metadata_account}, state::DataV2 };
```

## Step 3 - Minting NFTs
```
#[derive(Accounts)]
pub struct MintNFT<'info> 
{
    /// CHECK: signer check
    #[account(mut, signer)]
    signer: AccountInfo<'info>,

    #[account(
        init,
        payer = signer,
        mint::decimals = 0,
        mint::authority = signer.key(),
        mint::freeze_authority = signer.key()
    )]
    mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mint,
        associated_token::authority = signer
    )]
    pub associated_token_account: Account<'info, TokenAccount>,

    /// CHECK:
    #[account(mut, address = find_metadata_account(&mint.key()).0)]
    pub metadata_account: AccountInfo<'info>,

    /// CHECK:
    #[account(mut, address = find_master_edition_account(&mint.key()).0)]
    pub master_edition_account: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub system_program: Program<'info, System>,
}
```
Here, 
`signer` - Is the Signer of the transaction
`mint` - Is the mint of the NFT, we set decimals as 0 cause you cant own 0.5 NFts, and we add authority and freeze_authority as the signer
`associated_token_account` - Is where the NFT will be store in the user's wallet
`metadata_account` - Is the metaplex metadata account
`master_edition_account` - Is the master edition account of the NFT
`token_program` - Is the Token Program ID
`rent` - Is the rent account
`associated_token_program` - Is the Associated Token Program ID
`token_metadata_program` - Is the Token Metadata Program ID
`system_program` - Is the System Program ID

```
pub fn mint_nft(ctx: Context<MintNFT>, name: String, symbol: String, uri: String) -> Result<()> 
    {
        let cpi_context = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.associated_token_account.to_account_info(),
                authority: ctx.accounts.signer.to_account_info(),
            },
        );

        mint_to(cpi_context, 1)?;

        let cpi_context = CpiContext::new(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                metadata: ctx.accounts.metadata_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                mint_authority: ctx.accounts.signer.to_account_info(),
                update_authority: ctx.accounts.signer.to_account_info(),
                payer: ctx.accounts.signer.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
        );

        let data_v2 = DataV2 {
            name,
            symbol,
            uri,
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        };

        create_metadata_accounts_v3(cpi_context, data_v2, false, true, None)?;

        let cpi_context = CpiContext::new(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMasterEditionV3 {
                edition: ctx.accounts.master_edition_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                update_authority: ctx.accounts.signer.to_account_info(),
                mint_authority: ctx.accounts.signer.to_account_info(),
                payer: ctx.accounts.signer.to_account_info(),
                metadata: ctx.accounts.metadata_account.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
        );

        create_master_edition_v3(cpi_context, None)?;

        Ok(())
    }
```

## Step 4 - Minting SPL Tokens
```
#[derive(Accounts)]
#[instruction(decimals: u8)]
pub struct MintToken<'info> 
{
    /// CHECK: signer check
    #[account(mut, signer)]
    signer: AccountInfo<'info>,

    #[account(
        init,
        payer = signer,
        mint::decimals = decimals,
        mint::authority = signer.key(),
        mint::freeze_authority = signer.key(),
    )]
    mint: Account<'info, Mint>,

    /// CHECK:
    #[account(mut, address = find_metadata_account(&mint.key()).0)]
    pub metadata_account: AccountInfo<'info>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mint,
        associated_token::authority = signer,
    )]
    pub associated_token_account: Account<'info, TokenAccount>,

    /// CHECK: account constraint checked in account trait
    #[account(address = mpl_token_metadata::id())]
    pub token_metadata_program: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>
}
```
```
    pub fn mint_token(ctx: Context<MintToken>, _decimals: u8, name: String, symbol: String, uri: String, amount: u64) -> Result<()> 
    {
        let cpi_context = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.associated_token_account.to_account_info(),
                authority: ctx.accounts.signer.to_account_info(),
            },
        );

        mint_to(cpi_context, amount)?;

        let cpi_context = CpiContext::new(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                metadata: ctx.accounts.metadata_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                mint_authority: ctx.accounts.signer.to_account_info(),
                update_authority: ctx.accounts.signer.to_account_info(),
                payer: ctx.accounts.signer.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
        );

        let data_v2 = DataV2 {
            name,
            symbol,
            uri,
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        };

        create_metadata_accounts_v3(cpi_context, data_v2, false, true, None)?;

        Ok(())
    }
```

## Step 5 - Transfer SPL Tokens and NFTs
```
#[derive(Accounts)]
pub struct TransferToken<'info> 
{
    pub from: Signer<'info>,

    #[account(mut)]
    pub from_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub to_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>
}
```
```
    pub fn transfer_tokens(ctx: Context<TransferToken>, amount: u64) -> Result<()> 
    {
        let cpi_accounts = Transfer 
        {
            from: ctx.accounts.from_ata.to_account_info(),
            to: ctx.accounts.to_ata.to_account_info(),
            authority: ctx.accounts.from.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        
        token::transfer(CpiContext::new(cpi_program, cpi_accounts), amount)?;

        Ok(())
    }
```

## Step 6 - Tests
```
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { publicKey } from "@metaplex-foundation/umi";
import { getOrCreateAssociatedTokenAccount, getAssociatedTokenAddress } from "@solana/spl-token";
import { SolanaExamples } from "../target/types/solana_examples";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { findMasterEditionPda, findMetadataPda, mplTokenMetadata, MPL_TOKEN_METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import { BN } from "bn.js";
import { Keypair } from "@solana/web3.js";
import fs from "fs";

describe("solana-examples", async () =>
{
  	const provider = anchor.AnchorProvider.env();
	anchor.setProvider(provider);

	const program = anchor.workspace.SolanaExamples as Program<SolanaExamples>;
	const signer = provider.wallet;
	const umi = createUmi("https://api.devnet.solana.com").use(walletAdapterIdentity(signer)).use(mplTokenMetadata());
	const mint = anchor.web3.Keypair.generate();

	const associatedTokenAccount = await getAssociatedTokenAddress(
		mint.publicKey,
		signer.publicKey
	);

	let metadataAccount = findMetadataPda(umi, {
		mint: publicKey(mint.publicKey),
	})[0];

	let masterEditionAccount = findMasterEditionPda(umi, {
		mint: publicKey(mint.publicKey),
	})[0];

	const metadata = {
		name: "Test",
		symbol: "TST",
		uri: "https://raw.githubusercontent.com/solana-developers/program-examples/new-examples/tokens/tokens/.assets/nft.json",
	};

	it("Mint NFT!", async () =>
	{
		const tx = await program.methods
				.mintNft(metadata.name, metadata.symbol, metadata.uri)
				.accounts({
					signer: provider.publicKey,
					mint: mint.publicKey,
					associatedTokenAccount,
					metadataAccount,
					masterEditionAccount,
					tokenProgram: TOKEN_PROGRAM_ID,
					associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
					tokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
					systemProgram: anchor.web3.SystemProgram.programId,
					rent: anchor.web3.SYSVAR_RENT_PUBKEY,
				})
				.signers([mint])
				.rpc();

		console.log(`mint nft tx: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
		console.log(`minted nft: https://explorer.solana.com/address/${mint.publicKey}?cluster=devnet`);
	});

	it("Mint Token!", async () =>
	{
		const tx = await program.methods
				.mintToken(9, metadata.name, metadata.symbol, metadata.uri, new BN(10 * 1000000000))
				.accounts({
					signer: provider.publicKey,
					mint: mint.publicKey,
					associatedTokenAccount,
					metadataAccount,
					tokenProgram: TOKEN_PROGRAM_ID,
					associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
					tokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
					systemProgram: anchor.web3.SystemProgram.programId,
					rent: anchor.web3.SYSVAR_RENT_PUBKEY,
				})
				.signers([mint])
				.rpc();

		console.log(`mint token tx: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
		console.log(`minted token: https://explorer.solana.com/address/${mint.publicKey}?cluster=devnet`);
	});

	it("Transfer NFT!", async () =>
	{
		var mint = new anchor.web3.PublicKey("H7PgWoocCVm17rdrWEZXghsAaQQj56zKuExcbMii4W2c");
		var toUserAddress = new anchor.web3.PublicKey("Ggg31TYu5hzH8x7x47W4ZXLqnEPSSqV1nF4YbJAfJyNi");
		var fromWallet = loadKeypairFromFile("/home/home/.config/solana/id.json");
		
		const fromAta = await getAssociatedTokenAddress(
			mint,
			signer.publicKey
		);

		const toAta = await getOrCreateAssociatedTokenAccount(
			provider.connection,
			fromWallet,
			mint,
			toUserAddress
		);

		const tx = await program.methods
				.transferTokens(new BN(1))
				.accounts({
					from: fromWallet.publicKey,
					fromAta: fromAta,
					toAta: toAta.address,
					tokenProgram: TOKEN_PROGRAM_ID
				}).
				signers([fromWallet])
				.rpc();

		console.log(`transfer nft tx: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
	});

	it("Transfer Token!", async () =>
	{
		var mint = new anchor.web3.PublicKey("2oAzfYi29d1QP4UMzAULWbT2ZihPKbdy77hfvaxs2o2w");
		var toUserAddress = new anchor.web3.PublicKey("Ggg31TYu5hzH8x7x47W4ZXLqnEPSSqV1nF4YbJAfJyNi");
		var fromWallet = loadKeypairFromFile("/home/home/.config/solana/id.json");
		
		const fromAta = await getAssociatedTokenAddress(
			mint,
			signer.publicKey
		);

		const toAta = await getOrCreateAssociatedTokenAccount(
			provider.connection,
			fromWallet,
			mint,
			toUserAddress
		);

		const tx = await program.methods
				.transferTokens(new BN(5 * 100000000))
				.accounts({
					from: fromWallet.publicKey,
					fromAta: fromAta,
					toAta: toAta.address,
					tokenProgram: TOKEN_PROGRAM_ID
				}).
				signers([fromWallet])
				.rpc();

		console.log(`transfer token tx: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
	});
});

function loadKeypairFromFile(filename: string): Keypair {
  
  const secret = JSON.parse(fs.readFileSync(filename).toString()) as number[];
  const secretKey = Uint8Array.from(secret);
  return Keypair.fromSecretKey(secretKey);
}
```
