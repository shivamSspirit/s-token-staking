use anchor_lang::prelude::*;
use anchor_spl::token::{self, MintTo, Transfer};
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use crate::state::User;

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

#[derive(Accounts)]
pub struct Unstake<'info> 
{
    /// CHECK:
    #[account(mut)]
    pub user: AccountInfo<'info>,
    /// CHECK:
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