use anchor_lang::prelude::*;
use crate::{errors::MultisigError, events::ProposalRejected, state::{Multisig, Proposal}};

/// Reject a proposal
/// 
/// An authorized signer can reject a proposal, marking it as rejected
/// and preventing future execution. This provides a veto mechanism.
/// 
/// Security Validations:
/// 1. Signer must be authorized in multisig
/// 2. Proposal must not be already executed
/// 3. Proposal must not be already rejected
#[derive(Accounts)]
pub struct RejectProposal<'info> {
    pub multisig: Account<'info, Multisig>,

    #[account(
        mut,
        seeds = [
            b"proposal",
            proposal.multisig.as_ref(),
            proposal.index.to_le_bytes().as_ref()
        ],
        bump = proposal.bump,
        constraint = proposal.multisig == multisig.key()
    )]
    pub proposal: Account<'info, Proposal>,

    pub signer: Signer<'info>,
}

pub fn handler(ctx: Context<RejectProposal>) -> Result<()> {
    let multisig = &ctx.accounts.multisig;
    let proposal = &mut ctx.accounts.proposal;

    // Validate signer is authorized
    require!(
        multisig.is_signer(&ctx.accounts.signer.key()),
        MultisigError::UnauthorizedSigner
    );

    // Validate proposal state
    require!(
        !proposal.executed,
        MultisigError::ProposalAlreadyExecuted
    );
    require!(!proposal.rejected, MultisigError::ProposalRejected);

    // Mark as rejected
    proposal.rejected = true;

    // Emit rejection event
    emit!(ProposalRejected {
        proposal: proposal.key(),
        multisig: multisig.key(),
        rejector: ctx.accounts.signer.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
