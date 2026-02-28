use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::{errors::MultisigError, events::SolTransferred, state::Multisig};

/// Transfer SOL from the treasury vault
/// 
/// This instruction demonstrates how to transfer SOL from the vault
/// using the vault's PDA authority. It should be called as part of
/// proposal execution.
/// 
/// Security:
/// - Vault signs using PDA seeds
/// - Amount must not exceed vault balance
/// 
/// In production, this would be called via CPI during execute_proposal
/// after validating the proposal has sufficient approvals.
#[derive(Accounts)]
pub struct TransferSol<'info> {
    pub multisig: Account<'info, Multisig>,

    /// Treasury vault that will send SOL
    /// CHECK: This is the vault PDA that holds treasury funds
    #[account(
        mut,
        seeds = [b"vault", multisig.key().as_ref()],
        bump = multisig.vault_bump
    )]
    pub vault: UncheckedAccount<'info>,

    /// CHECK: Recipient can be any account
    #[account(mut)]
    pub recipient: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<TransferSol>, amount: u64) -> Result<()> {
    let multisig = &ctx.accounts.multisig;

    // Validate vault has sufficient balance
    let vault_balance = ctx.accounts.vault.lamports();
    require!(
        vault_balance >= amount,
        MultisigError::InsufficientBalance
    );

    // Create PDA signer seeds
    let multisig_key = multisig.key();
    let seeds = &[
        b"vault",
        multisig_key.as_ref(),
        &[multisig.vault_bump],
    ];
    let signer_seeds = &[&seeds[..]];

    // Transfer SOL using vault as signer
    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.recipient.to_account_info(),
        },
        signer_seeds,
    );

    system_program::transfer(transfer_ctx, amount)?;

    // Emit transfer event
    emit!(SolTransferred {
        vault: ctx.accounts.vault.key(),
        recipient: ctx.accounts.recipient.key(),
        amount,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
