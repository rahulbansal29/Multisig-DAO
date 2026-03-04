🏛️ TREASURY VAULT SYSTEM - Complete Guide
═════════════════════════════════════════════════════════════════

## 1. VAULT ARCHITECTURE

The treasury vault is a **PDA (Program Derived Address)** that holds SOL for the DAO.

```
CREATE MULTISIG
    ↓
Creates Multisig PDA: ["multisig", authority_wallet]
    ↓
Creates Vault PDA:    ["vault", multisig_pda]
    ↓
Vault = Empty PDA ready to receive deposits
```

## 2. TWO-WAY FUNDS FLOW

### 💰 FUNDING THE VAULT (Deposits)

**Method A: UI Button (Easiest)**
```
User clicks "Fund Vault (0.5 SOL)" button
    ↓
Web app calls: System Program Transfer
    ├─ From: User's wallet
    └─ To: Vault PDA address
    ↓
Vault receives SOL (+0.5 SOL)
```

**Method B: Direct Transfer (Anyone can do)**
```
Get vault PDA address: 5RLyjGUwEVTTVHQMvajRDD1FuS3DjSc1h8Cxe9A52b5B
    ↓
Send SOL from any wallet to this address
    ↓
Vault receives SOL
```

**Method C: On-Chain Instruction (New!)**
```
Call: deposit_to_vault instruction
    ├─ Multisig: 4CBKKSnupqNTEf8DzfNXE1EAEyAKD1bwycd2U7dPE6oF
    ├─ Vault: 5RLyjGUwEVTTVHQMvajRDD1FuS3DjSc1h8Cxe9A52b5B
    ├─ Depositor: Signer
    ├─ Amount: 0.5 SOL
    ↓
Vault receives SOL (+0.5 SOL)
```

### 💸 WITHDRAWING FROM VAULT (Through Proposals)

```
1. Create Proposal
   ├─ Recipient: John's wallet
   ├─ Amount: 0.5 SOL
   └─ Status: Pending

2. Approval Phase (Need 2-of-3 signers)
   ├─ Signer 2 approves
   ├─ Signer 3 approves
   └─ Status: Approved (threshold met)

3. Execution Phase
   ├─ Contract checks: vault_balance >= proposal_amount
   │  └─ If 0.5 SOL >= 0.5 SOL → ✓ PROCEED
   │  └─ If 0.3 SOL >= 0.5 SOL → ✗ FAIL (InsufficientBalance)
   │
   ├─ Vault signs transfer using CPI
   │  └─ vault PDA authority proves ownership via seeds
   │
   ├─ System transfer executed:
   │  ├─ FROM: Vault PDA      (0.5 SOL)
   │  └─ TO: John's wallet    (+0.5 SOL)
   │
   └─ Status: Executed
```

## 3. KEY DIFFERENCES FROM NORMAL WALLETS

| Feature | User Wallet | Treasury Vault |
|---------|------------|-----------------|
| Private Key | Has private key | PDA (deterministic) |
| Signer In | Any action | Only via contract CPI |
| Can Reject | Can sign/unsign | Cannot (PDA is account) |
| Authority | User controls | Multisig smart contract |
| Direct Transfer | Any time | Can't send SOL directly |

## 4. WHY INSUFFICIENT BALANCE HAPPENS

Error: **"Insufficient treasury balance"**

**Cause:**
```
Proposal wants to send: 1.0 SOL
Vault has balance:     0.5 SOL
                       ───────────
                       FAILS ❌
```

**Solution:**
```
Click "Fund Vault (0.5 SOL)" to add more funds
    ↓
Vault now has: 1.0 SOL
    ↓
Now execution will succeed ✓
```

## 5. FLOW EXAMPLE (Complete Scenario)

```
Step 1: Initialize Multisig
  User 1 → Connect wallet → Click "Initialize Multisig Now"
  └─ Creates: Multisig PDA + Vault PDA
  
Step 2: Fund Vault
  User 1 → Treasury Vault card → Click "Fund Vault (0.5 SOL)"
  └─ Vault receives 0.5 SOL

Step 3: Create Proposal
  User 1 → Click "Create Proposal"
  ├─ Recipient: User 2's wallet
  ├─ Amount: 0.5 SOL
  └─ Proposal Status: Pending

Step 4: Approve Phase
  User 2 → Connect to web app → Find proposal → Click "Approve"
  └─ 1st approval ✓
  
  User 3 → Connect to web app → Find proposal → Click "Approve"
  └─ 2nd approval ✓ (Threshold reached!)
  └─ Proposal Status: Approved

Step 5: Execute
  User 1 → Find proposal → Click "Execute"
  
  Contract checks:
  ├─ Is executor authorized? YES ✓
  ├─ Is proposal approved? YES ✓
  ├─ Approvals >= threshold? YES (2 >= 2) ✓
  ├─ Vault balance >= amount? YES (0.5 >= 0.5) ✓
  
  Vault transfers 0.5 SOL to User 2's wallet
  └─ Proposal Status: Executed ✓

Result:
  User 1's wallet: Unchanged (funded vault earlier)
  Vault:           0 SOL (sent out 0.5 SOL)
  User 2's wallet: +0.5 SOL ✓
```

## 6. SMART CONTRACT INSTRUCTIONS

**7 Instructions Available:**

1. **initialize** - Create multisig + vault
2. **create_proposal** - Submit spending request  
3. **approve_proposal** - Vote YES
4. **reject_proposal** - Vote NO
5. **execute_proposal** - Transfer funds if approved
6. **update_multisig_config** - Change signer policy
7. **deposit_to_vault** - Add SOL to treasury 🆕

## 7. SECURITY FEATURES

✅ **Vault cannot send SOL without authority**
   - Only contract can authorize vault transfers
   - Done via CPI with PDA seed signature

✅ **Multisig controls vault**
   - Requires N-of-M signers per proposal
   - Used 2-of-3 in demo

✅ **Replay protection**
   - Each proposal has unique index
   - Marked executed after one-time use
   - Cannot execute same proposal twice

✅ **Balance validation**
   - Contract checks vault balance before transfer
   - Prevents over-drawing treasury
   - Clear error messages if insufficient

## 8. PRODUCTION READINESS

✅ Vault PDA deterministically derived
✅ System program handles SOL transfers
✅ No custom token handling needed (SOL only)
✅ Multisig authorization enforced
✅ Balance checks prevent errors
✅ All 3 wallets can create/approve/execute
✅ 2-of-3 threshold policy active

## 9. DEBUGGING TIPS

**If execution fails with "InsufficientBalance":**
→ Click "Fund Vault (0.5 SOL)" button
→ Wait 2-3 seconds for confirmation
→ Try executing again

**If "Execute" button is disabled:**
→ Check proposal is in "Approved" status
→ Check you're a signer (see "Your Role: ✅ Signer")
→ Check vault has enough SOL (see balance)

**If "Fund Vault" fails:**
→ Check your wallet has enough SOL
→ Make sure you're connected
→ Check you're on Devnet

════════════════════════════════════════════════════════════════

🎯 TOMORROW'S DEMO FLOW:

1. Connect Wallet 1 → Initialize
2. Fund Vault with 0.5 SOL
3. Create proposal (recipient: Wallet 2, amount: 0.5 SOL)
4. Switch to Wallet 2 → Approve
5. Switch to Wallet 3 → Approve (2/2 threshold met!)
6. Switch back to Wallet 1 → Execute
7. ✅ Funds transferred!

════════════════════════════════════════════════════════════════
