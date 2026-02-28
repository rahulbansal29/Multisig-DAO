use anchor_lang::prelude::*;
use crate::{errors::MultisigError, events::MultisigCreated, state::Multisig};
use std::collections::HashSet;

/// Initialize a new multisig treasury
/// 
/// This instruction creates the core multisig account and its associated
/// treasury vault PDA. The vault is derived deterministically and will
/// hold SOL and SPL tokens controlled by the multisig.
/// 
/// PDA Derivations:
/// - Multisig: ["multisig", authority.key()]
/// - Vault: ["vault", multisig.key()]
/// 
/// Security Validations:
/// 1. Threshold must be > 0 and <= signers.len()
/// 2. Signers list must not be empty
/// 3. Signers list must not exceed 10 (compute limit)
/// 4. All signers must be unique (prevent voting manipulation)
#[derive(Accounts)]
#[instruction(signers: Vec<Pubkey>, threshold: u8)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = Multisig::space(signers.len()),
        seeds = [b"multisig", authority.key().as_ref()],
        bump
    )]
    pub multisig: Account<'info, Multisig>,

    /// Treasury vault PDA - holds SOL and SPL tokens
    /// CHECK: This is a PDA used as the treasury vault
    #[account(
        seeds = [b"vault", multisig.key().as_ref()],
        bump
    )]
    pub vault: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<Initialize>,
    signers: Vec<Pubkey>,
    threshold: u8,
) -> Result<()> {
    // Validate signers list
    require!(!signers.is_empty(), MultisigError::EmptySigners);
    require!(signers.len() <= 10, MultisigError::TooManySigners);

    // Validate threshold
    require!(
        threshold > 0 && (threshold as usize) <= signers.len(),
        MultisigError::InvalidThreshold
    );

    // Validate signer uniqueness (prevent duplicate voting)
    let unique_signers: HashSet<_> = signers.iter().collect();
    require!(
        unique_signers.len() == signers.len(),
        MultisigError::DuplicateSigner
    );

    let multisig = &mut ctx.accounts.multisig;

    // Initialize multisig state
    multisig.authority = ctx.accounts.authority.key();
    multisig.signers = signers.clone();
    multisig.threshold = threshold;
    multisig.proposal_count = 0;
    multisig.bump = ctx.bumps.multisig;
    multisig.vault_bump = ctx.bumps.vault;

    // Emit creation event
    emit!(MultisigCreated {
        multisig: multisig.key(),
        authority: multisig.authority,
        vault: ctx.accounts.vault.key(),
        signers,
        threshold,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
