use anchor_lang::prelude::*;


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

impl Details 
{
    pub const LEN: usize = 8 + 1 + 32 + 32 + 8 + 32 + 8 + 1 + 1 + 1;

    pub fn init
    (
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