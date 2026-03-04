use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::Multisig;

/// Deposit SOL into the treasury vault
/// 
/// Anyone can call this to fund the DAO treasury. The deposited SOL
/// will be stored in the vault PDA and can only be withdrawn via
/// approved and executed proposals.
#[derive(Accounts)]
pub struct DepositToVault<'info> {
    pub multisig: Account<'info, Multisig>,

    /// Treasury vault that receives the deposit
    /// CHECK: This is a PDA derived from multisig that safely holds vault funds
    #[account(
        mut,
        seeds = [b"vault", multisig.key().as_ref()],
        bump = multisig.vault_bump
    )]
    pub vault: UncheckedAccount<'info>,

    /// Depositor - anyone can deposit
    #[account(mut)]
    pub depositor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<DepositToVault>,
    amount: u64,
) -> Result<()> {
    // Transfer SOL from depositor to vault
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.depositor.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        ),
        amount,
    )?;

    Ok(())
}
