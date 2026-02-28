# Threat Model

## Overview

This document analyzes potential security threats to the DAO Treasury + Multisig Wallet system, evaluates their impact and likelihood, and documents mitigations.

---

## Threat Classification

### Severity Levels
- **Critical**: Can result in complete loss of funds
- **High**: Can result in partial loss of funds or system compromise
- **Medium**: Can result in denial of service or degraded functionality
- **Low**: Minor impact, limited exploitation potential

### Likelihood Levels
- **High**: Easy to exploit, well-known attack vectors
- **Medium**: Requires specific conditions or skills
- **Low**: Difficult to exploit, requires insider access

---

## Threat Categories

### 1. Smart Contract Threats
### 2. Blockchain Infrastructure Threats
### 3. Mobile Application Threats
### 4. Operational Threats
### 5. Social Engineering Threats

---

## 1. Smart Contract Threats

### T1.1: Unauthorized Fund Withdrawal

**Description:**
Attacker attempts to withdraw funds from vault without proper authorization.

**Attack Vectors:**
- Exploiting access control bugs
- Bypassing multisig requirements
- Manipulating proposal execution

**Impact:** Critical
**Likelihood:** Low

**Mitigations:**
✅ **Implemented:**
- PDA-based vault (no extractable private key)
- Threshold verification before execution
- Signer authorization checks
- Account ownership validation via Anchor

```rust
// Threshold enforcement
require!(
    proposal.approved_signers.len() >= multisig.threshold as usize,
    InsufficientApprovals
);

// PDA signing (only program can sign)
let signer_seeds = &[&seeds[..]];
CpiContext::new_with_signer(...)
```

**Residual Risk:** Very Low

---

### T1.2: Replay Attack

**Description:**
Attacker replays a previously executed transaction to duplicate actions.

**Attack Vectors:**
- Re-submitting executed proposals
- Duplicating approval signatures
- Reusing old transaction signatures

**Impact:** Critical
**Likelihood:** Low

**Mitigations:**
✅ **Implemented:**
- `executed` flag prevents re-execution
- Approval tracking prevents duplicate votes
- Solana's built-in replay protection

```rust
require!(!proposal.executed, ProposalAlreadyExecuted);
proposal.executed = true; // Atomic update

require!(!proposal.has_approved(&signer), AlreadyApproved);
proposal.approved_signers.push(signer);
```

**Residual Risk:** Very Low

---

### T1.3: Proposal Manipulation

**Description:**
Attacker modifies proposal data after creation but before execution.

**Attack Vectors:**
- Exploiting mutable proposal fields
- Front-running approval transactions
- MEV attacks on execution

**Impact:** Critical
**Likelihood:** Low

**Mitigations:**
✅ **Implemented:**
- Immutable instruction_data after creation
- Proposals use PDAs (deterministic addresses)
- Account ownership validation
- State machine enforcement

```rust
#[account(
    init,      // Created once, immutable structure
    payer = creator,
    space = Proposal::space(),
    seeds = [...],
    bump
)]
pub proposal: Account<'info, Proposal>
```

**Residual Risk:** Very Low

---

### T1.4: Signer Impersonation

**Description:**
Attacker pretends to be an authorized signer.

**Attack Vectors:**
- Stealing private keys
- Social engineering
- Compromised devices

**Impact:** Critical
**Likelihood:** Medium

**Mitigations:**
✅ **Implemented:**
- Cryptographic signature verification (Solana native)
- Signer list validation
- Hardware wallet support

⚠️ **Recommended:**
- Use hardware wallets for all signers
- Multi-factor authentication
- Regular security audits

**Residual Risk:** Medium (depends on operational security)

---

### T1.5: Arithmetic Overflow/Underflow

**Description:**
Integer overflow/underflow in calculations leads to unexpected behavior.

**Attack Vectors:**
- Manipulating proposal counts
- Overflowing approval counts
- Amount calculations

**Impact:** High
**Likelihood:** Low

**Mitigations:**
✅ **Implemented:**
- Checked arithmetic operations
- Rust's built-in overflow detection (debug mode)
- Explicit overflow handling

```rust
multisig.proposal_count = multisig
    .proposal_count
    .checked_add(1)
    .ok_or(ArithmeticOverflow)?;
```

**Residual Risk:** Very Low

---

### T1.6: State Confusion

**Description:**
Proposal executed in wrong state (expired, rejected, or already executed).

**Attack Vectors:**
- Race conditions in state checks
- Time manipulation
- Incorrect state transitions

**Impact:** High
**Likelihood:** Low

**Mitigations:**
✅ **Implemented:**
- Comprehensive state validation
- Atomic state updates
- Clock timestamp validation

```rust
pub fn can_execute(&self, threshold: u8, current_time: i64) -> bool {
    !self.executed 
        && !self.rejected 
        && !self.is_expired(current_time)
        && self.approved_signers.len() >= threshold as usize
}
```

**Residual Risk:** Very Low

---

### T1.7: Signer Collusion

**Description:**
Malicious signers collude to steal funds or manipulate governance.

**Attack Vectors:**
- Threshold number of signers cooperate
- Create and approve malicious proposals
- Drain treasury

**Impact:** Critical
**Likelihood:** Low to Medium (depends on signer selection)

**Mitigations:**
✅ **Implemented:**
- Transparent on-chain actions (all events logged)
- Proposal expiry forces timely review
- Rejection mechanism for vetoing

⚠️ **Recommended:**
- Choose independent, trusted signers
- Use appropriate threshold (e.g., 3-of-5, not 2-of-3)
- Implement delays/timelocks for large transfers
- Regular audits and monitoring

**Residual Risk:** Medium (operational risk)

---

### T1.8: Denial of Service (Smart Contract)

**Description:**
Attacker prevents legitimate operations through resource exhaustion.

**Attack Vectors:**
- Creating excessive proposals
- Exhausting compute budget
- Filling account space

**Impact:** Medium
**Likelihood:** Low

**Mitigations:**
✅ **Implemented:**
- Proposal creation requires SOL (rent)
- Compute budget optimizations
- Limited data sizes
- Max 10 signers per multisig

⚠️ **Recommended:**
- Monitor proposal creation rate
- Implement rate limiting (future)
- Proposal cleanup mechanism

**Residual Risk:** Low

---

## 2. Blockchain Infrastructure Threats

### T2.1: Network Congestion

**Description:**
Solana network congestion prevents transaction confirmation.

**Attack Vectors:**
- Network spam attacks
- High demand periods
- DDoS attacks on validators

**Impact:** Medium
**Likelihood:** Medium

**Mitigations:**
✅ **Implemented:**
- Transaction retry logic
- Priority fee support (configurable)
- Connection to multiple RPC nodes

⚠️ **Recommended:**
- Use premium RPC providers
- Implement exponential backoff
- Monitor network status

**Residual Risk:** Medium (external dependency)

---

### T2.2: RPC Node Compromise

**Description:**
Malicious or compromised RPC node returns false data.

**Attack Vectors:**
- Man-in-the-middle attacks
- Compromised RPC providers
- DNS hijacking

**Impact:** High
**Likelihood:** Low

**Mitigations:**
✅ **Implemented:**
- HTTPS connections
- Transaction simulation before signing
- Multiple RPC node support

⚠️ **Recommended:**
- Use trusted RPC providers (e.g., GenesysGo, Triton)
- Verify data from multiple sources
- Implement certificate pinning

**Residual Risk:** Low

---

### T2.3: Program Upgrade (if enabled)

**Description:**
If program is upgradable, malicious upgrade could compromise system.

**Attack Vectors:**
- Compromised upgrade authority
- Malicious code injection
- Backdoor introduction

**Impact:** Critical
**Likelihood:** Low (if upgrade authority revoked)

**Mitigations:**
✅ **Implemented:**
- Anchor's standard upgrade mechanism
- Clear upgrade authority definition

⚠️ **Recommended:**
- **Revoke upgrade authority for mainnet**
- Use multisig for upgrade authority (if kept)
- Audit all upgrades thoroughly
- Announce upgrades publicly

**Residual Risk:** Very Low (if authority revoked)

---

## 3. Mobile Application Threats

### T3.1: Malicious Deep Link Interception

**Description:**
Attacker intercepts Phantom wallet responses to steal signatures.

**Attack Vectors:**
- Malicious apps registering same URL scheme
- URL scheme hijacking
- Man-in-the-middle on deep links

**Impact:** Critical
**Likelihood:** Low

**Mitigations:**
✅ **Implemented:**
- Uses Phantom's official URL schemes
- Validates response data
- Biometric authentication required

⚠️ **Recommended:**
- Universal links instead of custom schemes
- Session token encryption
- Certificate pinning for Phantom

**Residual Risk:** Low

---

### T3.2: Mobile Device Compromise

**Description:**
Attacker gains access to user's mobile device.

**Attack Vectors:**
- Malware on device
- Physical device access
- Jailbreak/root exploits

**Impact:** High
**Likelihood:** Medium

**Mitigations:**
✅ **Implemented:**
- No private keys stored in app
- Biometric authentication
- Phantom handles key management

⚠️ **Recommended:**
- Device encryption enforcement
- Regular security updates
- Jailbreak detection
- App obfuscation

**Residual Risk:** Medium

---

### T3.3: Phishing Attacks

**Description:**
Fake mobile app tricks users into signing malicious transactions.

**Attack Vectors:**
- Fake app in app stores
- DNS spoofing
- Social engineering

**Impact:** Critical
**Likelihood:** Medium

**Mitigations:**
✅ **Implemented:**
- Transaction preview before signing
- Transaction simulation
- Biometric confirmation

⚠️ **Recommended:**
- App store verification
- Clear branding
- User education
- Domain verification

**Residual Risk:** Medium

---

### T3.4: API Key Exposure

**Description:**
Hardcoded API keys or secrets exposed in mobile app.

**Attack Vectors:**
- Reverse engineering APK/IPA
- Memory dumping
- Man-in-the-middle attacks

**Impact:** Medium
**Likelihood:** Medium

**Mitigations:**
✅ **Implemented:**
- No private keys in app
- Public RPC endpoints only
- Environment-based configuration

⚠️ **Recommended:**
- Code obfuscation
- Runtime checks for tampering
- Use secure enclaves where available

**Residual Risk:** Low

---

## 4. Operational Threats

### T4.1: Key Loss

**Description:**
Authorized signer loses access to their private key.

**Attack Vectors:**
- Hardware failure
- Lost password/seed phrase
- Death or incapacitation

**Impact:** High (if threshold becomes unreachable)
**Likelihood:** Medium

**Mitigations:**
⚠️ **Recommended:**
- Threshold > simple majority (e.g., 3-of-5, not 3-of-4)
- Regular signer availability checks
- Documented key recovery procedures
- Social recovery mechanisms (future)

**Residual Risk:** Medium

---

### T4.2: Insider Threat

**Description:**
Malicious authorized signer abuses their access.

**Attack Vectors:**
- Creating malicious proposals
- Colluding with other signers
- Leaking sensitive information

**Impact:** Critical
**Likelihood:** Low (depends on signer selection)

**Mitigations:**
✅ **Implemented:**
- Transparent on-chain operations
- Event emission for auditing
- Multi-party approval required

⚠️ **Recommended:**
- Background checks for signers
- Regular audits
- Separation of duties
- Monitoring and alerting

**Residual Risk:** Medium

---

### T4.3: Social Engineering

**Description:**
Attacker manipulates signers into approving malicious proposals.

**Attack Vectors:**
- Impersonation of other signers
- Fake urgency scenarios
- Misleading proposal descriptions

**Impact:** Critical
**Likelihood:** Medium

**Mitigations:**
✅ **Implemented:**
- Transaction simulation
- Biometric confirmation
- Clear transaction details

⚠️ **Recommended:**
- Mandatory review periods
- Multi-channel verification
- Signer training
- Clear governance procedures

**Residual Risk:** Medium

---

### T4.4: Operational Errors

**Description:**
Legitimate user makes mistakes in proposal creation or execution.

**Attack Vectors:**
- Wrong recipient address
- Incorrect amount
- Copy-paste errors

**Impact:** High
**Likelihood:** Medium

**Mitigations:**
✅ **Implemented:**
- Input validation
- Transaction preview
- Confirmation dialogs
- Simulation before execution

⚠️ **Recommended:**
- Address book for common recipients
- Amount limits for proposals
- Multi-step confirmation for large transfers
- Testing on devnet first

**Residual Risk:** Medium

---

## 5. Economic Threats

### T5.1: Transaction Fee Attacks

**Description:**
Attacker forces expensive transactions or front-runs with higher fees.

**Attack Vectors:**
- MEV attacks
- Priority fee manipulation
- Spam attacks to raise fees

**Impact:** Low to Medium
**Likelihood:** Low

**Mitigations:**
✅ **Implemented:**
- Configurable priority fees
- Transaction simulation
- Reasonable compute budgets

**Residual Risk:** Low

---

### T5.2: Economic Incentive Attacks

**Description:**
Attacker profits from manipulating proposal timing or execution.

**Attack Vectors:**
- Front-running proposal execution
- Sandwich attacks on token swaps
- Oracle manipulation (if used)

**Impact:** Medium
**Likelihood:** Low (currently)

**Mitigations:**
✅ **Implemented:**
- Transparent proposal lifecycle
- Event emission

⚠️ **Recommended:**
- Implement time delays for large transfers
- Use flashbots-style private transactions (if available)
- Monitor for suspicious patterns

**Residual Risk:** Low (for SOL transfers), Medium (for complex DeFi)

---

## Risk Matrix

| Threat | Impact | Likelihood | Risk Level | Mitigation Status |
|--------|--------|------------|------------|-------------------|
| T1.1: Unauthorized Withdrawal | Critical | Low | High | ✅ Complete |
| T1.2: Replay Attack | Critical | Low | High | ✅ Complete |
| T1.3: Proposal Manipulation | Critical | Low | High | ✅ Complete |
| T1.4: Signer Impersonation | Critical | Medium | Critical | ⚠️ Partial |
| T1.5: Arithmetic Overflow | High | Low | Medium | ✅ Complete |
| T1.6: State Confusion | High | Low | Medium | ✅ Complete |
| T1.7: Signer Collusion | Critical | Low-Med | High | ⚠️ Partial |
| T1.8: DoS (Contract) | Medium | Low | Low | ✅ Complete |
| T2.1: Network Congestion | Medium | Medium | Medium | ⚠️ Partial |
| T2.2: RPC Compromise | High | Low | Medium | ⚠️ Partial |
| T2.3: Program Upgrade | Critical | Low | High | ⚠️ Config Required |
| T3.1: Deep Link Intercept | Critical | Low | High | ⚠️ Partial |
| T3.2: Device Compromise | High | Medium | High | ⚠️ Partial |
| T3.3: Phishing | Critical | Medium | Critical | ⚠️ Partial |
| T3.4: API Exposure | Medium | Medium | Medium | ✅ Complete |
| T4.1: Key Loss | High | Medium | High | ⚠️ Operational |
| T4.2: Insider Threat | Critical | Low | High | ⚠️ Operational |
| T4.3: Social Engineering | Critical | Medium | Critical | ⚠️ Operational |
| T4.4: Operational Errors | High | Medium | High | ⚠️ Partial |
| T5.1: Fee Attacks | Low-Med | Low | Low | ✅ Complete |
| T5.2: Economic Attacks | Medium | Low | Medium | ⚠️ Future |

---

## Recommendations by Priority

### Critical Priority (Before Mainnet)

1. **Revoke upgrade authority** or use multisig upgrade authority
2. **Professional security audit** by reputable firm
3. **Comprehensive operational procedures** for signers
4. **Signer training** on social engineering and security
5. **Hardware wallet requirement** for all signers
6. **Emergency response plan** documented and tested

### High Priority

7. **Monitoring infrastructure** with real-time alerts
8. **Premium RPC provider** with redundancy
9. **Regular security reviews** (quarterly)
10. **Bug bounty program** for community security researchers
11. **Insurance consideration** for treasury funds
12. **Documented governance procedures**

### Medium Priority

13. **Universal links** instead of custom URL schemes
14. **Code obfuscation** for mobile app
15. **Address book feature** for common recipients
16. **Timelock mechanism** for large transfers (future)
17. **Social recovery** mechanism (future)
18. **Extended testing** period on devnet

---

## Conclusion

This threat model identifies potential security risks across all system components. While technical mitigations are largely complete, operational security depends heavily on:

1. **Proper signer selection and management**
2. **Following documented procedures**
3. **Regular security audits and monitoring**
4. **User education and training**

The system provides strong technical security guarantees, but operators must maintain operational security discipline to achieve production-grade security.

**Next Steps:**
1. Address all critical and high priority recommendations
2. Conduct professional security audit
3. Implement monitoring and alerting
4. Document and train on operational procedures
5. Extended testing on devnet
6. Phased mainnet deployment with small amounts initially
