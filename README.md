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

# How to Stake NFTs (under Staking)
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
`#[derive(Accounts)]`: The `Accounts` derive macro is used to define the accounts required for the `Stake` struct. <br>
`stake_details`: An account representing staking details. Seeds include 'STAKE', `collection`, and `creator` public keys. Uses a specified bump seed (`stake_bump`). <br>
`nft_record`: An account used to store NFT staking information. Initialized with `init` attribute, funded by the `signer` account. Seeds include 'NFT_RECORD', `stake_details`, and `nft_mint` public keys. Uses a specified bump seed (`bump`) and allocates space based on `NftRecord::LEN`.<br>
`nft_mint`: An account representing the mint of the NFT. Constraints include verifying that the mint's supply is 1, else returns `StakeError::TokenNotNFT`.<br>
`nft_token`: An account representing the NFT token. Minted under the `nft_mint` with authority assigned to the `signer`. Constraints include ensuring the token account has exactly 1 token, else returns `StakeError::TokenAccountEmpty`.<br>
`nft_metadata`: A boxed account representing the NFT metadata. Seeds include 'METADATA', metadata program ID, `nft_mint`, and 'EDITION'. Constraints include verifying that the metadata's collection is verified and matches `stake_details.collection`.<br>
`nft_edition`: A boxed account representing the NFT edition. Seeds include 'METADATA', metadata program ID, `nft_mint`, and 'EDITION'.<br>
`nft_authority`: An unchecked account used to set the authority for the NFT. Seeds include 'NFT_AUTHORITY' and `stake_details`.<br>
`nft_custody`: An account initialized under the `signer` authority for custody of the NFT.<br>
`signer`: A signer representing the staker.<br>
`token_program`: A program account representing the Token program.<br>
`associated_token_program`: A program account representing the Associated Token program.<br>
`system_program`: A program account representing the System program.<br>
`Stake Impl`: Generates a `CpiContext` for transferring the NFT from the staker to custody.
```
#[derive(Accounts)]
pub struct Stake<'info> 
{
    #[account(seeds = [STAKE, stake_details.collection.as_ref(), stake_details.creator.as_ref()], bump = stake_details.stake_bump)]
    pub stake_details: Account<'info, Details>,

    #[account(init, payer = signer, seeds = [NFT_RECORD, stake_details.key().as_ref(), nft_mint.key().as_ref()], bump, space = NftRecord::LEN)]
    pub nft_record: Account<'info, NftRecord>,

    #[account(mint::decimals = 0, constraint = nft_mint.supply == 1 @ StakeError::TokenNotNFT)]
    nft_mint: Account<'info, Mint>,

    #[account(mut, associated_token::mint = nft_mint, associated_token::authority = signer, constraint = nft_token.amount == 1 @ StakeError::TokenAccountEmpty)]
    nft_token: Account<'info, TokenAccount>,

    #[account(
        seeds = [METADATA, Metadata::id().as_ref(), nft_mint.key().as_ref()], seeds::program = Metadata::id(), bump,
        constraint = nft_metadata.collection.as_ref().unwrap().verified @ StakeError::CollectionNotVerified,
        constraint = nft_metadata.collection.as_ref().unwrap().key == stake_details.collection @ StakeError::InvalidCollection
    )]
    nft_metadata: Box<Account<'info, MetadataAccount>>,

    #[account(seeds = [METADATA, Metadata::id().as_ref(), nft_mint.key().as_ref(), EDITION], seeds::program = Metadata::id(), bump)]
    nft_edition: Box<Account<'info, MasterEditionAccount>>,

    /// CHECK: This account is not read or written
    #[account(seeds = [NFT_AUTHORITY, stake_details.key().as_ref()], bump = stake_details.nft_auth_bump)]
    pub nft_authority: UncheckedAccount<'info>,

    #[account(init, payer = signer, associated_token::mint = nft_mint, associated_token::authority = nft_authority)]
    pub nft_custody: Account<'info, TokenAccount>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>
}

impl<'info> Stake<'info> 
{
    pub fn transfer_nft_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> 
    {
        let cpi_accounts = Transfer 
        {
            from: self.nft_token.to_account_info(),
            to: self.nft_custody.to_account_info(),
            authority: self.signer.to_account_info()
        };
    
        let cpi_program = self.token_program.to_account_info();

        CpiContext::new(cpi_program, cpi_accounts)
    }
}
```

#### Function
`ctx`: A context object containing the accounts required for the staking operation. <br>
Logic - Checks if staking is active; else, returns `StakeError::StakingInactive`. Gets the staker's public key and NFT mint's public key. Transfers 1 token from the staker's NFT token account to the custody account. Initializes the `nft_record` with staking information.
```
pub fn stake_handler(ctx: Context<Stake>) -> Result<()> 
{
    let staking_status = ctx.accounts.stake_details.is_active;
    
    require_eq!(staking_status, true, StakeError::StakingInactive);

    let staker = ctx.accounts.signer.key();
    let nft_mint = ctx.accounts.nft_mint.key();
    let bump = *ctx.bumps.get("nft_record").ok_or(StakeError::NftBumpError)?;

    transfer(ctx.accounts.transfer_nft_ctx(), 1)?;

    let nft_record = &mut ctx.accounts.nft_record;
    **nft_record = NftRecord::init(staker, nft_mint, bump);

    Ok(())
}
```

### withdraw_reward
#### Context
`#[derive(Accounts)]`: The `Accounts` derive macro is used to define the accounts required for the `WithdrawReward` struct.<br>
`stake_details`: An account representing staking details. Seeds include 'STAKE', `collection`, and `creator` public keys. Uses a specified bump seed (`stake_bump`). Requires an associated account with the `reward_mint`.<br>
`nft_record`: An account representing NFT staking information. Seeds include 'NFT_RECORD', `stake_details`, and the NFT mint's public key. Uses a specified bump seed (`nft_record.bump`). Requires an associated account with the `staker`.<br>
`reward_mint`: A mutable account representing the mint of the reward token. The authority to mint is given by the `token_authority` account.<br>
`reward_receive_account`: An account used to receive the reward tokens. Initialized if needed, funded by the `staker`. Associated with the `reward_mint` and has authority assigned to the `staker`.<br>
`token_authority`: An unchecked account used to set the authority for the reward token. Seeds include 'TOKEN_AUTHORITY' and `stake_details`.<br>
`staker`: A signer representing the staker.<br>
`token_program`: A program account representing the Token program.<br>
`associated_token_program`: A program account representing the Associated Token program.<br>
`system_program`: A program account representing the System program.<br>
`WithdrawReward Impl`: Generates a `CpiContext` for minting reward tokens.<br>
```
#[derive(Accounts)]
pub struct WithdrawReward<'info> 
{
    #[account(seeds = [STAKE, stake_details.collection.as_ref(), stake_details.creator.as_ref()], bump = stake_details.stake_bump, has_one = reward_mint)]
    pub stake_details: Account<'info, Details>,

    #[account(mut, seeds = [NFT_RECORD, stake_details.key().as_ref(), nft_record.nft_mint.as_ref()], bump = nft_record.bump, has_one = staker)]
    pub nft_record: Account<'info, NftRecord>,

    #[account(mut, mint::authority = token_authority)]
    pub reward_mint: Account<'info, Mint>,

    #[account(init_if_needed, payer = staker, associated_token::mint = reward_mint, associated_token::authority = staker)]
    pub reward_receive_account: Account<'info, TokenAccount>,

    /// CHECK: This account is not read or written
    #[account(seeds = [TOKEN_AUTHORITY, stake_details.key().as_ref()], bump)]
    pub token_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub staker: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>
}

impl<'info> WithdrawReward<'info> 
{
    pub fn mint_token_ctx(&self) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> 
    {
        let cpi_accounts = MintTo 
        {
            mint: self.reward_mint.to_account_info(),
            to: self.reward_receive_account.to_account_info(),
            authority: self.token_authority.to_account_info()
        };
    
        let cpi_program = self.token_program.to_account_info();

        CpiContext::new(cpi_program, cpi_accounts)
    }
}
```

#### Function
`ctx`: A context object containing the accounts required for the reward withdrawal operation.<br>
Logic - Gets necessary information from staking details and calculates the reward eligibility and amount. Checks if staking is active; else, returns `StakeError::StakingInactive`. If eligible for reward, mints reward tokens to the `reward_receive_account` using the `mint_to` function. Updates the staking details with the current time.
```
pub fn withdraw_reward_handler(ctx: Context<WithdrawReward>) -> Result<()> 
{
    let stake_details = &ctx.accounts.stake_details;

    let staked_at = ctx.accounts.nft_record.staked_at;
    let minimum_stake_period = stake_details.minimum_period;
    let reward_emission = stake_details.reward;
    let staking_status = stake_details.is_active;
    let token_auth_bump = stake_details.token_auth_bump;
    let stake_details_key = stake_details.key();

    require_eq!(staking_status, true, StakeError::StakingInactive);

    let (reward_tokens, current_time, is_eligible_for_reward) = calculate_reward(
        staked_at, 
        minimum_stake_period, 
        reward_emission,
    ).unwrap();

    let authority_seed = &[&TOKEN_AUTHORITY[..], &stake_details_key.as_ref(), &[token_auth_bump]];
 
    if is_eligible_for_reward 
    {
        mint_to(ctx.accounts.mint_token_ctx().with_signer(&[&authority_seed[..]]), reward_tokens)?;
    } 
    else 
    {
        return err!(StakeError::IneligibleForReward);
    }

    ctx.accounts.nft_record.staked_at = current_time;
    
    Ok(())
}
```

### unstake
#### Context
`#[derive(Accounts)]`: The `Accounts` derive macro is used to define the accounts required for the `Unstake` struct.<br>
`stake_details`: An account representing staking details. Seeds include 'STAKE', `collection`, and `creator` public keys. Uses a specified bump seed (`stake_bump`). Requires associated accounts with the `reward_mint`.<br>
`nft_record`: An account representing NFT staking information. Seeds include 'NFT_RECORD', `stake_details`, and the NFT mint's public key. Uses a specified bump seed (`nft_record.bump`). Requires associated accounts with the `nft_mint`, `staker`, and closes the `staker` account.<br>
`reward_mint`: A mutable account representing the mint of the reward token. The authority to mint is given by the `token_authority` account.<br>
`reward_receive_account`: A boxed account used to receive the reward tokens. Initialized if needed, funded by the `staker`. Associated with the `reward_mint` and has authority assigned to the `staker`.<br>
`nft_mint`: A boxed account representing the mint of the NFT. Constraints include verifying that the mint's supply is 1, else returns `StakeError::TokenNotNFT`.<br>
`nft_receive_account`: A boxed account used to receive the NFT. Initialized if needed, funded by the `staker`. Associated with the `nft_mint` and has authority assigned to the `staker`.<br>
`nft_custody`: A boxed account representing custody of the NFT. Associated with the `nft_mint` and has authority assigned to the `nft_authority`. Constraints include ensuring the token account has exactly 1 token, else returns `StakeError::TokenAccountEmpty`.<br>
`token_authority`: An unchecked account used to set the authority for the reward token. Seeds include 'TOKEN_AUTHORITY' and `stake_details`.<br>
`nft_authority`: An unchecked account used to set the authority for the NFT. Seeds include 'NFT_AUTHORITY' and `stake_details`.<br>
`staker`: A signer representing the staker.<br>
`token_program`: A program account representing the Token program.<br>
`associated_token_program`: A program account representing the Associated Token program.<br>
`system_program`: A program account representing the System program.<br>
`Unstake Impl mint_token_ctx`: Generates a `CpiContext` for minting reward tokens.<br>
`Unstake Impl transfer_nft_ctx`: Generates a `CpiContext` for transferring the NFT from custody to the staker.<br>
`Unstake Impl close_account_ctx`: Generates a `CpiContext` for closing the NFT custody account.
```
#[derive(Accounts)]
pub struct Unstake<'info> 
{
    #[account(seeds = [STAKE, stake_details.collection.as_ref(), stake_details.creator.as_ref()], bump = stake_details.stake_bump, has_one = reward_mint)]
    pub stake_details: Account<'info, Details>,

    #[account(mut, seeds = [NFT_RECORD, stake_details.key().as_ref(), nft_record.nft_mint.as_ref()], bump = nft_record.bump, has_one = nft_mint, has_one = staker, close = staker)]
    pub nft_record: Account<'info, NftRecord>,

    #[account(mut, mint::authority = token_authority)]
    pub reward_mint: Account<'info, Mint>,

    #[account(init_if_needed, payer = staker, associated_token::mint = reward_mint, associated_token::authority = staker)]
    pub reward_receive_account: Box<Account<'info, TokenAccount>>,

    #[account(mint::decimals = 0, constraint = nft_mint.supply == 1 @ StakeError::TokenNotNFT)]
    nft_mint: Box<Account<'info, Mint>>,

    #[account(init_if_needed, payer = staker, associated_token::mint = nft_mint, associated_token::authority = staker)]
    nft_receive_account: Box<Account<'info, TokenAccount>>,

    #[account(mut, associated_token::mint = nft_mint, associated_token::authority = nft_authority, constraint = nft_custody.amount == 1 @ StakeError::TokenAccountEmpty)]
    pub nft_custody: Box<Account<'info, TokenAccount>>,

    /// CHECK: This account is not read or written
    #[account(seeds = [TOKEN_AUTHORITY, stake_details.key().as_ref()], bump = stake_details.token_auth_bump)]
    pub token_authority: UncheckedAccount<'info>,

     /// CHECK: This account is not read or written
    #[account(seeds = [NFT_AUTHORITY, stake_details.key().as_ref()], bump = stake_details.nft_auth_bump)]
    pub nft_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub staker: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>
}

impl<'info> Unstake<'info> 
{
    pub fn mint_token_ctx(&self) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> 
    {
        let cpi_accounts = MintTo 
        {
            mint: self.reward_mint.to_account_info(),
            to: self.reward_receive_account.to_account_info(),
            authority: self.token_authority.to_account_info()
        };
        let cpi_program = self.token_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
    }

    pub fn transfer_nft_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> 
    {
        let cpi_accounts = Transfer 
        {
            from: self.nft_custody.to_account_info(),
            to: self.nft_receive_account.to_account_info(),
            authority: self.nft_authority.to_account_info()
        };
        let cpi_program = self.token_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
    }

    pub fn close_account_ctx(&self)-> CpiContext<'_, '_, '_, 'info, CloseAccount<'info>> 
    {
        let cpi_accounts = CloseAccount 
        {
            account: self.nft_custody.to_account_info(),
            destination: self.staker.to_account_info(),
            authority: self.nft_authority.to_account_info()
        };
        let cpi_program = self.token_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
    }
}
```

#### Function
`ctx`: A context object containing the accounts required for the unstaking operation.<br>
Logic - Gets necessary information from staking details and calculates the reward eligibility and amount. Checks if staking is active and the staker is eligible for a reward. If eligible for reward, mints reward tokens to the `reward_receive_account` using the `mint_to` function. Transfers the NFT from custody to the `nft_receive_account` using the `transfer` function. Closes the NFT custody account.
```
pub fn unstake_handler(ctx: Context<Unstake>) -> Result<()> 
{
    let stake_details = &ctx.accounts.stake_details;

    let staked_at = ctx.accounts.nft_record.staked_at;
    let minimum_stake_period = stake_details.minimum_period;
    let reward_emission = stake_details.reward;
    let staking_active = stake_details.is_active;
    let token_auth_bump = stake_details.token_auth_bump;
    let nft_auth_bump = stake_details.nft_auth_bump;
    let stake_details_key = stake_details.key();

    let (reward_tokens, _current_time, is_eligible_for_reward) = calculate_reward(
        staked_at, 
        minimum_stake_period, 
        reward_emission,
    ).unwrap();

    let token_auth_seed = &[&TOKEN_AUTHORITY[..], &stake_details_key.as_ref(), &[token_auth_bump]];
    let nft_auth_seed = &[&NFT_AUTHORITY[..], &stake_details_key.as_ref(), &[nft_auth_bump]];

    if is_eligible_for_reward && staking_active 
    {
        mint_to(ctx.accounts.mint_token_ctx().with_signer(&[&token_auth_seed[..]]), reward_tokens)?;
    }

    transfer(ctx.accounts.transfer_nft_ctx().with_signer(&[&nft_auth_seed[..]]), 1)?;

    close_account(ctx.accounts.close_account_ctx().with_signer(&[&nft_auth_seed[..]]))?;
    
    Ok(())
}
```

### close_staking
#### Context
`#[derive(Accounts)]`: The `Accounts` derive macro is used to define the accounts required for the `CloseStaking` struct.<br>
`stake_details`: A mutable account representing staking details. Seeds include 'STAKE', `collection`, and `creator` public keys. Uses a specified bump seed (`stake_bump`). Requires an associated account with the `creator`.<br>
`token_mint`: A mutable account representing the mint of the reward token. The authority to mint is given by the `token_authority` account.<br>
`token_authority`: An unchecked account used to set the authority for the reward token. Seeds include 'TOKEN_AUTHORITY' and `stake_details`.<br>
`creator`: A signer representing the account that initiated staking.<br>
`token_program`: A program account representing the Token program.<br>
`CloseStaking Impl`: Generates a `CpiContext` for transferring authority to the `token_mint`.
```
#[derive(Accounts)]
pub struct CloseStaking<'info> 
{
    #[account(mut, seeds = [STAKE, stake_details.collection.as_ref(), stake_details.creator.as_ref()], bump = stake_details.stake_bump, has_one = creator)]
    pub stake_details: Account<'info, Details>,

    #[account(mut, mint::authority = token_authority)]
    pub token_mint: Account<'info, Mint>,

    /// CHECK: This account is not read or written
    #[account(seeds = [TOKEN_AUTHORITY, stake_details.key().as_ref()], bump = stake_details.token_auth_bump)]
    pub token_authority: UncheckedAccount<'info>,

    pub creator: Signer<'info>,
    pub token_program: Program<'info, Token>
}

impl<'info> CloseStaking<'info> 
{
    pub fn transfer_auth_ctx(&self) -> CpiContext<'_, '_, '_, 'info, SetAuthority<'info>> 
    {
        let cpi_accounts = SetAuthority 
        {
            account_or_mint: self.token_mint.to_account_info(),
            current_authority: self.token_authority.to_account_info()
        };
    
        let cpi_program = self.token_program.to_account_info();

        CpiContext::new(cpi_program, cpi_accounts)
    }
}
```

#### Function
`ctx`: A context object containing the accounts required for the staking closure operation.<br>
Logic - Gets necessary information from staking details. Checks if staking is active; else, returns `StakeError::StakingInactive`. Defines a seed for the token authority. Calls the `set_authority` function using a CPI (Cross-Program Invocation) context to transfer authority for minting tokens. The new authority is set to the `creator`. Calls the `close_staking` method on the `stake_details` account.
```
pub fn close_staking_handler(ctx: Context<CloseStaking>) -> Result<()> 
{
    let stake_details = &ctx.accounts.stake_details;

    let staking_status = stake_details.is_active;
    let token_auth_bump = stake_details.token_auth_bump;
    let stake_details_key = stake_details.key();
    let creator = ctx.accounts.creator.key();

    require_eq!(staking_status, true, StakeError::StakingInactive);

    let token_auth_seed = &[&TOKEN_AUTHORITY[..], &stake_details_key.as_ref(), &[token_auth_bump]];

    set_authority(
        ctx.accounts.transfer_auth_ctx().with_signer(&[&token_auth_seed[..]]),
        AuthorityType::MintTokens,
        Some(creator)
    )?;

    ctx.accounts.stake_details.close_staking()
}
```

## Step 7 - Tests
### Dependencies
The script uses various packages from the `@coral-xyz/anchor`, `@solana/web3.js`, and `@solana/spl-token` libraries. These libraries facilitate interaction with the Solana blockchain and provide helper functions for working with Solana programs and tokens.
```
import * as anchor from "@coral-xyz/anchor";
import { Program, utils, BN } from "@coral-xyz/anchor";
import { Staking } from "../target/types/staking";
import {PublicKey} from "@solana/web3.js";
import * as token from "@solana/spl-token";
```

### Constants
`collectionAddress`, `tokenMint`, and `tokenAccount`: Public keys representing the Mint address of the NFT collection, the Mint of the reward token, and the token account for the reward token, respectively.<br>
`nftMint`, `nftToken`, `nftMetadata`, and `nftEdition`: Public keys representing the NFT Mint, token, metadata, and edition for the staking collection.
```
//constants
const collectionAddress = new PublicKey(""); // Mint Address of the Collection NFT for which the staking to be activated
const tokenMint = new PublicKey(""); // Mint of the Token to be given as reward
const tokenAccount = new PublicKey(""); // Token account for the reward token

// NFT of the collection - must be owned by the Signer
const nftMint = new PublicKey("");
const nftToken = new PublicKey("");
const nftMetadata = new PublicKey("")
const nftEdition = new PublicKey("");
```

### Anchor Setup
The script sets up the Anchor provider using `anchor.setProvider(anchor.AnchorProvider.env())` to use the local environment.
The Staking program is instantiated using `anchor.workspace.Staking as Program<Staking>`.<br>
Constant values for `programId`, `stakeDetails`, `tokenAuthority`, `nftAuthority` and `nftRecord` are derived using `PublicKey.findProgramAddressSync()`.<br>
`nftCustody` is obtained using `token.getAssociatedTokenAddressSync()`.
```
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
```

### Staking Workflow Tests
The script contains several `it` blocks, each representing a test case for the staking workflow. The tests are as follows:
#### Initialize Staking
Calls `initStaking` method. Checks and prints the resulting transaction and staking details.
```
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
```

#### Stake NFT
Calls `stake` method with NFT from the first collection. Checks and prints the resulting transaction, staking details, and NFT record.
```
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
```

#### Claim Rewards without Unstaking
Checks the time the NFT was staked. Calls `withdrawReward` method. Checks and prints the resulting transaction and updated staking details.
```
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
```

#### Claim Rewards and Unstake
Checks the time the NFT was staked. Calls `unstake` method. Checks and prints the resulting transaction.
```
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
```

#### Close Staking
Calls `closeStaking` method. Checks and prints the resulting transaction.
```
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
```

# How to Stake Token (under Token Staking)
## Step 1 - Project Setup
Create a new anchor project using `anchor init [project_name]`, paste the following dependencies under Corgo.toml
```
[dependencies]
anchor-lang = {version = "0.29.0" }
anchor-spl = { version = "0.29.0" }
ahash = "=0.8.4"
```
Then open Anchor.toml and change cluster to `Devnet`

## Step 2 - Structs
### Pool
#### Pool Account
`admin`: A public key (`Pubkey`) representing the administrator of the pool. `start_slot`: A `u64` representing the starting slot of the pool. `end_slot`: A `u64` representing the ending slot of the pool. `token`: A public key (`Pubkey`) representing the associated token for the pool.
```
#[account]
pub struct Pool
{
    pub admin: Pubkey,
    pub start_slot: u64,
    pub end_slot: u64,
    pub token: Pubkey
}
```

#### Pool Implementation
`LEN`: A constant `usize` representing the length of the serialized data for the `Pool` account. The length is calculated based on the sizes of the individual fields: 32 bytes for `admin`, 8 bytes for `start_slot`, 8 bytes for `end_slot`, and 32 bytes for `token`. This constant can be useful when working with serialization and deserialization of the account data.
```
impl Pool
{
    pub const LEN: usize = 32 + 8 + 8 + 32;
}
```

### User
#### User Account
`amount`: A `u64` representing the amount of some asset held by the user in the associated program. `reward_debt`: A `u64` representing the user's reward debt in the associated program. This could be related to a staking or yield farming scenario, where users earn rewards over time. `deposit_slot`: A `u64` representing the slot when the user made a deposit or interacted with the program. This information might be useful for tracking the user's activity over time.
```
#[account]
pub struct User 
{
    pub amount: u64,
    pub reward_debt: u64,
    pub deposit_slot: u64
}
```

#### User Implementation
`LEN`: A constant `usize` representing the length of the serialized data for the `User` account. The length is calculated based on the sizes of the individual fields: 8 bytes for `amount`, 8 bytes for `reward_debt`, and 8 bytes for `deposit_slot`. This constant can be useful when working with serialization and deserialization of the account data.
```
impl User 
{
    pub const LEN: usize = 8 + 8 + 8;
}
```

## Step 3 - Contexts and Functions
### initialize
#### Context
This Rust code defines the `Initialize` struct using the `#[derive(Accounts)]` attribute, which is part of the Solana Anchor framework.<br>
`admin`: A mutable signer account (`Signer`) representing the administrator's account. <br>
`pool_info`: An initialized account (`init`) for the `Pool` struct, paid for by the `admin` account, with space allocated for the serialized data (8 + Pool::LEN). This account is used to store information about the pool being initialized. <br>
`staking_token`: A mutable interface account (`InterfaceAccount`) for the `Mint` associated with the staking token. This account is used to interact with the staking token's mint.<br>
`admin_staking_wallet`: A mutable interface account (`InterfaceAccount`) for the user's wallet, associated with the staking token. This account is used for staking and may receive staking rewards.<br>
`system_program`: A program account (`Program`) for the Solana system program, used for system-level operations.
```
#[derive(Accounts)]
pub struct Initialize<'info>
{
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(init, payer = admin, space = 8 + Pool::LEN)]
    pub pool_info: Account<'info, Pool>,
    #[account(mut)]
    pub staking_token: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub admin_staking_wallet: InterfaceAccount<'info, TokenAccount>,
    pub system_program: Program<'info, System>
}
```

#### Function
This function, `initialize`, is the logic for initializing the pool using the provided context (`Context<Initialize>`) and input parameters `start_slot` and `end_slot`. <br>
Logic - It retrieves a mutable reference to the `pool_info` account from the context. It sets the `admin`, `start_slot`, `end_slot`, and `token` fields of the `pool_info` account based on the provided parameters and accounts from the context. The function returns a `Result<(), ProgramError>`, indicating success or failure.
```
pub fn initialize(ctx: Context<Initialize>, start_slot: u64, end_slot: u64) -> Result<()> {
    let pool_info = &mut ctx.accounts.pool_info;

    pool_info.admin = ctx.accounts.admin.key();
    pool_info.start_slot = start_slot;
    pool_info.end_slot = end_slot;
    pool_info.token = ctx.accounts.staking_token.key();

    Ok(())
}
```

### stake
#### Context
This Rust code defines a Solana Anchor account structure named `Stake`. This structure is used for staking functionality and contains various accounts necessary for the staking operation. <br>
`user`: A mutable signer account (`Signer`) representing the user performing the stake.<br>
`admin`: A mutable account information (`AccountInfo`) for administrative purposes.<br>
`user_info`: An initialized account (`init`) for the `User` struct, paid for by the `user` account, with space allocated for the serialized data (8 + User::LEN). This account stores information about the user's staking activity.<br>
`user_staking_wallet`: A mutable interface account (`InterfaceAccount`) for the user's staking wallet (`TokenAccount`). This account is used to hold staked tokens.<br>
`admin_staking_wallet`: A mutable interface account (`InterfaceAccount`) for the administrator's staking wallet (`TokenAccount`). This account is used for transferring staked tokens.<br>
`staking_token`: A mutable interface account (`InterfaceAccount`) for the staking token's mint (`Mint`). This account represents the staking token associated with the staking process.<br>
`token_program`: An interface for the Solana Token Program, used for token-related operations.<br>
`system_program`: A program account for the Solana System Program, used for system-level operations.
```
#[derive(Accounts)]
pub struct Stake<'info>
{
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub admin: AccountInfo<'info>,
    #[account(init, payer = user, space = 8 + User::LEN)]
    pub user_info: Account<'info, User>,
    #[account(mut)]
    pub user_staking_wallet: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub admin_staking_wallet: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub staking_token: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>
}
```

#### Function
This function, `stake`, is the logic for staking tokens using the provided context (`Context<Stake>`) and the input parameter `amount`. <br>
Logic - It retrieves a mutable reference to the `user_info` account from the context. It checks if the user has previously staked any amount. If yes, it calculates the reward based on the difference between the current slot and the deposit slot, subtracting the reward debt. Then, it mints the reward tokens to the user's staking wallet. It transfers the specified amount of tokens from the user's staking wallet to the administrator's staking wallet. It updates the user's staking information, including the staked amount, deposit slot, and resets the reward debt. The function returns a `Result<(), ProgramError>`, indicating success or failure.
```
pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
    let user_info = &mut ctx.accounts.user_info;
    let clock = Clock::get()?;

    if user_info.amount > 0 {
        let reward = (clock.slot - user_info.deposit_slot) - user_info.reward_debt;
        let cpi_accounts = MintTo {
            mint: ctx.accounts.staking_token.to_account_info(),
            to: ctx.accounts.user_staking_wallet.to_account_info(),
            authority: ctx.accounts.admin.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::mint_to(cpi_ctx, reward)?;
    }

    let cpi_accounts = Transfer {
        from: ctx.accounts.user_staking_wallet.to_account_info(),
        to: ctx.accounts.admin_staking_wallet.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };

    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    user_info.amount += amount;
    user_info.deposit_slot = clock.slot;
    user_info.reward_debt = 0;

    Ok(())
}
```

### unstake
#### Context
This Rust code defines a Solana Anchor account structure named `Unstake`. This structure is used for unstaking functionality and contains various accounts necessary for the unstaking operation.<br>
`user`: A mutable account information (`AccountInfo`) representing the user account.<br>
`admin`: A mutable account information (`AccountInfo`) representing the administrator's account.<br>
`user_info`: A mutable account (`Account`) for the `User` struct, containing information about the user's staking activity.<br>
`user_staking_wallet`: A mutable interface account (`InterfaceAccount`) for the user's staking wallet (`TokenAccount`). This account holds the staked tokens.<br>
`admin_staking_wallet`: A mutable interface account (`InterfaceAccount`) for the administrator's staking wallet (`TokenAccount`). This account is used for transferring staked tokens.<br>
`staking_token`: A mutable interface account (`InterfaceAccount`) for the staking token's mint (`Mint`). This account represents the staking token associated with the unstaking process.<br>
`token_program`: An interface for the Solana Token Program, used for token-related operations.
```
#[derive(Accounts)]
pub struct Unstake<'info>
{
    #[account(mut)]
    pub user: AccountInfo<'info>,
    #[account(mut)]
    pub admin: AccountInfo<'info>,
    #[account(mut)]
    pub user_info: Account<'info, User>,
    #[account(mut)]
    pub user_staking_wallet: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub admin_staking_wallet: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub staking_token: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>
}
```

#### Function
This function, `unstake`, is the logic for unstaking tokens using the provided context (`Context<Unstake>`). <br>
Logic - It retrieves a mutable reference to the `user_info` account from the context. It calculates the reward based on the difference between the current slot and the deposit slot, subtracting the reward debt. It mints the reward tokens to the user's staking wallet using the Solana Token Program's `mint_to` instruction. It transfers the staked amount of tokens from the administrator's staking wallet to the user's staking wallet using the Solana Token Program's `transfer` instruction. It updates the user's staking information, setting the staked amount, deposit slot, and reward debt to zero. The function returns a `Result<(), ProgramError>`, indicating success or failure.
```
pub fn unstake(ctx: Context<Unstake>) -> Result<()>
{
    let user_info = &mut ctx.accounts.user_info;
    let clock = Clock::get()?;
    let reward = (clock.slot - user_info.deposit_slot) - user_info.reward_debt;

    let cpi_accounts = MintTo {
        mint: ctx.accounts.staking_token.to_account_info(),
        to: ctx.accounts.user_staking_wallet.to_account_info(),
        authority: ctx.accounts.admin.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::mint_to(cpi_ctx, reward)?;

    let cpi_accounts = Transfer {
        from: ctx.accounts.admin_staking_wallet.to_account_info(),
        to: ctx.accounts.user_staking_wallet.to_account_info(),
        authority: ctx.accounts.admin.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, user_info.amount)?;

    user_info.amount = 0;
    user_info.deposit_slot = 0;
    user_info.reward_debt = 0;

    Ok(())
}
```

### claim_reward
#### Context
This Rust code defines a Solana Anchor account structure named `ClaimReward`. This structure is used for claiming rewards and contains various accounts necessary for the claim reward operation.<br>
`user`: A mutable account information (`AccountInfo`) representing the user account.<br>
`admin`: A mutable account information (`AccountInfo`) representing the administrator's account.<br>
`user_info`: A mutable account (`Account`) for the `User` struct, containing information about the user's staking activity.<br>
`user_staking_wallet`: A mutable interface account (`InterfaceAccount`) for the user's staking wallet (`TokenAccount`). This account holds the staked tokens.<br>
`admin_staking_wallet`: A mutable interface account (`InterfaceAccount`) for the administrator's staking wallet (`TokenAccount`). This account is used for transferring staked tokens.<br>
`staking_token`: A mutable interface account (`InterfaceAccount`) for the staking token's mint (`Mint`). This account represents the staking token associated with the reward claim process.<br>
`token_program`: An interface for the Solana Token Program, used for token-related operations.
```
#[derive(Accounts)]
pub struct ClaimReward<'info>
{
    #[account(mut)]
    pub user: AccountInfo<'info>,
    #[account(mut)]
    pub admin: AccountInfo<'info>,
    #[account(mut)]
    pub user_info: Account<'info, User>,
    #[account(mut)]
    pub user_staking_wallet: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub admin_staking_wallet: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub staking_token: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>
}
```

#### Function
This function, `claim_reward`, is the logic for claiming rewards using the provided context (`Context<ClaimReward>`). <br>
Logic - It retrieves a mutable reference to the `user_info` account from the context. It calculates the reward based on the difference between the current slot and the deposit slot, subtracting the reward debt. It mints the calculated reward tokens to the user's staking wallet using the Solana Token Program's `mint_to` instruction. It updates the user's reward debt, adding the calculated reward to the existing debt. The function returns a `Result<(), ProgramError>`, indicating success or failure.
```
pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<()>
{
    let user_info = &mut ctx.accounts.user_info;
    let clock = Clock::get()?;
    let reward = (clock.slot - user_info.deposit_slot) - user_info.reward_debt;

    let cpi_accounts = MintTo {
        mint: ctx.accounts.staking_token.to_account_info(),
        to: ctx.accounts.user_staking_wallet.to_account_info(),
        authority: ctx.accounts.admin.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::mint_to(cpi_ctx, reward)?;

    user_info.reward_debt += reward;

    Ok(())
}
```

## Step 4 - Tests
### Dependencies
`@coral-xyz/anchor`: The anchor framework for Solana. <br>
`@solana/web3.js`: The Solana JavaScript library.<br>
`@solana/spl-token`: The Solana SPL Token library.<br>
`chai`: A testing library for JavaScript.
```
import { join } from "path";
import { readFileSync } from "fs";
import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, Token } from "@solana/spl-token";
import { TokenStaking } from "../target/types/token_staking";
import { assert } from "chai";
```

### Test Setup
#### Provider and Program Initialization
Initializes the Solana provider using `anchor.AnchorProvider.env()`.<br>
Sets the provider using `anchor.setProvider(provider)`.<br>
Retrieves the `TokenStaking` program from the `anchor.workspace`.
```
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.TokenStaking as Program<TokenStaking>;
```

#### Key Pair and Account Initialization
Loads the administrator's key pair from a Solana wallet file.<br>
Generates key pairs for the user, pool, and another user.<br>
Initializes `token`, `adminTokenAccount`, and `userTokenAccount` for managing tokens.
```
  const WALLET_PATH = "id.json";
  const admin = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(readFileSync(WALLET_PATH, { encoding: "utf-8" })))
  );
  const userPK = Keypair.generate();
  const pool = Keypair.generate();
  const user = Keypair.generate();

  let token: Token;
  let adminTokenAccount: PublicKey;
  let userTokenAccount: PublicKey;
```

#### Airdrop SOL
Requests airdrop of 10 SOL to the generated user's public key.
```
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        userPK.publicKey,
        10 * LAMPORTS_PER_SOL
      ),
      "confirmed"
    );
```

#### Token Minting and Transfer
Creates a new token mint using `Token.createMint`.<br>
Creates admin and user token accounts using `token.createAccount`.<br>
Mints 1e10 (10 billion) tokens to the user's token account.
```
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
```

### Test Cases
#### Initialize
Verifies that the admin token account has a balance of 0. <br>
Calls the `initialize` method of the program, initializing staking with start and end slots.<br>
Prints the transaction signature.
```
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
```

#### Stake
Verifies that the user token account has a balance of 1e10 tokens.<br>
Calls the `stake` method of the program, staking 1e10 tokens for the user.<br>
Verifies that the admin token account now has a balance of 1e10 tokens.<br>
Prints the transaction signature.
```
  it("Stake", async () =>
  {
    let _userTokenAccount = await token.getAccountInfo(userTokenAccount);
    assert.strictEqual(_userTokenAccount.amount.toNumber(), 1e10);

    const tx = await program.methods
      .stake(new BN(1e10))
      .accounts({
        user: userPK.publicKey,
        admin: admin.publicKey,
        userInfo: user.publicKey,
        userStakingWallet: userTokenAccount,
        adminStakingWallet: adminTokenAccount,
        stakingToken: token.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([userPK, user])
      .rpc();
    console.log("Tx Sig", tx);

    let _adminTokenAccount = await token.getAccountInfo(adminTokenAccount);
    assert.strictEqual(_adminTokenAccount.amount.toNumber(), 1e10);
  });
```

#### Claim Reward
Verifies that the admin token account has a balance of 1e10 tokens.<br>
Calls the `claimReward` method of the program, claiming rewards for the user.<br>
Verifies that the user token account now has a balance of 1 token.<br>
Prints the transaction signature.
```
  it("Claim Reward", async () =>
  {
    let _adminTokenAccount = await token.getAccountInfo(adminTokenAccount);
    assert.strictEqual(_adminTokenAccount.amount.toNumber(), 1e10);

    const tx = await program.methods
      .claimReward()
      .accounts({
        user: userPK.publicKey,
        admin: admin.publicKey,
        userInfo: user.publicKey,
        userStakingWallet: userTokenAccount,
        adminStakingWallet: adminTokenAccount,
        stakingToken: token.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    console.log("Tx Sig", tx);

    let _userTokenAccount = await token.getAccountInfo(userTokenAccount);
    assert.strictEqual(_userTokenAccount.amount.toNumber(), 1);
  });
```

#### Unstake
Verifies that the admin token account has a balance of 1e10 tokens.<br>
Calls the `unstake` method of the program, unstaking tokens for the user.<br>
Verifies that the user token account now has a balance of 1e10 + 2 tokens.<br>
Prints the transaction signature.
```
  it("Unstake", async () =>
  {
    let _adminTokenAccount = await token.getAccountInfo(adminTokenAccount);
    assert.strictEqual(_adminTokenAccount.amount.toNumber(), 1e10);

    const tx = await program.methods
      .unstake()
      .accounts({
        user: userPK.publicKey,
        admin: admin.publicKey,
        userInfo: user.publicKey,
        userStakingWallet: userTokenAccount,
        adminStakingWallet: adminTokenAccount,
        stakingToken: token.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    console.log("Tx Sig", tx);

    let _userTokenAccount = await token.getAccountInfo(userTokenAccount);
    assert.strictEqual(_userTokenAccount.amount.toNumber(), 1e10 + 2);
  });
```
