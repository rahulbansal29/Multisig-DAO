use anchor_lang::prelude::*;

/// Custom error codes for the multisig DAO program
#[error_code]
pub enum MultisigError {
    #[msg("Invalid threshold: must be between 1 and number of signers")]
    InvalidThreshold,
    
    #[msg("Unauthorized: signer not in authorized signers list")]
    UnauthorizedSigner,
    
    #[msg("Duplicate signer detected in signers list")]
    DuplicateSigner,
    
    #[msg("Proposal has expired and cannot be approved or executed")]
    ProposalExpired,
    
    #[msg("Proposal has already been executed")]
    ProposalAlreadyExecuted,
    
    #[msg("Proposal has been rejected and cannot be executed")]
    ProposalRejected,
    
    #[msg("Signer has already approved this proposal")]
    AlreadyApproved,
    
    #[msg("Insufficient approvals: threshold not reached")]
    InsufficientApprovals,
    
    #[msg("Instruction data exceeds maximum allowed size")]
    InstructionDataTooLarge,
    
    #[msg("Invalid expiry: must be in the future")]
    InvalidExpiry,
    
    #[msg("Empty signers list: must have at least one signer")]
    EmptySigners,
    
    #[msg("Too many signers: maximum 10 allowed")]
    TooManySigners,
    
    #[msg("Arithmetic overflow detected")]
    ArithmeticOverflow,
    
    #[msg("Invalid vault authority")]
    InvalidVaultAuthority,
    
    #[msg("Insufficient treasury balance")]
    InsufficientBalance,
}
