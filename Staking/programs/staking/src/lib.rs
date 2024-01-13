use anchor_lang::prelude::*;

declare_id!("4tk9FVqHqxDaBfggxp9PXN577uuVVWBt8sfBDgu1tKRM");

#[program]
pub mod staking {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
