# 🚀 Quick Start Guide - Your 2-of-3 Multisig DAO

Your platform is now configured with **your 3 real Phantom wallet addresses** and a **2-of-3 approval threshold**.

## ✅ Your Configuration

```
Multisig Setup: 2-of-3
├─ Wallet 1: 3wEzj7icty3RaBUpuroWmCt5mpNL8Ki8TaajBRqBFEFk
├─ Wallet 2: HPkUHvWYfAj8CzyeaEsT8CdDyqh6KhZqr4SZFbBjjwQh
└─ Wallet 3: 2YCDsgD8mZjDh6uom8J4gY6SmXWmJWxcDtQT8y5s5Tjr

Threshold: 2 out of 3 signers must approve to execute
```

---

## 🎯 How It Works

### Proposal Lifecycle

```
1. CREATE PROPOSAL
   └─ Any signer creates: "Transfer 5 SOL to DevFund"
   └─ Status: PENDING

2. VOTE (Need 2 approvals)
   ├─ Wallet 1 connects → Approves (1/2) ✓
   ├─ Wallet 2 connects → Approves (2/2) ✓ READY!
   └─ Status: APPROVED

3. EXECUTE
   └─ Anyone executes → 5 SOL transfers immediately
   └─ Status: EXECUTED ✓
```

---

## 📋 Step-by-Step Usage

### Step 1: Start the Frontend

```bash
cd web
npm run dev
```

Open: http://localhost:5173

---

### Step 2: Initialize the Multisig (ONE-TIME SETUP)

**What you'll see:**
- A green box showing your 3 wallet addresses
- Button: "Initialize Multisig Now"

**Instructions:**

1. **Connect with ANY of your 3 wallets** using Phantom
   - Click "Connect Phantom Wallet"
   - Approve in Phantom extension

2. **Fund your wallet with devnet SOL**
   - Click the faucet link shown on screen
   - Request at least 5 SOL for initialization

3. **Click "Initialize Multisig Now"**
   - This creates the on-chain multisig account
   - Confirms transaction in Phantom
   - Wait for "Success!" message

**Result:**
```
✅ Multisig initialized on-chain
├─ 3 authorized signers registered
├─ 2-of-3 threshold set
├─ Vault created for treasury
└─ Ready to create proposals!
```

---

### Step 3: Create Your First Proposal

**Instructions:**

1. Click **"+ Create New Proposal"**

2. Fill in the form:
   ```
   Title: "Transfer to Development Fund"
   Amount: 1.0 SOL
   Recipient: [Any valid Solana address]
   Description: "Quarterly dev allocation"
   ```

3. Click **"Create Proposal"**

4. **Confirm in Phantom**

**Result:**
```
Proposal #1 created
├─ Amount: 1.0 SOL
├─ Status: PENDING
├─ Approvals: 0/2
└─ Waiting for votes...
```

---

### Step 4: Vote on the Proposal (2 Approvals Needed)

#### Option A: If You Have All 3 Wallets in Phantom

1. **First Approval:**
   - Currently connected with Wallet 1
   - Click on the proposal
   - Click **"Approve"**
   - Confirm in Phantom
   - **Result:** Approvals: 1/2

2. **Second Approval:**
   - **Disconnect** current wallet
   - Click "Connect Phantom Wallet" again
   - **Switch to Wallet 2** in Phantom extension
   - Connect with Wallet 2
   - Click on same proposal
   - Click **"Approve"**
   - Confirm in Phantom
   - **Result:** Approvals: 2/2 ✓ **THRESHOLD MET!**

#### Option B: If Testing with Single Wallet

If you only want to test with one wallet:
- You can approve twice with the same wallet for testing
- In production, the smart contract prevents duplicate approvals
- For real use, you need 2 different wallets

---

### Step 5: Execute the Proposal

Once 2 approvals are collected:

1. **Status changes to "APPROVED"**

2. Click on the approved proposal

3. Click **"Execute"** button

4. **Confirm in Phantom**

**What happens during execution:**

```
Smart Contract Executes:
├─ ✓ Validates 2/2 approvals >= 2 threshold
├─ ✓ Checks proposal not expired
├─ ✓ Checks not rejected
├─ ✓ Verifies vault has balance
├─ ✓ Marks proposal as executed (replay protection)
├─ ✓ TRANSFERS 1.0 SOL to recipient
└─ ✓ Emits ProposalExecuted event

Result:
✅ 1.0 SOL now in recipient account
✅ Status: EXECUTED
✅ Complete in ONE transaction!
```

---

### Step 6: Verify the Transfer

**Option 1: Check in Solana Explorer**

1. Go to: https://explorer.solana.com/?cluster=devnet
2. Search for the recipient address
3. Look at transaction history
4. See your 1.0 SOL transfer! ✓

**Option 2: CLI**

```bash
solana balance <RECIPIENT_ADDRESS> --url devnet
```

---

## 🧪 Testing Scenarios

### Scenario 1: Full Approval Flow (2-of-3)

```
Step 1: Create proposal for 0.5 SOL
Step 2: Wallet 1 approves (1/2)
Step 3: Wallet 2 approves (2/2) ✓ READY
Step 4: Execute → 0.5 SOL transfers
Result: ✅ Success!
```

### Scenario 2: Rejection (Veto Power)

```
Step 1: Create proposal
Step 2: Wallet 1 approves (1/2)
Step 3: Wallet 2 clicks "Reject"
Result: ❌ Status: REJECTED (can't be executed)
```

### Scenario 3: Insufficient Approvals

```
Step 1: Create proposal
Step 2: Wallet 1 approves (1/2)
Step 3: Try to execute
Result: ❌ Error: "Insufficient approvals" (need 2)
```

### Scenario 4: Double Approval Prevention

```
Step 1: Create proposal
Step 2: Wallet 1 approves (1/2)
Step 3: Wallet 1 tries to approve again
Result: ❌ Error: "AlreadyApproved"
```

---

## 📊 Dashboard Overview

**What you'll see:**

```
╔════════════════════════════════════════════════╗
║  ✅ Multi-Wallet Setup (2-of-3)               ║
╠════════════════════════════════════════════════╣
║  Your Configuration:                           ║
║  2 out of 3 signers must approve proposals    ║
║                                               ║
║  📋 Your 3 Authorized Wallets:                ║
║  Wallet 1: 3wEzj7icty3RaBUpur...             ║
║  Wallet 2: HPkUHvWYfAj8CzyeaE...             ║
║  Wallet 3: 2YCDsgD8mZjDh6uom8...             ║
║                                               ║
║  📝 How to Test Voting:                       ║
║  1. Connect with Wallet 1 and approve         ║
║  2. Disconnect and connect with Wallet 2      ║
║  3. Approve the same proposal                 ║
║  4. After 2 approvals, execute!               ║
╚════════════════════════════════════════════════╝
```

**Stats Section:**
- Total Proposals: X
- Pending: Y
- Executed: Z

**Proposal List:**
- Shows all proposals with status
- Click to view details
- Approve/Reject/Execute buttons

---

## 🔧 Common Issues & Solutions

### Issue: "AlreadyApproved" Error

**Cause:** Trying to approve with the same wallet twice

**Solution:** 
- Disconnect and connect with a different wallet
- Make sure you're using Wallet 1, then Wallet 2

### Issue: "UnauthorizedSigner" Error

**Cause:** Wallet not in the authorized signer list

**Solution:**
- Only these 3 wallets can vote:
  - 3wEzj7icty3RaBUpuroWmCt5mpNL8Ki8TaajBRqBFEFk
  - HPkUHvWYfAj8CzyeaEsT8CdDyqh6KhZqr4SZFbBjjwQh
  - 2YCDsgD8mZjDh6uom8J4gY6SmXWmJWxcDtQT8y5s5Tjr

### Issue: Can't Execute Proposal

**Cause:** Not enough approvals yet

**Solution:**
- Check approval count: must be 2/2
- Get another signer to approve first

### Issue: Wallet Won't Connect

**Solution:**
1. Install Phantom extension
2. Make sure you're on devnet
3. Refresh the page
4. Try connecting again

---

## 💡 Best Practices

### Security

✅ **DO:**
- Keep your 3 wallet private keys secure
- Test on devnet before mainnet
- Verify recipient addresses before creating proposals
- Check proposal details before approving

❌ **DON'T:**
- Share your wallet private keys
- Approve proposals without reviewing
- Send SOL to unverified addresses

### Operations

✅ **DO:**
- Fund vault with enough SOL for proposals
- Set reasonable expiry times (7 days default)
- Document proposal purposes clearly
- Verify transactions in explorer

❌ **DON'T:**
- Create proposals larger than vault balance
- Rush approval without consensus
- Forget to execute approved proposals

---

## 📈 Real-World Use Cases

### Treasury Management
```
Scenario: DAO with 10 SOL treasury
Action: Pay contractor 2 SOL
Flow: Create → 2 members approve → Execute
Result: Contractor paid, 8 SOL remains
```

### Investment Decisions
```
Scenario: Invest 5 SOL in new project
Action: Create investment proposal
Flow: Create → Discuss → 2 approve → Execute
Result: 5 SOL invested via governance
```

### Emergency Actions
```
Scenario: Security issue, need quick withdrawal
Action: Create emergency proposal
Flow: Create → 2 approve ASAP → Execute
Result: Funds secured quickly
```

---

## 🎓 Understanding the Code

### Smart Contract (Rust)

**Location:** `programs/multisig_dao/src/`

**Key Files:**
- `instructions/initialize.rs` - Sets up multisig with your 3 wallets
- `instructions/create_proposal.rs` - Creates new proposals
- `instructions/approve_proposal.rs` - Handles voting
- `instructions/execute_proposal.rs` - Transfers SOL when threshold met

### Frontend (TypeScript/React)

**Location:** `web/src/`

**Key Files:**
- `components/Dashboard.tsx` - Main UI (initialization, proposals)
- `services/multisig.ts` - Multisig operations
- `services/anchor.ts` - Blockchain communication
- `config/test-signers.json` - Your 3 wallet addresses

---

## 🚀 Deploy to Mainnet (When Ready)

### Prerequisites

1. ✅ Fully tested on devnet
2. ✅ Security audit complete
3. ✅ Team familiar with operations
4. ✅ Mainnet SOL for deployment

### Deployment Steps

```bash
# 1. Switch to mainnet
anchor build
solana config set --url mainnet-beta

# 2. Deploy program
anchor deploy

# 3. Update frontend config
# Change RPC endpoint to mainnet

# 4. Initialize multisig on mainnet
# Use same 3 wallet addresses

# 5. Fund vault with real SOL

# 6. Start using!
```

---

## 📞 Support

**Documentation:**
- TESTING_GUIDE.md - Comprehensive testing scenarios
- ARCHITECTURE.md - Technical details
- SECURITY.md - Security best practices

**Troubleshooting:**
- Check console logs in browser DevTools
- Review transaction signatures in Solana Explorer
- Verify wallet connections in Phantom

---

## 🎉 Summary

**You Now Have:**

✅ 2-of-3 multisig governance system  
✅ 3 authorized signers (your Phantom wallets)  
✅ Proposal system with voting  
✅ Automatic execution with SOL transfer  
✅ Full transparency on blockchain  
✅ Production-ready code  

**Next Steps:**

1. Start the frontend: `cd web && npm run dev`
2. Initialize the multisig with any of your 3 wallets
3. Create your first proposal
4. Test the voting flow
5. Execute and verify the transfer!

**Your DAO treasury is ready to use!** 🚀

---

**Questions?**
- Read TESTING_GUIDE.md for detailed scenarios
- Check transaction logs for debugging
- Test thoroughly on devnet first

**Happy Governing!** 🏛️
