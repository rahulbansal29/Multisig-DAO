use anchor_lang::prelude::*;
use crate::{errors::MultisigError, events::ProposalApproved, state::{Multisig, Proposal}};

/// Approve a proposal
/// 
/// An authorized signer can approve a proposal, adding their signature
/// to the approved_signers list. Once the threshold is reached, the
/// proposal can be executed.
/// 
/// Security Validations:
/// 1. Signer must be authorized in multisig
/// 2. Signer must not have already approved
/// 3. Proposal must not be expired
/// 4. Proposal must not be executed
/// 5. Proposal must not be rejected
#[derive(Accounts)]
pub struct ApproveProposal<'info> {
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

pub fn handler(ctx: Context<ApproveProposal>) -> Result<()> {
    let multisig = &ctx.accounts.multisig;
    let proposal = &mut ctx.accounts.proposal;
    let clock = Clock::get()?;

    // Validate signer is authorized
    require!(
        multisig.is_signer(&ctx.accounts.signer.key()),
        MultisigError::UnauthorizedSigner
    );

    // Validate proposal state
    require!(
        !proposal.is_expired(clock.unix_timestamp),
        MultisigError::ProposalExpired
    );
    require!(
        !proposal.executed,
        MultisigError::ProposalAlreadyExecuted
    );
    require!(!proposal.rejected, MultisigError::ProposalRejected);

    // Prevent duplicate approval
    require!(
        !proposal.has_approved(&ctx.accounts.signer.key()),
        MultisigError::AlreadyApproved
    );

    // Add approval
    proposal.add_approval(ctx.accounts.signer.key());

    // Emit approval event
    emit!(ProposalApproved {
        proposal: proposal.key(),
        multisig: multisig.key(),
        signer: ctx.accounts.signer.key(),
        approvals_count: proposal.approved_signers.len() as u8,
        threshold: multisig.threshold,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
