use anchor_lang::prelude::*;

#[account]
pub struct User 
{
    pub amount: u64,
    pub reward_debt: u64,
    pub deposit_slot: u64
}

impl User 
{
    pub const LEN: usize = 8 + 8 + 8;
}