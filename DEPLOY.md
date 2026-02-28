# 🚀 DAO Treasury Deployment Guide

## Current Status

✅ **Program Built**: `target/deploy/multisig_dao.so`  
✅ **Program ID**: `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS`  
✅ **Wallet Created**: `3wEzj7icty3RaBUpuroWmCt5mpNL8Ki8TaajBRqBFEFk`  
✅ **Network**: Devnet  
✅ **IDL Generated**: `target/idl/multisig_dao.json`  
✅ **Web App Configured**: Demo mode disabled

---

## ⚡ Quick Deploy (2 Steps)

### Step 1: Fund Your Wallet

Your deployment wallet needs ~0.5 SOL for fees. Get free devnet SOL:

**Option A - Web Faucet** (Easiest):
```
1. Visit: https://faucet.solana.com
2. Enter your address: 3wEzj7icty3RaBUpuroWmCt5mpNL8Ki8TaajBRqBFEFk
3. Click "Airdrop 2 SOL"
```

**Option B - CLI**:
```bash
wsl bash -c '~/.local/share/solana/install/active_release/bin/solana airdrop 2'
```

**Option C - Alternative Faucets**:
- https://solfaucet.com
- https://faucet.triangle.protocol.com

### Step 2: Deploy

Once funded, run:

```bash
# Deploy to devnet
wsl bash -c 'export PATH="~/.local/share/solana/install/active_release/bin:$PATH" && cd "/mnt/c/Users/RAHUL BANSAL/Desktop/solanaproject" && solana program deploy target/deploy/multisig_dao.so --program-id target/deploy/multisig_dao-keypair.json'
```

---

## 🎯 After Deployment

### Initialize the Multisig

```bash
npx ts-node scripts/deploy-and-initialize.ts
```

This will:
- Create the multisig account
- Set up the treasury vault
- Configure your wallet as the first signer
- Generate deployment config

### Test the Web App

1. Open: http://localhost:5173
2. Click "Connect Wallet"
3. Connect Phantom wallet
4. Create a test proposal
5. Vote and execute!

---

## 📱 Mobile App Setup

```bash
cd mobile
npm install
npm start
```

Then scan the QR code with Expo Go app.

Update `mobile/src/utils/constants.ts`:
```typescript
export const PROGRAM_ID = 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS'
export const RPC_ENDPOINT = 'https://api.devnet.solana.com'
```

---

## 🔧 Troubleshooting

### "Airdrop rate limited"
Try these faucets instead:
- https://faucet.solana.com
- https://solfaucet.com

### "Insufficient funds"
Check balance:
```bash
wsl bash -c '~/.local/share/solana/install/active_release/bin/solana balance'
```

Need at least 0.5 SOL for deployment.

### "Program deployment failed"
1. Check wallet has SOL
2. Verify devnet is configured:
```bash
wsl bash -c '~/.local/share/solana/install/active_release/bin/solana config get'
```
3. Should show: `RPC URL: https://api.devnet.solana.com`

---

## 📊 Deployment Costs

| Operation | Cost (SOL) |
|-----------|------------|
| Program Deploy | ~0.3 SOL |
| Initialize Multisig | ~0.002 SOL |
| Create Proposal | ~0.002 SOL |
| Approve Proposal | ~0.001 SOL |
| Execute Proposal | ~0.001 SOL |

**Total for testing**: ~0.5 SOL (free on devnet!)

---

## 🎉 What's Working Now

✅ Smart contract compiled  
✅ Wallet configured  
✅ Web app ready  
✅ Mobile app configured  
✅ IDL generated  
✅ Demo mode disabled  

**Only Missing**: Devnet SOL for deployment! Get it from the faucet and you're ready to go! 🚀

---

## 🔗 Useful Links

- **Solana Explorer**: https://explorer.solana.com/?cluster=devnet
- **Faucet**: https://faucet.solana.com
- **Your Wallet**: `3wEzj7icty3RaBUpuroWmCt5mpNL8Ki8TaajBRqBFEFk`
- **Program ID**: `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS`

---

**Need help?** Run `wsl bash deploy.sh` for an automated deployment script!
