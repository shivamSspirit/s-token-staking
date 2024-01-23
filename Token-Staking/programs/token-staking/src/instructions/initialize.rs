use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount};
use crate::state::Pool;

pub fn initialize(ctx: Context<Initialize>, start_slot: u64, end_slot: u64) -> Result<()> 
{
    let pool_info = &mut ctx.accounts.pool_info;

    pool_info.admin = ctx.accounts.admin.key();
    pool_info.start_slot = start_slot;
    pool_info.end_slot = end_slot;
    pool_info.token = ctx.accounts.staking_token.key();

    Ok(())
}

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