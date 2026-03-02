use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("246LSTmpgZKDsNVsuJxmfsP22MqeMkYZRWo15majDuu7");

/// Production-grade DAO Treasury with Multisig capabilities
/// 
/// This program implements a threshold-based multisig system for managing
/// a DAO treasury that can hold SOL and SPL tokens.
/// 
/// Security Features:
/// - PDA-based vault for treasury management
/// - Threshold signature verification (M-of-N)
/// - Proposal state machine with expiry
/// - Replay attack prevention
/// - Signer uniqueness enforcement
/// - Comprehensive event emission
/// 
/// Compute Budget Considerations:
/// - Uses efficient PDA derivation
/// - Minimal account reallocation
/// - Optimized instruction data packing
#[program]
pub mod multisig_dao {
    use super::*;

    /// Initialize a new multisig treasury
    /// 
    /// # Arguments
    /// * `ctx` - Context containing all required accounts
    /// * `signers` - Array of authorized signer public keys
    /// * `threshold` - Minimum signatures required (M in M-of-N)
    /// 
    /// # Security
    /// - Validates threshold <= signers.len()
    /// - Validates threshold >= 1
    /// - Validates signer uniqueness
    /// - Vault is a PDA derived from multisig account
    pub fn initialize(
        ctx: Context<Initialize>,
        signers: Vec<Pubkey>,
        threshold: u8,
    ) -> Result<()> {
        instructions::initialize::handler(ctx, signers, threshold)
    }

    /// Create a new proposal
    /// 
    /// # Arguments
    /// * `ctx` - Context containing required accounts
    /// * `instruction_data` - Serialized instruction to execute
    /// * `expiry` - Unix timestamp when proposal expires
    /// 
    /// # Security
    /// - Only authorized signers can create proposals
    /// - Proposal stored with unique seed
    /// - Expiry must be in the future
    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        instruction_data: Vec<u8>,
        expiry: i64,
    ) -> Result<()> {
        instructions::create_proposal::handler(ctx, instruction_data, expiry)
    }

    /// Approve a proposal
    /// 
    /// # Arguments
    /// * `ctx` - Context containing required accounts
    /// 
    /// # Security
    /// - Only authorized signers can approve
    /// - Prevents duplicate approvals from same signer
    /// - Validates proposal is not expired or executed
    pub fn approve_proposal(ctx: Context<ApproveProposal>) -> Result<()> {
        instructions::approve_proposal::handler(ctx)
    }

    /// Reject a proposal
    /// 
    /// # Arguments
    /// * `ctx` - Context containing required accounts
    /// 
    /// # Security
    /// - Only authorized signers can reject
    /// - Marks proposal as rejected (cannot be executed)
    pub fn reject_proposal(ctx: Context<RejectProposal>) -> Result<()> {
        instructions::reject_proposal::handler(ctx)
    }

    /// Execute an approved proposal
    /// 
    /// # Arguments
    /// * `ctx` - Context containing required accounts
    /// 
    /// # Security
    /// - Validates threshold reached
    /// - Validates proposal not expired
    /// - Validates proposal not already executed
    /// - Executes using CPI with vault as signer
    /// - Marks as executed to prevent replay
    pub fn execute_proposal(ctx: Context<ExecuteProposal>) -> Result<()> {
        instructions::execute_proposal::handler(ctx)
    }
}
