use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::{errors::MultisigError, events::ProposalExecuted, state::{Multisig, Proposal}};

/// Execute an approved proposal and transfer funds
/// 
/// Once a proposal has reached the approval threshold, any authorized
/// signer can execute it to immediately transfer the treasury funds.
/// 
/// The proposal.instruction_data contains:
/// {
///   "description": "...",
///   "recipient": "...",
///   "amount": amount_in_lamports
/// }
/// 
/// Security Validations:
/// 1. Proposal must have reached threshold
/// 2. Proposal must not be expired
/// 3. Proposal must not be already executed
/// 4. Proposal must not be rejected
/// 5. Vault must have sufficient balance
/// 6. Marks proposal as executed to prevent replay
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

    /// Treasury vault that will send the funds
    /// CHECK: This is the vault PDA that holds treasury funds
    #[account(
        mut,
        seeds = [b"vault", multisig.key().as_ref()],
        bump = multisig.vault_bump
    )]
    pub vault: UncheckedAccount<'info>,

    /// Recipient of the transfer
    /// CHECK: Can be any account
    #[account(mut)]
    pub recipient: UncheckedAccount<'info>,

    pub executor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ExecuteProposal>) -> Result<()> {
    let multisig = &ctx.accounts.multisig;
    let proposal = &mut ctx.accounts.proposal;
    let clock = Clock::get()?;

    // Validate executor is an authorized signer
    require!(
        multisig.is_signer(&ctx.accounts.executor.key()),
        MultisigError::UnauthorizedSigner
    );

    // Validate proposal can be executed
    require!(
        proposal.can_execute(multisig.threshold, clock.unix_timestamp),
        MultisigError::InsufficientApprovals
    );

    // Additional explicit checks
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

    // Parse instruction data to get transfer amount
    let instruction_data_str = String::from_utf8(proposal.instruction_data.clone())
        .unwrap_or_default();
    
    let amount: u64 = instruction_data_str
        .split("\"amount\":")
        .nth(1)
        .and_then(|s| s.split('}').next())
        .and_then(|s| s.trim().parse().ok())
        .unwrap_or(0);

    // Validate vault has sufficient balance
    let vault_balance = ctx.accounts.vault.lamports();
    require!(
        vault_balance >= amount,
        MultisigError::InsufficientBalance
    );

    // Mark proposal as executed (replay protection)
    proposal.executed = true;
    proposal.executed_at = clock.unix_timestamp;

    // Execute the transfer using vault as signer
    let multisig_key = multisig.key();
    let seeds = &[
        b"vault",
        multisig_key.as_ref(),
        &[multisig.vault_bump],
    ];
    let signer_seeds = &[&seeds[..]];

    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.recipient.to_account_info(),
        },
        signer_seeds,
    );

    system_program::transfer(transfer_ctx, amount)?;

    // Emit execution event
    emit!(ProposalExecuted {
        proposal: proposal.key(),
        multisig: multisig.key(),
        executor: ctx.accounts.executor.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
