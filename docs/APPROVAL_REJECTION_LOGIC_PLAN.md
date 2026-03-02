# Approval & Rejection Logic Plan

## Overview
The multisig DAO implements a two-phase voting mechanism:
1. **Approval Phase**: Authorized signers can approve proposals to collect signatures
2. **Rejection Phase**: Any authorized signer can veto/reject a proposal at any time

## Architecture

### 1. Proposal State Machine
```
Created
  ├── Approved (accumulate approvals toward threshold)
  │   └── Executed (when threshold met + execute_proposal called)
  └── Rejected (veto/rejection - terminal state)
  
Also: Expired (if current_time > expiry timestamp)
```

### 2. Proposal Data Structure (on-chain state)
```rust
struct Proposal {
    index: u64,                      // Unique proposal ID
    multisig: Pubkey,               // Associated multisig
    creator: Pubkey,                // Proposal creator
    instruction_data: Vec<u8>,      // Max 1000 bytes
    approved_signers: Vec<Pubkey>,  // Who approved (max 10)
    executed: bool,                 // Execution flag
    rejected: bool,                 // Rejection flag (terminal)
    expiry: i64,                    // Unix timestamp when proposal expires
    created_at: i64,                // Creation timestamp
    executed_at: i64,               // Execution timestamp
    bump: u8,                       // PDA bump seed
}
```

### 3. Approval Logic

#### **Approve Proposal Instruction** (`approve_proposal`)

**Purpose**: Add signer's approval to a proposal

**Workflow**:
1. ✅ Validate signer is authorized in multisig
2. ✅ Check proposal is not expired
3. ✅ Check proposal is not already executed
4. ✅ Check proposal is not rejected
5. ✅ Check signer hasn't already approved
6. ✅ Add signer to `approved_signers` list
7. ✅ Emit `ProposalApproved` event with approval count

**Constraints**:
- Signer must be in multisig's authorized signers list
- Signer can only approve once per proposal
- Cannot approve expired proposals
- Cannot approve rejected proposals
- Cannot approve executed proposals

**Events**:
```rust
ProposalApproved {
    proposal: Pubkey,
    multisig: Pubkey,
    signer: Pubkey,
    approvals_count: u8,           // Current approval count
    threshold: u8,                 // Required threshold
    timestamp: i64,
}
```

### 4. Rejection Logic

#### **Reject Proposal Instruction** (`reject_proposal`)

**Purpose**: Veto/reject a proposal (terminal state)

**Workflow**:
1. ✅ Validate signer is authorized in multisig
2. ✅ Check proposal is not already executed
3. ✅ Check proposal is not already rejected
4. ✅ Set `proposal.rejected = true`
5. ✅ Emit `ProposalRejected` event

**Constraints**:
- Signer must be in multisig's authorized signers list
- Cannot reject executed proposals
- Cannot reject already-rejected proposals
- Any single authorized signer can reject (veto mechanism)
- Once rejected, proposal cannot be executed

**Events**:
```rust
ProposalRejected {
    proposal: Pubkey,
    multisig: Pubkey,
    rejector: Pubkey,
    timestamp: i64,
}
```

### 5. Validation Matrix

| Condition | Approve | Reject | Execute |
|-----------|---------|--------|---------|
| Authorized signer? | ✅ Required | ✅ Required | ✅ Required |
| Not expired? | ✅ Required | ❌ Not checked | ✅ Required |
| Not executed? | ✅ Required | ✅ Required | ✅ Required |
| Not rejected? | ✅ Required | ✅ Required | ✅ Required |
| Threshold met? | ❌ Not checked | ❌ Not checked | ✅ Required |
| Not double-approval? | ✅ Required | ❌ N/A | ❌ N/A |

### 6. Frontend Implementation

**Method**: `voteOnProposal(proposalPubkey, approve)`

```typescript
// Approve flow
if (approve) {
  tx = await program.methods
    .approveProposal()
    .accounts({
      multisig: multisigPda,
      proposal: proposalPubkey,
      signer: userKey,
    })
    .rpc();
}

// Reject flow
else {
  tx = await program.methods
    .rejectProposal()
    .accounts({
      multisig: multisigPda,
      proposal: proposalPubkey,
      signer: userKey,
    })
    .rpc();
}
```

## Current Implementation Status

### ✅ Properly Implemented
1. **Approve instruction logic** - All validations in place
2. **Reject instruction logic** - All validations in place
3. **Event emissions** - Proper events for both approve and reject
4. **State tracking** - `approved_signers` and `rejected` flags properly maintained
5. **Authorization checks** - Both instructions validate signer authorization
6. **Idempotency protection** - Cannot double-approve same proposal

### ⚠️ Considerations & Gaps

1. **Rejection is Irreversible**
   - Once rejected, a proposal cannot be re-approved
   - This is intentional (veto mechanism) but should be documented

2. **No Explicit Un-approval**
   - Signers cannot withdraw their approval after voting
   - This is by design for security/finality

3. **No Rejection Reason Storage**
   - Rejection only sets a flag, no reason stored on-chain
   - Rejector info is in the event, not on-state

4. **Expiry Time After Rejection**
   - Rejected proposals don't clear expiry based on time
   - A 1-year-old rejected proposal still shows as rejected
   - This is correct (metadata preservation)

5. **Threshold Not Checked in Approve**
   - Approve doesn't check if threshold is met
   - This is correct (allows threshold check in execute phase)
   - Provides separation of concerns

## Recommended Enhancements

### 1. Add UI Feedback
```typescript
// Show when proposal will be executable
canExecute = approvals_count >= threshold

// Show when proposal is vetoed
isVetoed = rejected === true

// Show when proposal is expired
isExpired = current_time > expiry
```

### 2. Display Approval Progress
```typescript
// Proposal detail screen should show:
- Current approvals: X / Y (threshold)
- Status: Pending / Approved / Rejected / Executed / Expired
- Who approved: [Signer A, Signer B, ...]
- Who rejected (if applicable): [Signer X]
```

### 3. Validation Before Sending TX
```typescript
// Frontend should validate before spending gas:
- Is signer authorized?
- Is proposal not already approved by me?
- Is proposal in valid state for action?
```

### 4. Optional: Add Approval Withdrawal
**Not currently implemented, but could be added if needed:**
```rust
// Remove signer from approved_signers
pub fn withdraw_approval(ctx: Context<WithdrawApproval>) -> Result<()> {
    // Remove signer from approved_signers
    // Emit ProposalApprovalWithdrawn event
}
```

## Error Codes Summary

| Error | When Triggered | Flow |
|-------|----------------|------|
| `UnauthorizedSigner` | Signer not in multisig | Approve, Reject |
| `ProposalExpired` | current_time > expiry | Approve, Execute |
| `ProposalAlreadyExecuted` | proposal.executed == true | Approve, Reject, Execute |
| `ProposalRejected` | proposal.rejected == true | Approve, Execute |
| `AlreadyApproved` | Signer already in approved_signers | Approve |
| `InsufficientApprovals` | approvals < threshold | Execute |

## Testing Strategy

### Unit Tests (On-chain)
1. ✅ Approve with valid signer
2. ✅ Approve increases counter
3. ✅ Cannot double-approve
4. ✅ Cannot approve expired proposal
5. ✅ Cannot approve rejected proposal
6. ✅ Reject with valid signer
7. ✅ Cannot reject executed proposal
8. ✅ Cannot reject already-rejected proposal
9. ✅ Cannot approve after rejection

### Integration Tests
1. Multi-signer approval flow to threshold
2. Single rejection preventing execution
3. Time-based expiry preventing approval
4. Event emission verification

## Conclusion

The current implementation follows **best practices for multisig smart contracts**:
- ✅ Clear state transitions
- ✅ Proper authorization checks
- ✅ Idempotency protection
- ✅ Veto mechanism (rejection)
- ✅ Time-based expiry
- ✅ Event logging for transparency

The code is **production-ready** with proper validation at every step.
