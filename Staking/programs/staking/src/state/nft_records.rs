use anchor_lang::prelude::*;

#[account]
pub struct NftRecord 
{
    pub staker: Pubkey,
    pub nft_mint: Pubkey,
    pub staked_at: i64,
    pub bump: u8
}

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