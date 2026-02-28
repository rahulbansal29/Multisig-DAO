use anchor_lang::prelude::*;
use crate::{errors::MultisigError, events::ProposalCreated, state::{Multisig, Proposal}};

/// Create a new proposal for multisig execution
/// 
/// Any authorized signer can create a proposal. The proposal contains
/// serialized instruction data that will be executed if the threshold
/// is reached.
/// 
/// PDA Derivation:
/// - Proposal: ["proposal", multisig.key(), proposal_index.to_le_bytes()]
/// 
/// Security Validations:
/// 1. Creator must be an authorized signer
/// 2. Instruction data must not exceed MAX_INSTRUCTION_SIZE
/// 3. Expiry must be in the future
/// 4. Proposal gets unique index from multisig.proposal_count
#[derive(Accounts)]
pub struct CreateProposal<'info> {
    #[account(mut)]
    pub multisig: Account<'info, Multisig>,

    #[account(
        init,
        payer = creator,
        space = Proposal::space(),
        seeds = [
            b"proposal",
            multisig.key().as_ref(),
            multisig.proposal_count.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub proposal: Account<'info, Proposal>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateProposal>,
    instruction_data: Vec<u8>,
    expiry: i64,
) -> Result<()> {
    let multisig = &mut ctx.accounts.multisig;
    let proposal = &mut ctx.accounts.proposal;
    let clock = Clock::get()?;

    // Validate creator is an authorized signer
    require!(
        multisig.is_signer(&ctx.accounts.creator.key()),
        MultisigError::UnauthorizedSigner
    );

    // Validate instruction data size
    require!(
        instruction_data.len() <= Proposal::MAX_INSTRUCTION_SIZE,
        MultisigError::InstructionDataTooLarge
    );

    // Validate expiry is in the future
    require!(
        expiry > clock.unix_timestamp,
        MultisigError::InvalidExpiry
    );

    // Initialize proposal
    proposal.index = multisig.proposal_count;
    proposal.multisig = multisig.key();
    proposal.creator = ctx.accounts.creator.key();
    proposal.instruction_data = instruction_data;
    proposal.approved_signers = Vec::new();
    proposal.executed = false;
    proposal.rejected = false;
    proposal.expiry = expiry;
    proposal.created_at = clock.unix_timestamp;
    proposal.executed_at = 0;
    proposal.bump = ctx.bumps.proposal;

    // Increment proposal count (with overflow check)
    multisig.proposal_count = multisig
        .proposal_count
        .checked_add(1)
        .ok_or(MultisigError::ArithmeticOverflow)?;

    // Emit creation event
    emit!(ProposalCreated {
        proposal: proposal.key(),
        multisig: multisig.key(),
        creator: ctx.accounts.creator.key(),
        index: proposal.index,
        expiry,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
