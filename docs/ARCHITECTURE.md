# System Architecture

## Overview

The DAO Treasury + Multisig Wallet system is a production-grade decentralized application built on Solana blockchain. It implements a threshold-based multisig mechanism for managing a DAO treasury that can hold SOL and SPL tokens.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Mobile Application                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐   │
│  │  Screens   │  │   Store    │  │    Services        │   │
│  │            │→→│  (Zustand) │→→│ - Blockchain       │   │
│  │ - Home     │  │            │  │ - Wallet           │   │
│  │ - Proposals│  │ - Wallet   │  │ - Biometric        │   │
│  │ - Create   │  │ - Multisig │  │                    │   │
│  │ - Detail   │  │ - Treasury │  └────────┬───────────┘   │
│  └────────────┘  └────────────┘           │               │
└────────────────────────────────────────────┼───────────────┘
                                             │
                    ┌────────────────────────▼────────────┐
                    │      Phantom Wallet (Deep Link)    │
                    └────────────────────────┬────────────┘
                                             │
┌────────────────────────────────────────────▼───────────────┐
│                    Solana Blockchain                       │
│  ┌─────────────────────────────────────────────────────┐  │
│  │            Multisig DAO Program (Anchor)            │  │
│  │                                                      │  │
│  │  ┌──────────────┐  ┌──────────────┐               │  │
│  │  │   Multisig   │  │    Vault     │ (PDA)         │  │
│  │  │   Account    │  │   (Treasury) │               │  │
│  │  └──────┬───────┘  └──────────────┘               │  │
│  │         │                                           │  │
│  │  ┌──────▼──────────────────────────┐               │  │
│  │  │      Proposal Accounts          │               │  │
│  │  │  - Proposal #0                  │               │  │
│  │  │  - Proposal #1                  │               │  │
│  │  │  - Proposal #N                  │               │  │
│  │  └─────────────────────────────────┘               │  │
│  └─────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### 1. Blockchain Layer (Anchor/Rust)

#### Program Structure

**Entry Point: `lib.rs`**
- Defines the program ID
- Exposes public instructions
- Contains comprehensive documentation

**State Management: `state.rs`**

##### Multisig Account
```rust
pub struct Multisig {
    pub authority: Pubkey,      // Creator
    pub signers: Vec<Pubkey>,   // Authorized signers
    pub threshold: u8,          // M in M-of-N
    pub proposal_count: u64,    // Counter for proposals
    pub bump: u8,               // PDA bump seed
    pub vault_bump: u8,         // Vault PDA bump
}
```

**PDA Derivation:** `["multisig", authority.key()]`

##### Proposal Account
```rust
pub struct Proposal {
    pub index: u64,                    // Unique ID
    pub multisig: Pubkey,              // Parent multisig
    pub creator: Pubkey,               // Proposal creator
    pub instruction_data: Vec<u8>,    // Serialized instruction
    pub approved_signers: Vec<Pubkey>, // Who approved
    pub executed: bool,                // Execution status
    pub rejected: bool,                // Rejection status
    pub expiry: i64,                   // Expiry timestamp
    pub created_at: i64,               // Creation time
    pub executed_at: i64,              // Execution time
    pub bump: u8,                      // PDA bump
}
```

**PDA Derivation:** `["proposal", multisig.key(), proposal_index.to_le_bytes()]`

##### Vault (Treasury)

The vault is a PDA that holds SOL and SPL tokens. It doesn't have custom state - it's a standard Solana account with PDA authority.

**PDA Derivation:** `["vault", multisig.key()]`

**Error Handling: `errors.rs`**
- Custom error codes for all failure scenarios
- Descriptive error messages
- Proper error propagation

**Event Emission: `events.rs`**
- MultisigCreated
- ProposalCreated
- ProposalApproved
- ProposalRejected
- ProposalExecuted
- SolTransferred
- TokenTransferred

#### Instruction Flow

##### 1. Initialize
```
User → initialize(signers, threshold)
     → Validate inputs
     → Create Multisig PDA
     → Derive Vault PDA
     → Emit MultisigCreated event
```

**Validations:**
- Threshold > 0 and <= signers.len()
- No duplicate signers
- Signers count <= 10 (compute efficiency)

##### 2. Create Proposal
```
Signer → create_proposal(instruction_data, expiry)
       → Validate signer is authorized
       → Validate expiry is future
       → Create Proposal PDA
       → Increment proposal_count
       → Emit ProposalCreated event
```

**Validations:**
- Creator is authorized signer
- Instruction data <= MAX_SIZE
- Expiry is in the future

##### 3. Approve Proposal
```
Signer → approve_proposal()
       → Validate signer is authorized
       → Check not already approved
       → Validate proposal state
       → Add to approved_signers
       → Emit ProposalApproved event
```

**State Checks:**
- Not executed
- Not rejected
- Not expired
- Signer not already approved

##### 4. Execute Proposal
```
Any User → execute_proposal()
         → Validate threshold reached
         → Validate not expired
         → Validate not executed
         → Mark as executed
         → Execute instruction via CPI
         → Emit ProposalExecuted event
```

**Critical Path:**
- Uses vault PDA as signer for CPI
- Atomic execution (reverts if instruction fails)
- Replay protection via executed flag

---

### 2. Mobile Application Layer (React Native)

#### Service Architecture

##### BlockchainService
```typescript
class BlockchainService {
  - getConnection()
  - getMultisigPDA()
  - getVaultPDA()
  - getProposalPDA()
  - getMultisig()
  - getProposal()
  - getProposals()
  - getTreasuryBalance()
  - simulateTransaction()
  - createInitializeTransaction()
  - createProposalTransaction()
  - createApproveTransaction()
  - createExecuteTransaction()
  - sendAndConfirmTransaction()
}
```

**Responsibilities:**
- RPC communication with Solana
- PDA derivation
- Transaction construction
- Account deserialization
- Balance queries

##### WalletService
```typescript
class WalletService {
  - connect() → PublicKey
  - disconnect()
  - getSavedWallet() → PublicKey | null
  - signTransaction() → Buffer
}
```

**Phantom Integration:**
- Deep linking for wallet connection
- Transaction signing via URL schemes
- Session management
- Automatic reconnection

##### BiometricService
```typescript
class BiometricService {
  - isAvailable() → boolean
  - getSupportedTypes() → AuthenticationType[]
  - authenticate() → boolean
  - authenticateForTransaction() → boolean
}
```

**Security Layer:**
- Face ID / Touch ID integration
- Fallback to device passcode
- Required for all transactions

#### State Management (Zustand)

```typescript
interface AppState {
  // Wallet
  wallet: WalletState
  connectWallet()
  disconnectWallet()
  loadSavedWallet()
  
  // Multisig
  multisig: Multisig | null
  loadMultisig()
  
  // Treasury
  treasuryBalance: TreasuryBalance | null
  loadTreasuryBalance()
  
  // Proposals
  proposals: ProposalWithKey[]
  loadProposals()
  
  // Error handling
  error: string | null
  setError()
}
```

**State Flow:**
1. Connect wallet → Load multisig
2. Load multisig → Load treasury + proposals
3. User actions → Update state → Trigger re-fetch

#### Screen Architecture

##### HomeScreen
- Dashboard overview
- Treasury balance display
- Pending proposals summary
- Quick actions

##### ProposalListScreen
- All proposals with filtering
- Status indicators
- Pull-to-refresh
- Navigation to details

##### ProposalDetailScreen
- Full proposal information
- Approval progress
- Action buttons (approve/execute)
- Transaction simulation
- Biometric confirmation

##### CreateProposalScreen
- Form for new proposals
- Input validation
- Expiry configuration
- Transaction preview

---

## Data Flow

### Proposal Lifecycle

```
1. CREATE
   ├─ Authorized signer creates proposal
   ├─ Stored on-chain with unique PDA
   └─ Status: PENDING

2. APPROVE (repeatable until threshold)
   ├─ Authorized signers approve
   ├─ Approval count incremented
   └─ Status: PENDING → APPROVED (when threshold reached)

3. EXECUTE
   ├─ Any user can execute if threshold reached
   ├─ Vault signs the transaction via PDA
   ├─ Instruction executed via CPI
   └─ Status: APPROVED → EXECUTED

Alternative Paths:
- REJECT: Any signer can reject → Status: REJECTED
- EXPIRE: Time passes expiry → Status: EXPIRED
```

### Transaction Flow

```
Mobile App
    │
    ├─ 1. Build Transaction (BlockchainService)
    ├─ 2. Request Biometric Auth (BiometricService)
    ├─ 3. Simulate Transaction (Optional)
    ├─ 4. Send to Phantom for Signing (WalletService)
    │       │
    │       ├─ User Reviews in Phantom
    │       └─ User Approves/Rejects
    │
    ├─ 5. Receive Signed Transaction
    ├─ 6. Send to Solana RPC
    ├─ 7. Confirm Transaction
    └─ 8. Update UI State
```

---

## Security Architecture

### PDA Security

**Benefits:**
- No private key management for vault
- Program has authority via seeds
- Deterministic derivation
- Cannot be frontrun or hijacked

**Implementation:**
```rust
let seeds = &[
    b"vault",
    multisig.key().as_ref(),
    &[vault_bump]
];
let signer_seeds = &[&seeds[..]];

// Use in CPI
CpiContext::new_with_signer(
    program.to_account_info(),
    accounts,
    signer_seeds
)
```

### Replay Protection

1. **Proposal Execution**
   - `executed` flag prevents re-execution
   - Atomic check-and-set operation

2. **Approval Tracking**
   - `approved_signers` vector stores who approved
   - Duplicate check before adding

3. **Expiry Enforcement**
   - Time-based validation
   - Cannot execute expired proposals

### Input Validation

**On-chain:**
- Type safety via Rust
- Anchor constraints
- Custom validation logic
- Error propagation

**Off-chain:**
- TypeScript type checking
- Runtime validation
- User input sanitization
- Public key validation

---

## Performance Considerations

### Compute Budget

**Optimizations:**
1. **Account Size**
   - Pre-allocated max size (no reallocation)
   - Efficient packing
   - Limited vector sizes

2. **Instruction Efficiency**
   - Minimal account reads
   - No unnecessary operations
   - Efficient PDA derivation

3. **Limits**
   - Max 10 signers (prevents compute issues)
   - Max 1KB instruction data
   - Max 10 approvals tracked

### Mobile Performance

1. **State Management**
   - Zustand for efficient updates
   - Selective re-renders
   - Memoization where needed

2. **Network Efficiency**
   - Batched RPC calls
   - Caching strategies
   - Optimistic UI updates

3. **Offline Support**
   - Cached wallet info
   - Local state persistence
   - Graceful degradation

---

## Scalability

### Current Limits

- 10 signers per multisig
- 1000 bytes max instruction data
- Unlimited proposals per multisig
- Standard Solana transaction limits

### Scaling Strategies

1. **Multiple Multisigs**
   - Different DAOs use separate multisigs
   - Each has own vault

2. **Proposal Archiving**
   - Old proposals can be closed
   - Rent reclaimed

3. **Batch Operations**
   - Future: Multiple instructions per proposal
   - Atomic execution

---

## Testing Strategy

### Unit Tests (Rust)
- Instruction validation
- State transitions
- Error conditions
- Edge cases

### Integration Tests (TypeScript)
- Full workflow testing
- Multi-signer scenarios
- Error handling
- Transaction confirmation

### Mobile Tests
- Component testing
- Service mocking
- State management
- User flows

---

## Deployment Architecture

### Devnet
- Testing and development
- Free SOL from faucet
- Frequent resets acceptable

### Mainnet-Beta
- Production deployment
- Real SOL costs
- Requires audit
- Monitoring essential

---

## Monitoring & Observability

### On-chain Events
- All critical actions emit events
- Can be indexed by external services
- Provides audit trail

### Mobile Analytics
- Transaction success/failure rates
- User engagement metrics
- Error tracking
- Performance monitoring

---

## Future Architecture Enhancements

1. **Multi-instruction Proposals**
   - Execute multiple instructions atomically
   - Complex governance actions

2. **Timelock**
   - Delay between approval and execution
   - Additional security layer

3. **Delegated Voting**
   - Vote delegation to other signers
   - Increased flexibility

4. **Sub-DAOs**
   - Nested multisig structures
   - Hierarchical governance

5. **Advanced SPL Token Support**
   - Automatic token account creation
   - Token metadata integration

---

## Conclusion

This architecture provides a solid foundation for a production-grade DAO treasury system. The separation of concerns, comprehensive security measures, and clean abstractions make it maintainable and extensible for future enhancements.
