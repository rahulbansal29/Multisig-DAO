use anchor_lang::prelude::*;

/// Multisig configuration and state
/// 
/// PDA Seeds: ["multisig", authority.key()]
/// 
/// This account stores the core multisig configuration including
/// authorized signers and approval threshold. It's designed to be
/// immutable after initialization to prevent governance attacks.
#[account]
#[derive(Default)]
pub struct Multisig {
    /// Authority that created this multisig (for tracking)
    pub authority: Pubkey,
    
    /// List of authorized signers (max 10 for compute efficiency)
    pub signers: Vec<Pubkey>,
    
    /// Minimum signatures required (M in M-of-N)
    pub threshold: u8,
    
    /// Total number of proposals created (used for unique seeds)
    pub proposal_count: u64,
    
    /// Bump seed for PDA derivation
    pub bump: u8,
    
    /// Bump seed for vault PDA
    pub vault_bump: u8,
}

impl Multisig {
    /// Calculate space needed for this account
    /// 
    /// Layout:
    /// - 8 bytes: discriminator (Anchor)
    /// - 32 bytes: authority pubkey
    /// - 4 + (32 * signers.len()): signers vector
    /// - 1 byte: threshold
    /// - 8 bytes: proposal_count
    /// - 1 byte: bump
    /// - 1 byte: vault_bump
    pub const fn space(signer_count: usize) -> usize {
        8 + // discriminator
        32 + // authority
        4 + (32 * signer_count) + // signers vec
        1 + // threshold
        8 + // proposal_count
        1 + // bump
        1 // vault_bump
    }

    /// Validate signer is authorized
    pub fn is_signer(&self, signer: &Pubkey) -> bool {
        self.signers.contains(signer)
    }

    /// Validate threshold configuration
    pub fn validate_threshold(&self) -> bool {
        self.threshold > 0 && (self.threshold as usize) <= self.signers.len()
    }
}

/// Proposal state and metadata
/// 
/// PDA Seeds: ["proposal", multisig.key(), proposal_index.to_le_bytes()]
/// 
/// Each proposal represents a single transaction to be executed
/// by the multisig after reaching the approval threshold.
/// 
/// State Machine:
/// Created -> Approved/Rejected -> Executed (if approved)
/// Created -> Expired (if past expiry timestamp)
#[account]
#[derive(Default)]
pub struct Proposal {
    /// Index/ID of this proposal
    pub index: u64,
    
    /// Associated multisig account
    pub multisig: Pubkey,
    
    /// Creator of the proposal
    pub creator: Pubkey,
    
    /// Serialized instruction data to execute
    /// Limited to 1000 bytes for compute efficiency
    pub instruction_data: Vec<u8>,
    
    /// Signers who have approved
    pub approved_signers: Vec<Pubkey>,
    
    /// Execution status
    pub executed: bool,
    
    /// Rejection status
    pub rejected: bool,
    
    /// Expiry timestamp (Unix timestamp)
    pub expiry: i64,
    
    /// Creation timestamp
    pub created_at: i64,
    
    /// Execution timestamp (0 if not executed)
    pub executed_at: i64,
    
    /// Bump seed for PDA
    pub bump: u8,
}

impl Proposal {
    /// Maximum instruction data size (1KB for compute efficiency)
    pub const MAX_INSTRUCTION_SIZE: usize = 1000;

    /// Calculate space needed for this account
    /// 
    /// We allocate max space upfront to avoid reallocation
    pub const fn space() -> usize {
        8 + // discriminator
        8 + // index
        32 + // multisig
        32 + // creator
        4 + Self::MAX_INSTRUCTION_SIZE + // instruction_data
        4 + (32 * 10) + // approved_signers (max 10)
        1 + // executed
        1 + // rejected
        8 + // expiry
        8 + // created_at
        8 + // executed_at
        1 // bump
    }

    /// Check if proposal has expired
    pub fn is_expired(&self, current_time: i64) -> bool {
        current_time > self.expiry
    }

    /// Check if proposal can be executed
    pub fn can_execute(&self, threshold: u8, current_time: i64) -> bool {
        !self.executed 
            && !self.rejected 
            && !self.is_expired(current_time)
            && self.approved_signers.len() >= threshold as usize
    }

    /// Check if signer already approved
    pub fn has_approved(&self, signer: &Pubkey) -> bool {
        self.approved_signers.contains(signer)
    }

    /// Add approval from signer
    pub fn add_approval(&mut self, signer: Pubkey) {
        if !self.has_approved(&signer) {
            self.approved_signers.push(signer);
        }
    }
}
