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
### MintNFT Context
This context struct `MintNFT` serves as a context that defines the accounts and programs required for minting NFTs on the Solana blockchain. This struct is used as part of the Solana Anchor framework, which simplifies the development of Solana programs by providing a structured way to define and manage accounts and instructions.

#### Signer Check
`signer` is an account that must sign the transaction. It is mutable (`mut`) because the program may need to modify its data.
```
    /// CHECK: signer check
    #[account(mut, signer)]
    signer: AccountInfo<'info>,
```

#### Mint Account
`mint` is an account representing the mint of the NFTs. It is initialized (`init`) if it doesn't exist. The payer for the initialization is the `signer` account. Additional attributes for the `mint` account are specified using the `mint::` prefix, including setting the number of decimals to 0, specifying the mint authority as the `signer` key, and setting the freeze authority to the `signer` key.
```
    #[account(
        init,
        payer = signer,
        mint::decimals = 0,
        mint::authority = signer.key(),
        mint::freeze_authority = signer.key()
    )]
    mint: Account<'info, Mint>,
```

#### Associated Token Account
`associated_token_account` is an associated token account, created if it doesn't exist. The payer for the initialization is the `signer`. The associated token account is associated with the specified `mint` and has the `signer` as its authority.
```
    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mint,
        associated_token::authority = signer
    )]
    pub associated_token_account: Account<'info, TokenAccount>,
```

#### Metadata Account
`metadata_account` is a mutable account info representing the metadata account associated with the `mint`. The address of this account is determined by calling the `find_metadata_account` function with the mint's key.
```
    /// CHECK:
    #[account(mut, address = find_metadata_account(&mint.key()).0)]
    pub metadata_account: AccountInfo<'info>,
```

#### Master Edition Account
`master_edition_account` is a mutable account info representing the master edition account associated with the `mint`. The address of this account is determined by calling the `find_master_edition_account` function with the mint's key.
```
    /// CHECK:
    #[account(mut, address = find_master_edition_account(&mint.key()).0)]
    pub master_edition_account: AccountInfo<'info>,
```

#### Additional Programs and Sysvars
The remaining fields are programs and sysvars required for the execution of the minting process. These include the `token_program` for interacting with token accounts, `rent` for managing rent sysvar, `associated_token_program` for managing associated token accounts, `token_metadata_program` for handling metadata, and `system_program` for basic system operations.
```
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub system_program: Program<'info, System>,
```

### MintNFT Function
This function `mint_nft`, is used to mint a new NFT on the Solana blockchain. It utilizes Solana Anchor and includes several CPI (Cross-Program Invocation) calls to interact with different programs on the Solana blockchain.

#### Function Signature
The `mint_nft` function takes a `Context` of type `MintNFT` as its first parameter, along with additional parameters (`name`, `symbol`, `uri`). It returns a `Result` indicating success or failure.
```
pub fn mint_nft(ctx: Context<MintNFT>, name: String, symbol: String, uri: String) -> Result<()>
```

#### Mint To CPI Call
This CPI call (`MintTo`) mints 1 token to the associated token account. It uses the `CpiContext` to define the involved accounts and calls the `mint_to` function.
```
let cpi_context = CpiContext::new(
    ctx.accounts.token_program.to_account_info(),
    MintTo {
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.associated_token_account.to_account_info(),
        authority: ctx.accounts.signer.to_account_info(),
    },
);

mint_to(cpi_context, 1)?;
```

#### Create Metadata Accounts CPI Call
This CPI call (`CreateMetadataAccountsV3`) creates metadata accounts. It specifies metadata, mint, authorities, and other required accounts. The function also prepares data for the metadata account.
```
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
```

#### Create Master Edition CPI Call
This CPI call (`CreateMasterEditionV3`) creates a master edition. It involves specifying the edition, mint, authorities, metadata, and other required accounts. The function calls `create_master_edition_v3` with the given context.
```
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
```

The function returns `Ok(())` if the entire process completes without errors.

## Step 4 - Minting SPL Tokens
### MintToken Context
This context struct `MintToken` serves as a context that defines the accounts and programs required for minting SPL Tokens on the Solana blockchain.

#### Signer Check
`signer` is an account that must sign the transaction. It is mutable (`mut`) because the program may need to modify its data.
```
    /// CHECK: signer check
    #[account(mut, signer)]
    signer: AccountInfo<'info>,
```

#### Mint Account
`mint` is an account representing the mint of the NFTs. It is initialized (`init`) if it doesn't exist. The payer for the initialization is the `signer` account. Additional attributes for the `mint` account are specified using the `mint::` prefix, including setting the number of decimals to `decimals` that we got from the instruction, specifying the mint authority as the `signer` key, and setting the freeze authority to the `signer` key.
```
    #[account(
        init,
        payer = signer,
        mint::decimals = decimals,
        mint::authority = signer.key(),
        mint::freeze_authority = signer.key(),
    )]
    mint: Account<'info, Mint>,
```

#### Metadata Account
`metadata_account` is a mutable account info representing the metadata account associated with the `mint`. The address of this account is determined by calling the `find_metadata_account` function with the mint's key.
```
    /// CHECK:
    #[account(mut, address = find_metadata_account(&mint.key()).0)]
    pub metadata_account: AccountInfo<'info>,
```

#### Associated Token Account
`associated_token_account` is an associated token account, created if it doesn't exist. The payer for the initialization is the `signer`. The associated token account is associated with the specified `mint` and has the `signer` as its authority.
```
    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mint,
        associated_token::authority = signer
    )]
    pub associated_token_account: Account<'info, TokenAccount>,
```

#### Token Metadata Program Account
The `token_metadata_program` is an unchecked account representing the token metadata program. The address is specified using the `mpl_token_metadata::id()` function.
```
    /// CHECK: account constraint checked in account trait
    #[account(address = mpl_token_metadata::id())]
    pub token_metadata_program: UncheckedAccount<'info>,
```

#### Additional Programs and Sysvars
The remaining fields are programs and sysvars required for the execution of the minting process. These include the `token_program` for interacting with token accounts, `rent` for managing rent sysvar, `associated_token_program` for managing associated token accounts, and `system_program` for basic system operations.
```
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>
```

### MintToken Function
#### Function Signature
The `mint_token` function takes a `Context` of type `MintToken` as its first parameter, along with additional parameters (`_decimals`, `name`, `symbol`, `uri`, `amount`). It returns a `Result` indicating success or failure.
```
pub fn mint_token(ctx: Context<MintToken>, _decimals: u8, name: String, symbol: String, uri: String, amount: u64) -> Result<()> 
```

#### Mint To CPI Call
This CPI call (`MintTo`) mints a specified `amount` of tokens to the associated token account. The `CpiContext` is used to define the involved accounts for the CPI call. The `mint_to` function is called with the defined context and the specified `amount`.
```
    // Mint To CPI Call
    let cpi_context = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.associated_token_account.to_account_info(),
            authority: ctx.accounts.signer.to_account_info(),
        },
    );

    // Mint Tokens to Associated Token Account
    mint_to(cpi_context, amount)?;
```

#### Create Metadata Accounts CPI Call
This CPI call (`CreateMetadataAccountsV3`) creates metadata accounts associated with the mint. The `CpiContext` is used to define the involved accounts for the CPI call. The function prepares metadata information (`data_v2`) including `name`, `symbol`, `uri`, and other details. The `create_metadata_accounts_v3` function is called with the defined context and metadata information.
```
    // Create Metadata Accounts CPI Call
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

    // Data for Metadata Account
    let data_v2 = DataV2 {
        name,
        symbol,
        uri,
        seller_fee_basis_points: 0,
        creators: None,
        collection: None,
        uses: None,
    };

    // Create Metadata Accounts
    create_metadata_accounts_v3(cpi_context, data_v2, false, true, None)?;
```

The function returns `Ok(())` if the entire process completes without errors.

## Step 5 - Transfer SPL Tokens and NFTs
### TransferToken Context
This context struct `TransferToken` serves as a context that defines the accounts and programs required for transfering tokens and NFTs on the Solana blockchain.

#### Signer Account
The `from` field represents a signer account, indicating that the transaction must be signed by the owner of this account.
```
pub from: Signer<'info>,
```

#### From Account (Associated Token Account)
The `from_ata` field is a mutable account representing the "from" associated token account. It is marked as mutable, indicating that it can be modified during the execution of the program.
```
    #[account(mut)]
    pub to_ata: Account<'info, TokenAccount>,
```

#### To Account (Associated Token Account)
The `to_ata` field is a mutable account representing the "to" associated token account. It is marked as mutable, indicating that it can be modified during the execution of the program.
```
    #[account(mut)]
    pub to_ata: Account<'info, TokenAccount>,
```

#### Token Program Account
The `token_program` field represents the Solana Token program, and it is not marked as mutable since it is not modified during the execution of the program. It allows the Solana program to interact with the Token program for token transfers.
```
    pub token_program: Program<'info, Token>
```

### TransferToken Function
#### Function Signature
The `transfer_tokens` function takes a `Context` of type `TransferToken` as its first parameter, along with an additional parameter (`amount`), and returns a `Result` indicating success or failure.
```
pub fn transfer_tokens(ctx: Context<TransferToken>, amount: u64) -> Result<()>
```

#### Transfer CPI Call Setup
The function initializes the `cpi_accounts` and `cpi_program` variables to set up a Cross-Program Invocation (CPI) call for transferring tokens. `cpi_accounts` includes information about the source (`from`), destination (`to`), and authority accounts needed for the token transfer. `cpi_program` specifies the token program that will handle the token transfer.
```
    let cpi_accounts = Transfer 
    {
        from: ctx.accounts.from_ata.to_account_info(),
        to: ctx.accounts.to_ata.to_account_info(),
        authority: ctx.accounts.from.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
```

#### Token Transfer CPI Call
The function invokes the token transfer using the `token::transfer` CPI call. This call transfers the specified `amount` of tokens from the source account (`from`) to the destination account (`to`). The `CpiContext::new` is used to create a context for the CPI call, providing the token program and the relevant accounts. The `?` operator is used to handle the result of the token transfer CPI call, and if successful, it returns `Ok(())`.
```
    token::transfer(CpiContext::new(cpi_program, cpi_accounts), amount)?;

    Ok(())
```

## Step 6 - Tests
#### Imports
The code starts by importing various libraries and modules necessary for interacting with the Solana blockchain, Metaplex, and related functionalities. Notable imports include `anchor`, `umi`, `spl-token` for token-related operations, and `@solana/web3.js` for interacting with the Solana blockchain.
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
```

#### Test Suite Initialization
A Jest test suite is initiated with the name "solana-examples." An Anchor provider is created using the environment configuration. The Solana Examples program is loaded from the workspace, and a signer is defined using the provider's wallet. UMI is created with specific configurations, including the Solana Devnet API endpoint and wallet adapter for identity. A new keypair (`mint`) is generated for use in the subsequent code.
```
describe("solana-examples", async () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SolanaExamples as Program<SolanaExamples>;
    const signer = provider.wallet;
    const umi = createUmi("https://api.devnet.solana.com").use(walletAdapterIdentity(signer)).use(mplTokenMetadata());
    const mint = anchor.web3.Keypair.generate();
    // ...
});
```

#### Associated Token Account and Metadata/Master Edition Lookup
An associated token account address is obtained using the mint's public key and the signer's public key. Metadata and Master Edition accounts are found using functions from the Metaplex ecosystem.
```
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
```

#### Metadata Definition
A metadata object is defined with properties such as `name`, `symbol`, and `uri` for NFT minting.
```
const metadata = {
    name: "Test",
    symbol: "TST",
    uri: "https://raw.githubusercontent.com/solana-developers/program-examples/new-examples/tokens/tokens/.assets/nft.json",
};
```

#### Mint NFT Transaction
A Jest test case (`it`) is defined for minting an NFT. The `mintNft` method from the Solana Examples program is called with specified metadata properties. Relevant accounts, programs, and signers are provided in the `accounts` section. The transaction is executed using `.rpc()`. Transaction details and the minted NFT's address are logged.
```
it("Mint NFT!", async () => {
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
```

#### Mint Token Transaction
Another Jest test case is defined for minting a token. The `mintToken` method is called with specified parameters. Similar to the NFT minting, relevant accounts, programs, and signers are provided. The transaction is executed, and details are logged.
```
it("Mint Token!", async () => {
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
```

#### Transfer NFT Transaction
A Jest test case is defined for transferring an NFT. Associated token accounts (`fromAta` and `toAta`) are obtained using Metaplex functions. The `transferTokens` method is called with the specified amount. Transaction details are logged.
```
it("Transfer NFT!", async () => {
    // ... 
    const tx = await program.methods
        .transferTokens(new BN(1))
        .accounts({
            from: fromWallet.publicKey,
            fromAta: fromAta,
            toAta: toAta.address,
            tokenProgram: TOKEN_PROGRAM_ID
        })
        .signers([fromWallet])
        .rpc();

    console.log(`transfer nft tx: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
});
```

#### Transfer Token Transaction
Another Jest test case is defined for transferring a token. Similar to the NFT transfer, associated token accounts are obtained. The `transferTokens` method is called with the specified amount. Transaction details are logged.
```
it("Transfer Token!", async () => {
    // ... 
    const tx = await program.methods
        .transferTokens(new BN(5 * 100000000))
        .accounts({
            from: fromWallet.publicKey,
            fromAta: fromAta,
            toAta: toAta.address,
            tokenProgram: TOKEN_PROGRAM_ID
        })
        .signers([fromWallet])
        .rpc();

    console.log(`transfer token tx: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
});
```

#### File Loading Function
A utility function is defined to load a keypair from a JSON file.
```
function loadKeypairFromFile(filename: string): Keypair {
    const secret = JSON.parse(fs.readFileSync(filename).toString()) as number[];
    const secretKey = Uint8Array.from(secret);
    return Keypair.fromSecretKey(secretKey);
}
```

# How to Stake (under Staking)
## Step 1 - Project Setup
Create a new anchor project using `anchor init [project_name]`, paste the following dependencies under Corgo.toml
```
[dependencies]
anchor-lang = {version = "0.28.0", features = ["init-if-needed"]}
anchor-spl = { version = "0.28.0", features = ["metadata"] }
ahash = "=0.8.4"
```
Then open Anchor.toml and change cluster to `Devnet`

## Step 2 - Constants
These constants are used as PDA seeds
```
pub const STAKE: &[u8; 5] = b"STAKE";
pub const NFT_RECORD: &[u8; 10] = b"NFT_RECORD";
pub const NFT_AUTHORITY: &[u8; 13] = b"NFT_AUTHORITY";
pub const TOKEN_AUTHORITY: &[u8; 15] = b"TOKEN_AUTHORITY";
pub const METADATA: &[u8; 8] = b"METADATA";
pub const EDITION: &[u8; 7] = b"EDITION";
```

## Step 3 - Errors
This is the list of all the errors that can occur while going through the staking cycle, the errors the explained in the code itslef, so it'll be pretty self explanatory.
```
#[error_code]
pub enum StakeError {
    #[msg("unable to get stake details bump")]
    StakeBumpError,
    #[msg("unable to get token authority bump")]
    TokenAuthBumpError,
    #[msg("unable to get token authority bump")]
    NftAuthBumpError,
    #[msg("unable to get nft record bump")]
    NftBumpError,
    #[msg("the minimum staking period in secs can't be negative")]
    NegativePeriodValue,
    #[msg("the given mint account doesn't belong to NFT")]
    TokenNotNFT,
    #[msg("the given token account has no token")]
    TokenAccountEmpty,
    #[msg("the collection field in the metadata is not verified")]
    CollectionNotVerified,
    #[msg("the collection doesn't match the staking details")]
    InvalidCollection,
    #[msg("the minimum stake period for the rewards not completed yet")]
    IneligibleForReward,
    #[msg("the staking is not currently active")]
    StakingInactive,
    #[msg("failed to convert the time to u64")]
    FailedTimeConversion,
    #[msg("unable to add the given values")]
    ProgramAddError,
    #[msg("unable to subtract the given values")]
    ProgramSubError,
    #[msg("unable to multiply the given values")]
    ProgramMulError,
}
```

## Step 4 - Utils (Helpers)
We will use this function to calculate our staking rewards
```
use anchor_lang::prelude::*;
use crate::StakeError;

pub fn calculate_reward
(
    staked_at: i64,
    minimum_stake_period: i64,
    reward_emission: u64,
) -> Result<(u64, i64, bool)> 
{
    let clock = Clock::get().unwrap();
    let current_time = clock.unix_timestamp;

    let reward_eligible_time = staked_at.checked_add(minimum_stake_period).ok_or(StakeError::ProgramAddError)?;
    let is_eligible_for_reward = current_time >= reward_eligible_time;

    let rewardable_time_i64 = current_time.checked_sub(staked_at).ok_or(StakeError::ProgramSubError)?;

    let rewardable_time_u64 = match u64::try_from(rewardable_time_i64) 
    {
        Ok(time) => time,
        _ => return err!(StakeError::FailedTimeConversion)
    };

    let reward_tokens = rewardable_time_u64.checked_mul(reward_emission).ok_or(StakeError::ProgramMulError)?;
    Ok((reward_tokens, current_time, is_eligible_for_reward))
}
```

## Step 5 - Structs
### NftRecord
#### NftRecord Account
The `NftRecord` struct is used to store the basic information about a staked NFT. The `#[account]` attribute is used to annotate this struct as an account, which means it can be used as a state account in a Solana program.
`staker`: A public key representing the account that staked the NFT.
`nft_mint`: A public key representing the mint of the NFT.
`staked_at`: A 64-bit signed integer (i64) representing the timestamp when the NFT was staked.
`bump`: An 8-bit unsigned integer (u8) representing a bump seed.
```
#[account]
pub struct NftRecord 
{
    pub staker: Pubkey,
    pub nft_mint: Pubkey,
    pub staked_at: i64,
    pub bump: u8
}
```

#### NftRecord Implementations
`LEN`: A constant indicating the length of the serialized account data in bytes.
`init`: A public method used to initialize a new `NftRecord` instance. It sets the `staked_at` field to the current Unix timestamp obtained from the Solana `Clock`.
```
impl NftRecord 
{
    pub const LEN: usize = 8 + 32 + 32 + 8 + 1;

    pub fn init(staker: Pubkey, nft_mint: Pubkey, bump: u8) -> Self 
    {
        let clock = Clock::get().unwrap();
        let staked_at = clock.unix_timestamp;

        Self {staker, nft_mint, staked_at, bump}
    }
}
```

### Details
#### Details Account
`is_active`: A boolean indicating whether the staking details are active.
`creator`: A public key representing the account that created the staking details.
`reward_mint`: A public key representing the mint of the reward token.
`reward`: A 64-bit unsigned integer representing the reward amount.
`collection`: A public key representing the NFT collection associated with the staking details.
`minimum_period`: A 64-bit signed integer representing the minimum staking period.
`stake_bump`, `token_auth_bump`, `nft_auth_bump`: 8-bit unsigned integers representing bump seeds.
```
#[account]
pub struct Details 
{
    pub is_active: bool,
    pub creator: Pubkey,
    pub reward_mint: Pubkey,
    pub reward: u64,
    pub collection: Pubkey,
    pub minimum_period: i64,
    pub stake_bump: u8,
    pub token_auth_bump: u8,
    pub nft_auth_bump: u8
}
```
#### Details Implementation
`LEN`: A constant indicating the length of the serialized account data in bytes.
`init`: A public method used to initialize a new `Details` instance.
`close_staking`: A method to close staking by setting `is_active` to `false`.
```
impl Details 
{
    pub const LEN: usize = 8 + 1 + 32 + 32 + 8 + 32 + 8 + 1 + 1 + 1;

    pub fn init(
        creator: Pubkey,
        reward_mint: Pubkey,
        reward: u64,
        collection: Pubkey,
        minimum_period: i64,
        stake_bump: u8,
        token_auth_bump: u8,
        nft_auth_bump: u8
    ) -> Self 
    {
        Self 
        {
            is_active: true,
            creator,
            reward_mint,
            reward,
            collection,
            minimum_period,
            stake_bump,
            token_auth_bump,
            nft_auth_bump
        }
    }

    pub fn close_staking(&mut self) -> Result<()> 
    {
        self.is_active = false;
        Ok(())
    }
}
```

## Step 6 - Contexts and Functions
### init_staking
#### Context
`#[derive(Accounts)]`: The `Accounts` derive macro is used to define the accounts required for the `InitStaking` struct.<br>
`stake_details`: A mutable account used to store staking details. Initialized with `init` attribute, funded by the `creator` account. Seeds include 'STAKE', `collection_address`, and `creator` public keys. Uses a specified bump seed (`bump`) and allocates space based on `Details::LEN`. <br>
`token_mint`: A mutable account representing the mint of the reward token. Authority is the `creator` account.<br>
`collection_address`: An account representing the address of the NFT collection.<br>
`creator`: A signer representing the account that initiates staking.<br>
`token_authority`: An unchecked account used to set the authority for the reward token. Seeds include 'TOKEN_AUTHORITY' and `stake_details` public keys.<br>
`nft_authority`: An unchecked account used to set the authority for the NFT. Seeds include 'NFT_AUTHORITY' and `stake_details` public keys.<br>
`token_program`: A program account representing the Token program.<br>
`system_program`: A program account representing the System program.<br>
`InitStaking Impl`: Generates a `CpiContext` for transferring authority to the `token_mint`.
```
#[derive(Accounts)]
pub struct InitStaking<'info> 
{
    #[account(init, payer = creator, seeds = [STAKE, collection_address.key().as_ref(), creator.key().as_ref()], bump, space = Details::LEN)]
    pub stake_details: Account<'info, Details>,

    #[account(mut, mint::authority = creator)]
    pub token_mint: Account<'info, Mint>,

    #[account(mint::decimals = 0)]
    pub collection_address: Account<'info, Mint>,

    #[account(mut)]
    pub creator: Signer<'info>,

    /// CHECK: This account is not read or written
    #[account(seeds = [TOKEN_AUTHORITY, stake_details.key().as_ref()], bump)]
    pub token_authority: UncheckedAccount<'info>,

    /// CHECK: This account is not read or written
    #[account(seeds = [NFT_AUTHORITY, stake_details.key().as_ref()], bump)]
    pub nft_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>
}

impl<'info> InitStaking<'info> 
{
    pub fn transfer_auth_ctx(&self) -> CpiContext<'_, '_, '_, 'info, SetAuthority<'info>> 
    {
        let cpi_accounts = SetAuthority 
        {
            account_or_mint: self.token_mint.to_account_info(),
            current_authority: self.creator.to_account_info()
        };
    
        let cpi_program = self.token_program.to_account_info();

        CpiContext::new(cpi_program, cpi_accounts)
    }
}
```
#### Function
`ctx`: A context object containing the accounts required for staking initialization. <br>
`reward`: The reward amount for staking. <br>
`minimum_period`: The minimum staking period.<br>
Logic - Checks if the minimum period is greater than or equal to 0, else returns a `StakeError::NegativePeriodValue`. Extracts necessary account keys and bump seeds from the context. Calls the `set_authority` function using a CPI (Cross-Program Invocation) context to transfer authority for minting tokens. Initializes the `stake_details` account with staking information. Returns a `Result` indicating success or a specific `StakeError` in case of failure.
```
pub fn init_staking_handler(ctx: Context<InitStaking>, reward: u64, minimum_period: i64) -> Result<()> 
{
    require_gte!(minimum_period, 0, StakeError::NegativePeriodValue);

    let reward_mint = ctx.accounts.token_mint.key();
    let collection = ctx.accounts.collection_address.key();
    let creator = ctx.accounts.creator.key();
    let stake_bump = *ctx.bumps.get("stake_details").ok_or(StakeError::StakeBumpError)?;
    let token_auth_bump = *ctx.bumps.get("token_authority").ok_or(StakeError::TokenAuthBumpError)?;
    let nft_auth_bump = *ctx.bumps.get("nft_authority").ok_or(StakeError::NftAuthBumpError)?;
    let token_authority = ctx.accounts.token_authority.key();

    set_authority(
        ctx.accounts.transfer_auth_ctx(),
        AuthorityType::MintTokens,
        Some(token_authority)
    )?;

    let stake_details = &mut ctx.accounts.stake_details;

    **stake_details = Details::init(
        creator,
        reward_mint, 
        reward, 
        collection,
        minimum_period,
        stake_bump,
        token_auth_bump,
        nft_auth_bump
    );

    Ok(())
}
```
### stake
#### Context
#### Function
### withdraw_reward
#### Context
#### Function
### unstake
#### Context
#### Function
### close_staking
#### Context
#### Function
## Step 7 - Tests
