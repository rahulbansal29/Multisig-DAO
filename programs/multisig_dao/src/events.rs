use anchor_lang::prelude::*;

/// Emitted when a new multisig is initialized
#[event]
pub struct MultisigCreated {
    pub multisig: Pubkey,
    pub authority: Pubkey,
    pub vault: Pubkey,
    pub signers: Vec<Pubkey>,
    pub threshold: u8,
    pub timestamp: i64,
}

/// Emitted when a new proposal is created
#[event]
pub struct ProposalCreated {
    pub proposal: Pubkey,
    pub multisig: Pubkey,
    pub creator: Pubkey,
    pub index: u64,
    pub expiry: i64,
    pub timestamp: i64,
}

/// Emitted when a proposal is approved by a signer
#[event]
pub struct ProposalApproved {
    pub proposal: Pubkey,
    pub multisig: Pubkey,
    pub signer: Pubkey,
    pub approvals_count: u8,
    pub threshold: u8,
    pub timestamp: i64,
}

/// Emitted when a proposal is rejected
#[event]
pub struct ProposalRejected {
    pub proposal: Pubkey,
    pub multisig: Pubkey,
    pub rejector: Pubkey,
    pub timestamp: i64,
}

/// Emitted when a proposal is successfully executed
#[event]
pub struct ProposalExecuted {
    pub proposal: Pubkey,
    pub multisig: Pubkey,
    pub executor: Pubkey,
    pub timestamp: i64,
}

/// Emitted when SOL is transferred from the vault
#[event]
pub struct SolTransferred {
    pub vault: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

/// Emitted when SPL tokens are transferred from the vault
#[event]
pub struct TokenTransferred {
    pub vault: Pubkey,
    pub mint: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}
