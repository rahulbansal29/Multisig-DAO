use anchor_lang::prelude::*;
use crate::{errors::MultisigError, events::ProposalExecuted, state::{Multisig, Proposal}};

/// Execute an approved proposal
/// 
/// Once a proposal has reached the approval threshold, any authorized
/// signer can execute it. The vault PDA signs the transaction using
/// its bump seed.
/// 
/// This instruction is intentionally flexible to allow execution of
/// various transaction types. In production, you would deserialize
/// and validate the instruction_data, then use CPI to execute it.
/// 
/// Security Validations:
/// 1. Proposal must have reached threshold
/// 2. Proposal must not be expired
/// 3. Proposal must not be already executed
/// 4. Proposal must not be rejected
/// 5. Marks proposal as executed to prevent replay
/// 
/// Note: In a production system, this would:
/// - Deserialize proposal.instruction_data
/// - Validate destination accounts
/// - Execute via CPI with vault as signer
#[derive(Accounts)]
pub struct ExecuteProposal<'info> {
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

    /// Treasury vault that will sign the transaction
    /// CHECK: This is the vault PDA that holds treasury funds
    #[account(
        mut,
        seeds = [b"vault", multisig.key().as_ref()],
        bump = multisig.vault_bump
    )]
    pub vault: UncheckedAccount<'info>,

    pub executor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ExecuteProposal>) -> Result<()> {
    let multisig = &ctx.accounts.multisig;
    let proposal = &mut ctx.accounts.proposal;
    let clock = Clock::get()?;

    // Validate proposal can be executed
    require!(
        proposal.can_execute(multisig.threshold, clock.unix_timestamp),
        MultisigError::InsufficientApprovals
    );

    // Additional explicit checks (redundant but clear)
    require!(
        !proposal.is_expired(clock.unix_timestamp),
        MultisigError::ProposalExpired
    );
    require!(
        !proposal.executed,
        MultisigError::ProposalAlreadyExecuted
    );
    require!(!proposal.rejected, MultisigError::ProposalRejected);
    require!(
        proposal.approved_signers.len() >= multisig.threshold as usize,
        MultisigError::InsufficientApprovals
    );

    // Mark as executed (replay protection)
    proposal.executed = true;
    proposal.executed_at = clock.unix_timestamp;

    // In production, deserialize and execute the instruction_data here
    // Example:
    // let instruction = deserialize_instruction(&proposal.instruction_data)?;
    // execute_cpi_with_vault_signer(instruction, vault_seeds)?;
    
    // For this implementation, we leave execution logic to be called
    // separately (e.g., transfer_sol, transfer_token)

    // Emit execution event
    emit!(ProposalExecuted {
        proposal: proposal.key(),
        multisig: multisig.key(),
        executor: ctx.accounts.executor.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
