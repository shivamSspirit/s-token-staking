use anchor_lang::prelude::*;
pub mod instructions;
pub use instructions::*;

declare_id!("FbZAgbRfqxAx27JYaFuBqaYieBWYoDKkkfnD8pFJriVn");

#[program]
pub mod solana_examples 
{
    use super::*;

    pub fn mint_nft(ctx: Context<MintNFT>, name: String, symbol: String, uri: String) -> Result<()> 
    {
        mint_nft::mint_nft(ctx, name, symbol, uri)
    }

    pub fn mint_token(ctx: Context<MintToken>, decimals: u8, name: String, symbol: String, uri: String, amount: u64) -> Result<()> 
    {
        mint_token::mint_token(ctx, decimals, name, symbol, uri, amount)
    }

    pub fn transfer_tokens(ctx: Context<TransferToken>, amount: u64) -> Result<()> 
    {
        transfer_token::transfer_tokens(ctx, amount)
    }
}