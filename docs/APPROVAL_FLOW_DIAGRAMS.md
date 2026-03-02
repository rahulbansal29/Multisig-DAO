# Approval/Rejection Logic - State Machine & Flow Diagrams

## Proposal Lifecycle State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROPOSAL CREATED                             │
│  (creator authorized, expiry in future, data <= 1000 bytes)     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                ┌──────────┴──────────┐
                │                     │
        ┌───────▼────────┐     ┌─────▼───────────┐
        │  APPROVALS     │     │  REJECTED       │
        │  ACCUMULATING  │     │  (Terminal)     │
        │                │     │                 │
        │ • Signers can  │     │ • Any signer    │
        │   approve      │     │   can veto      │
        │   multiple     │     │ • Proposal      │
        │   times        │     │   blocked       │
        │ • Cannot call  │     │ • Cannot be     │
        │   twice for    │     │   executed      │
        │   same signer  │     │ • Events sent   │
        │                │     │                 │
        └───────┬────────┘     │ Error on        │
                │              │ re-rejection    │
                │              └─────────────────┘
        ┌───────▼──────────────────────────┐
        │  THRESHOLD MET?                  │
        │  approvals >= multisig.threshold │
        └───────┬──────────────┬───────────┘
                │              │
           YES  │              │ NO
                │              │
        ┌───────▼────────┐   [PENDING - Can still approve]
        │ CAN EXECUTE    │
        │                │
        │ executor       │
        │ calls          │
        │ execute        │
        │ _proposal      │
        │                │
        └───────┬────────┘
                │
          [VALIDATE]
          • Not expired
          • Not executed
          • Not rejected
          • Threshold still met
                │
        ┌───────▼────────────┐
        │   EXECUTED         │
        │   (Terminal)       │
        │                    │
        │ • Marks executed   │
        │ • Sets timestamp   │
        │ • Emits event      │
        │ • Cannot execute   │
        │   again            │
        └────────────────────┘
```

## Detailed Approval Flow

```
USER SIGNS                    ON-CHAIN VALIDATION               STATE CHANGE
────────────────────────────────────────────────────────────────────────────
   │                              
   ├─ voteOnProposal()            
   │  (approve=true)              
   │                              
   └─→ approveProposal()         
       RPC call                   
       │                          
       └─→ Handler Validates:     
           ├─ Is signer           
           │  authorized?         ──NOT OK──→ UnauthorizedSigner ❌
           │                      
           ├─ Proposal            
           │  expired?            ──YES──→ ProposalExpired ❌
           │                      
           ├─ Already             
           │  executed?           ──YES──→ ProposalAlreadyExecuted ❌
           │                      
           ├─ Already             
           │  rejected?           ──YES──→ ProposalRejected ❌
           │                      
           └─ Signer              
              already             ──YES──→ AlreadyApproved ❌
              approved?            
                                   ──NO──→ ADD TO approved_signers ✅
                                          proposal.approved_signers.push(signer)
                                   
                                          EMIT EVENT:
                                          ProposalApproved {
                                              proposal: pubkey,
                                              multisig: pubkey,
                                              signer: pubkey,
                                              approvals_count: X,
                                              threshold: Y,
                                              timestamp: now
                                          }
                                   
                                          Return OK ✅
```

## Detailed Rejection Flow

```
USER SIGNS                    ON-CHAIN VALIDATION               STATE CHANGE
────────────────────────────────────────────────────────────────────────────
   │                              
   ├─ voteOnProposal()            
   │  (approve=false)             
   │                              
   └─→ rejectProposal()          
       RPC call                   
       │                          
       └─→ Handler Validates:     
           ├─ Is signer           
           │  authorized?         ──NOT OK──→ UnauthorizedSigner ❌
           │                      
           ├─ Already             
           │  executed?           ──YES──→ ProposalAlreadyExecuted ❌
           │                      
           └─ Already             
              rejected?           ──YES──→ ProposalRejected ❌
                                   
                                   ──NO──→ SET REJECTION FLAG ✅
                                          proposal.rejected = true
                                   
                                          EMIT EVENT:
                                          ProposalRejected {
                                              proposal: pubkey,
                                              multisig: pubkey,
                                              rejector: pubkey,
                                              timestamp: now
                                          }
                                   
                                          Return OK ✅
                                   
                    ⚠️  NOTE: TERMINAL STATE
                        • Cannot be un-rejected
                        • Blocks all further approvals
                        • Cannot be executed
                        • Rejection is final
```

## Execution Flow (After Threshold Met)

```
USER SIGNS                    ON-CHAIN VALIDATION               STATE CHANGE
────────────────────────────────────────────────────────────────────────────
   │                              
   ├─ executeProposal()          
   │                              
   └─→ Handler Validates:        
       ├─ Check proposal.can_execute()
       │  ├─ !executed          ──NO──→ ProposalAlreadyExecuted ❌
       │  ├─ !rejected          ──NO──→ ProposalRejected ❌
       │  ├─ !is_expired()      ──YES──→ ProposalExpired ❌
       │  └─ approvals >= threshold ──NO──→ InsufficientApprovals ❌
       │                      
       ├─ Redundant checks     ──FAIL──→ Return error ❌
       │  (defensive programming)
       │                      
       └─ Update state:       ──PASS──→ ✅
          proposal.executed = true
          proposal.executed_at = now
                                   
                                   EMIT EVENT:
                                   ProposalExecuted {
                                       proposal: pubkey,
                                       multisig: pubkey,
                                       executor: pubkey,
                                       timestamp: now
                                   }
                                   
                                   Return OK ✅
```

## Key Decision Points - Decision Tree

```
                    ┌─────────────────────┐
                    │  User votes on      │
                    │  proposal           │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Approve or Reject? │
                    └──────────┬──────────┘
                               │
                     ┌─────────┴─────────┐
                     │                   │
              ┌──────▼──────┐      ┌─────▼──────┐
              │  APPROVE    │      │  REJECT    │
              └──────┬──────┘      └─────┬──────┘
                     │                   │
            ┌────────▼────────┐   ┌──────▼──────────┐
            │ Check approval  │   │ Check rejection │
            │ prerequisites:  │   │ prerequisites:  │
            │ • Authorized?   │   │ • Authorized?   │
            │ • Not expired?  │   │ • Not executed? │
            │ • Not executed? │   │ • Not rejected? │
            │ • Not rejected? │   │                 │
            │ • Not already   │   │                 │
            │   approved?     │   │                 │
            └────────┬────────┘   └──────┬──────────┘
                     │                   │
          ┌──────────▼──────────┐ ┌──────▼──────────┐
          │ Add to approvals    │ │ Set rejected=   │
          │ approved_signers    │ │ true (terminal) │
          │ .push(signer)       │ │                 │
          └──────────┬──────────┘ └──────┬──────────┘
                     │                   │
          ┌──────────▼──────────┐ ┌──────▼──────────┐
          │ Emit Approved event │ │ Emit Rejected   │
          │ With approval count │ │ event           │
          └──────────┬──────────┘ └──────┬──────────┘
                     │                   │
                     └───────┬───────────┘
                             │
                    ┌────────▼────────────┐
                    │ Check if threshold  │
                    │ reached?            │
                    └────────┬────────────┘
                             │
                     ┌───────┴───────┐
                     │               │
                    YES              NO
                     │               │
              ┌──────▼──────┐    [Stay in
              │ Can Now     │     Pending]
              │ Execute     │
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │  User calls │
              │  execute    │
              │  _proposal  │
              └──────┬──────┘
                     │
              ┌──────▼──────────┐
              │ Check & set     │
              │ executed=true   │
              │ executed_at=now │
              └──────┬──────────┘
                     │
              ┌──────▼──────────┐
              │ Emit Executed   │
              │ event           │
              └─────────────────┘
```

## Validation Summary Table

### Approve Proposal - Validation Requirements

| # | Validation | Check Type | Error Code | Impact |
|---|------------|-----------|-----------|--------|
| 1 | Signer in authorized list | Authority | `UnauthorizedSigner` | ❌ BLOCK |
| 2 | Current time < expiry | Time-based | `ProposalExpired` | ❌ BLOCK |
| 3 | proposal.executed == false | State | `ProposalAlreadyExecuted` | ❌ BLOCK |
| 4 | proposal.rejected == false | State | `ProposalRejected` | ❌ BLOCK |
| 5 | Not in approved_signers | Idempotency | `AlreadyApproved` | ❌ BLOCK |

**Action if ALL pass**: Add signer to approved_signers, emit event

### Reject Proposal - Validation Requirements

| # | Validation | Check Type | Error Code | Impact |
|---|------------|-----------|-----------|--------|
| 1 | Signer in authorized list | Authority | `UnauthorizedSigner` | ❌ BLOCK |
| 2 | proposal.executed == false | State | `ProposalAlreadyExecuted` | ❌ BLOCK |
| 3 | proposal.rejected == false | State | `ProposalRejected` | ❌ BLOCK |

**Action if ALL pass**: Set rejected=true, emit event (TERMINAL)

### Execute Proposal - Validation Requirements

| # | Validation | Check Type | Error Code | Impact |
|---|------------|-----------|-----------|--------|
| 1 | Approvals >= threshold | Voting | `InsufficientApprovals` | ❌ BLOCK |
| 2 | Current time < expiry | Time-based | `ProposalExpired` | ❌ BLOCK |
| 3 | proposal.executed == false | State | `ProposalAlreadyExecuted` | ❌ BLOCK |
| 4 | proposal.rejected == false | State | `ProposalRejected` | ❌ BLOCK |

**Action if ALL pass**: Set executed=true, executed_at=now, emit event (TERMINAL)

## Error Conditions - Prevention Matrix

| Scenario | Approve | Reject | Execute | Prevented By |
|----------|---------|--------|---------|--------------|
| Unauthorized signer | ❌ | ❌ | ❌ | `is_signer()` check |
| Already approved | ❌ | - | - | `has_approved()` check |
| Expired | ❌ | - | ❌ | `is_expired()` check |
| Already executed | ❌ | ❌ | ❌ | `executed` flag check |
| Already rejected | ❌ | ❌ | ❌ | `rejected` flag check |
| Threshold not met | - | - | ❌ | `approved_signers.len()` check |

Legend: ❌ = Blocked/Error, ✅ = Allowed, - = N/A

## Event Emissions Summary

### 1. ProposalApproved Event
Emitted: Each time a signer approves
```rust
pub struct ProposalApproved {
    pub proposal: Pubkey,           // Which proposal
    pub multisig: Pubkey,           // Which multisig
    pub signer: Pubkey,             // Who approved
    pub approvals_count: u8,        // Current approval count
    pub threshold: u8,              // Target threshold
    pub timestamp: i64,             // When
}
```
**Use in UI**: Show approval progress, highlight when threshold is met

### 2. ProposalRejected Event
Emitted: When a signer rejects (ONCE - terminal state)
```rust
pub struct ProposalRejected {
    pub proposal: Pubkey,           // Which proposal
    pub multisig: Pubkey,           // Which multisig
    pub rejector: Pubkey,           // Who rejected
    pub timestamp: i64,             // When
}
```
**Use in UI**: Mark proposal as vetoed, show rejector info

### 3. ProposalExecuted Event
Emitted: When proposal is executed
```rust
pub struct ProposalExecuted {
    pub proposal: Pubkey,           // Which proposal
    pub multisig: Pubkey,           // Which multisig
    pub executor: Pubkey,           // Who executed
    pub timestamp: i64,             // When
}
```
**Use in UI**: Mark proposal as completed

## Frontend Integration Points

### 1. Vote UI
```typescript
// Show current status
interface ProposalStatus {
    status: 'pending' | 'approved' | 'rejected' | 'executed' | 'expired';
    approvals: number;
    threshold: number;
    canApprove: boolean;
    canReject: boolean;
    canExecute: boolean;
}

// Vote buttons
<button onClick={() => voteOnProposal(proposal.pubkey, true)} disabled={!canApprove}>
    Approve
</button>

<button onClick={() => voteOnProposal(proposal.pubkey, false)} disabled={!canReject}>
    Reject
</button>
```

### 2. Proposal Detail Display
```typescript
// Show approval progress
Approvals: 3 / 5
├── ✅ Signer A
├── ✅ Signer B
├── ✅ Signer C
└── ⏳ Signer D (pending)

Status: Ready to Execute (threshold met)
```

### 3. Event Listener
```typescript
// Listen for real-time updates
program.addEventListener('ProposalApproved', (event) => {
    // Update UI with new approval count
});

program.addEventListener('ProposalRejected', (event) => {
    // Mark proposal as vetoed
});

program.addEventListener('ProposalExecuted', (event) => {
    // Mark proposal as completed
});
```

## Code Consistency Verification ✅

### Approve Proposal
- **Status**: ✅ CONSISTENT
- **File**: [approve_proposal.rs](../programs/multisig_dao/src/instructions/approve_proposal.rs)
- **Validates**: All 5 requirements
- **Updates State**: `approved_signers` vector
- **Emits Event**: `ProposalApproved` with correct fields

### Reject Proposal
- **Status**: ✅ CONSISTENT
- **File**: [reject_proposal.rs](../programs/multisig_dao/src/instructions/reject_proposal.rs)
- **Validates**: All 3 requirements
- **Updates State**: `rejected` boolean flag
- **Emits Event**: `ProposalRejected` with correct fields

### Execute Proposal
- **Status**: ✅ CONSISTENT
- **File**: [execute_proposal.rs](../programs/multisig_dao/src/instructions/execute_proposal.rs)
- **Validates**: All 4 requirements + threshold check
- **Updates State**: `executed` boolean, `executed_at` timestamp
- **Emits Event**: `ProposalExecuted` with correct fields

### State Struct
- **Status**: ✅ CONSISTENT
- **File**: [state.rs](../programs/multisig_dao/src/state.rs)
- **Fields Used**: `approved_signers`, `rejected`, `executed`, `executed_at`, `expiry`
- **Helper Methods**: `has_approved()`, `add_approval()`, `is_expired()`, `can_execute()`

### Errors Enum
- **Status**: ✅ CONSISTENT
- **File**: [errors.rs](../programs/multisig_dao/src/errors.rs)
- **Errors Used**: All required error codes defined

### Events Struct
- **Status**: ✅ CONSISTENT
- **File**: [events.rs](../programs/multisig_dao/src/events.rs)
- **Events**: `ProposalApproved`, `ProposalRejected`, `ProposalExecuted` all defined

### Frontend Integration
- **Status**: ✅ CONSISTENT
- **File**: [anchor.ts](../web/src/services/anchor.ts#L37)
- **Method**: `voteOnProposal()` correctly calls `approveProposal()` or `rejectProposal()`
- **Accounts**: Proper setup with `multisig`, `proposal`, `signer`
