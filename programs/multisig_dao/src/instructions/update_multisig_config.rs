use anchor_lang::prelude::*;
use crate::{errors::MultisigError, state::Multisig};
use std::collections::HashSet;

#[derive(Accounts)]
#[instruction(signers: Vec<Pubkey>, threshold: u8)]
pub struct UpdateMultisigConfig<'info> {
    #[account(
        mut,
        realloc = Multisig::space(signers.len()),
        realloc::payer = authority,
        realloc::zero = false,
        seeds = [b"multisig", authority.key().as_ref()],
        bump = multisig.bump,
        constraint = multisig.authority == authority.key() @ MultisigError::UnauthorizedSigner
    )]
    pub multisig: Account<'info, Multisig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<UpdateMultisigConfig>,
    signers: Vec<Pubkey>,
    threshold: u8,
) -> Result<()> {
    require!(!signers.is_empty(), MultisigError::EmptySigners);
    require!(signers.len() <= 10, MultisigError::TooManySigners);
    require!(
        threshold > 0 && (threshold as usize) <= signers.len(),
        MultisigError::InvalidThreshold
    );

    let unique_signers: HashSet<_> = signers.iter().collect();
    require!(
        unique_signers.len() == signers.len(),
        MultisigError::DuplicateSigner
    );

    let multisig = &mut ctx.accounts.multisig;
    multisig.signers = signers;
    multisig.threshold = threshold;

    Ok(())
}
