use anchor_lang::prelude::*;
pub mod instructions;
pub mod state;
pub use instructions::*;

declare_id!("3uWZFQbWgnS21gQeFXC1J1ZKyGqhAaWs58LwBt7fx1Gv");

#[program]
pub mod token_staking 
{
    use super::*;
    pub fn initialize(ctx: Context<Initialize>, start_slot: u64, end_slot: u64) -> Result<()> 
    {
        initialize::initialize(ctx, start_slot, end_slot)
    }

    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> 
    {
        stake::stake(ctx, amount)
    }

    pub fn unstake(ctx: Context<Unstake>) -> Result<()> 
    {
        unstake::unstake(ctx)
    }

    pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<()> 
    {
        claim_reward::claim_reward(ctx)
    }
}