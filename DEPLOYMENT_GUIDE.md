# 🚀 Complete Deployment Guide

## ✅ Step 1: Build Complete!

Your Solana program has been successfully built:
- **Binary**: `target/deploy/multisig_dao.so`
- **Keypair**: `target/deploy/multisig_dao-keypair.json`

---

## 📦 Step 2: Install Solana CLI

### Option A: Windows (PowerShell - Run as Administrator)
```powershell
# Download and run installer
Invoke-WebRequest -Uri "https://release.solana.com/v1.18.26/solana-install-init-x86_64-pc-windows-msvc.exe" -OutFile "C:\solana-installer.exe"
C:\solana-installer.exe

# Add to PATH (restart terminal after)
$env:PATH += ";C:\Users\$env:USERNAME\.local\share\solana\install\active_release\bin"
```

### Option B: WSL/Linux (Recommended)
```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Add to PATH
export PATH="/root/.local/share/solana/install/active_release/bin:$PATH"

# Verify installation
solana --version
```

---

## 🔑 Step 3: Create/Configure Wallet

```bash
# Generate new wallet (or use existing)
solana-keygen new --outfile ~/.config/solana/id.json

# Set cluster to devnet
solana config set --url https://api.devnet.solana.com

# Get your wallet address
solana address

# Request airdrop (2 SOL for deployment)
solana airdrop 2

# Check balance
solana balance
```

---

## 🚀 Step 4: Deploy Program

```bash
# Navigate to project directory
cd "c:\Users\RAHUL BANSAL\Desktop\solanaproject"

# Deploy using Anchor
anchor deploy --provider.cluster devnet

# Or deploy manually
solana program deploy target/deploy/multisig_dao.so
```

**✅ Note your Program ID** from the deployment output!

---

## 🔧 Step 5: Initialize Multisig

### Method A: Using TypeScript Script (Recommended)

```bash
# Run the initialization script
npx ts-node scripts/deploy-and-initialize.ts
```

### Method B: Using Anchor Test

```bash
# Run the test which includes initialization
anchor test --skip-build --skip-deploy
```

---

## 📝 Step 6: Update Configuration Files

After deployment, update these files with your actual **Program ID**:

### 1. **web/src/services/anchor.ts**
```typescript
const PROGRAM_ID = new PublicKey('YOUR_PROGRAM_ID_HERE')
const DEMO_MODE = false // Change to false!
```

### 2. **mobile/src/utils/constants.ts**
```typescript
export const PROGRAM_ID = 'YOUR_PROGRAM_ID_HERE';
export const RPC_ENDPOINT = 'https://api.devnet.solana.com';
```

### 3. **Anchor.toml** (should already be set)
```toml
[programs.devnet]
multisig_dao = "YOUR_PROGRAM_ID"
```

---

## 🧪 Step 7: Test Everything

### Test the deployed program:
```bash
anchor test --skip-build
```

### Test the web interface:
1. Make sure web server is running: `cd web && npm run dev`
2. Open http://localhost:5173
3. Connect Phantom wallet
4. Try creating a proposal

---

## 📱 Step 8: Test Mobile App

```bash
cd mobile
npm install   # if not already done  
npm start

# Scan QR code with Expo Go app
```

---

## 🎯 Quick Setup Script

If you have Solana CLI installed, run this all-in-one command:

```bash
# Set devnet
solana config set --url https://api.devnet.solana.com

# Airdrop SOL
solana airdrop 2

# Deploy
anchor deploy

# Initialize
npx ts-node scripts/deploy-and-initialize.ts
```

---

## 🐛 Troubleshooting

### Issue: "Insufficient funds"
```bash
solana airdrop 2
# Wait 30 seconds between airdrops if rate-limited
```

### Issue: "Program already deployed"
```bash
# Upgrade existing program
solana program deploy --program-id target/deploy/multisig_dao-keypair.json target/deploy/multisig_dao.so
```

### Issue: "Account already exists"
- This means the multisig is already initialized
- You can skip the initialization step

### Issue: "Cannot connect to devnet"
```bash
# Try different RPC endpoint
solana config set --url https://api.devnet.solana.com
# Or use a custom RPC like QuickNode or Alchemy
```

---

## ✅ Verification Checklist

- [ ] Solana CLI installed (`solana --version`)
- [ ] Wallet created and funded (`solana balance` > 1 SOL)
- [ ] Program deployed successfully
- [ ] Program ID noted and saved
- [ ] Multisig initialized on-chain
- [ ] Web app config updated (PROGRAM_ID, DEMO_MODE=false)
- [ ] Mobile app config updated
- [ ] Can create proposals via web interface
- [ ] Can vote on proposals
- [ ] Can execute approved proposals

---

## 📚 Resources

- **Solana Docs**: https://docs.solana.com
- **Anchor Docs**: https://www.anchor-lang.com
- **Solana Explorer (Devnet)**: https://explorer.solana.com/?cluster=devnet
- **Get Devnet SOL**: https://faucet.solana.com

---

🎉 **Once deployed, your DAO will be live on Solana Devnet!**
