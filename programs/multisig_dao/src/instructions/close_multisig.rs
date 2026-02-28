use anchor_lang::prelude::*;
use anchor_lang::system_program;

/// Close a multisig account and recover rent
/// 
/// This forcibly closes any account at the multisig PDA,
/// even if it's malformed. Useful for cleanup.
#[derive(Accounts)]
pub struct CloseMultisig<'info> {
    /// CHECK: We're forcibly closing this, even if malformed
    #[account(
        mut,
        seeds = [b"multisig", authority.key().as_ref()],
        bump
    )]
    pub multisig: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CloseMultisig>) -> Result<()> {
    // Transfer all lamports from multisig to authority
    let multisig_lamports = ctx.accounts.multisig.lamports();
    
    **ctx.accounts.multisig.try_borrow_mut_lamports()? -= multisig_lamports;
    **ctx.accounts.authority.try_borrow_mut_lamports()? += multisig_lamports;
    
    // Zero out the data
    ctx.accounts.multisig.assign(&System::id());
    ctx.accounts.multisig.realloc(0, false)?;
    
    Ok(())
}
