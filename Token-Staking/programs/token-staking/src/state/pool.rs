use anchor_lang::prelude::*;

#[account]
pub struct Pool 
{
    pub admin: Pubkey,
    pub start_slot: u64,
    pub end_slot: u64,
    pub token: Pubkey
}

impl Pool 
{
    pub const LEN: usize = 32 + 8 + 8 + 32;
}