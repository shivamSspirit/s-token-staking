use anchor_lang::prelude::*;

declare_id!("Cc8FYApv9NmyXQ4WjQLmFp5JmvN5uV15HbvzgT6ejQsj");

#[program]
pub mod sol_examples {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
