# Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the DAO Treasury + Multisig Wallet system to Solana devnet and mainnet-beta.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Local Testing](#local-testing)
4. [Devnet Deployment](#devnet-deployment)
5. [Mobile App Deployment](#mobile-app-deployment)
6. [Mainnet Deployment](#mainnet-deployment)
7. [Post-Deployment](#post-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

```bash
# Node.js (v18 or higher)
node --version

# Rust (1.70 or higher)
rustc --version

# Solana CLI (1.16 or higher)
solana --version

# Anchor CLI (0.29.0 or higher)
anchor --version

# Yarn or npm
yarn --version
```

### Install Missing Tools

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Install Node dependencies
yarn global add @coral-xyz/anchor-cli
```

---

## Environment Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd solanaproject
```

### 2. Install Dependencies

```bash
# Install root dependencies
yarn install

# Install mobile app dependencies
cd mobile
npm install
cd ..
```

### 3. Create Solana Keypairs

```bash
# Create or use existing wallet
solana-keygen new --outfile ~/.config/solana/id.json

# Create separate keypair for program deployment (recommended)
solana-keygen new --outfile ~/.config/solana/deployer.json

# View your public key
solana address
```

### 4. Configure Anchor

Edit `Anchor.toml`:

```toml
[provider]
cluster = "Devnet"  # Change to "Mainnet" for production
wallet = "~/.config/solana/id.json"  # Your deployer wallet

[programs.localnet]
multisig_dao = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"

[programs.devnet]
multisig_dao = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"
```

---

## Local Testing

### 1. Build Program

```bash
anchor build
```

This generates:
- `target/deploy/multisig_dao.so` - Compiled program
- `target/idl/multisig_dao.json` - Interface definition
- `target/types/multisig_dao.ts` - TypeScript types

### 2. Get Program ID

```bash
solana address -k target/deploy/multisig_dao-keypair.json
```

Copy this address and update:
1. `Anchor.toml` - In `[programs.localnet]` and `[programs.devnet]`
2. `programs/multisig_dao/src/lib.rs` - In `declare_id!(...)`
3. `mobile/src/utils/constants.ts` - In `PROGRAM_ID`

### 3. Rebuild After ID Update

```bash
anchor build
```

### 4. Start Local Validator

```bash
# In a separate terminal
solana-test-validator
```

### 5. Run Tests

```bash
# Configure for localhost
solana config set --url localhost

# Run tests
anchor test --skip-local-validator
```

Expected output:
```
  multisig_dao
    initialize
      ✓ Creates a multisig with valid parameters (523ms)
      ✓ Fails with threshold = 0 (412ms)
      ...
    
  30 passing (45s)
```

---

## Devnet Deployment

### 1. Configure for Devnet

```bash
solana config set --url devnet
```

### 2. Fund Your Wallet

```bash
# Request airdrop (devnet only)
solana airdrop 2

# Check balance
solana balance
```

You need at least 5 SOL for deployment and testing.

### 3. Deploy Program

```bash
anchor deploy --provider.cluster devnet
```

Output:
```
Deploying workspace: https://explorer.solana.com/tx/...
Upgrade authority: <your-wallet-address>
Deployed program: <program-id>
```

### 4. Verify Deployment

```bash
# Check program account
solana program show <program-id>

# View on explorer
# https://explorer.solana.com/address/<program-id>?cluster=devnet
```

### 5. Run Integration Tests

```bash
# Update Anchor.toml to use devnet
anchor test --provider.cluster devnet --skip-local-validator
```

### 6. Initialize Test Multisig

Create `scripts/initialize.ts`:

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MultisigDao } from "../target/types/multisig_dao";
import { PublicKey, Keypair } from "@solana/web3.js";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.MultisigDao as Program<MultisigDao>;

  // Generate test signers
  const signer1 = Keypair.generate();
  const signer2 = Keypair.generate();
  const signer3 = Keypair.generate();

  console.log("Signer 1:", signer1.publicKey.toString());
  console.log("Signer 2:", signer2.publicKey.toString());
  console.log("Signer 3:", signer3.publicKey.toString());

  const signers = [
    signer1.publicKey,
    signer2.publicKey,
    signer3.publicKey,
  ];
  const threshold = 2;

  // Derive PDAs
  const [multisigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("multisig"), provider.wallet.publicKey.toBuffer()],
    program.programId
  );

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), multisigPda.toBuffer()],
    program.programId
  );

  // Initialize multisig
  const tx = await program.methods
    .initialize(signers, threshold)
    .accounts({
      multisig: multisigPda,
      vault: vaultPda,
      authority: provider.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  console.log("\nMultisig initialized!");
  console.log("Transaction:", tx);
  console.log("Multisig address:", multisigPda.toString());
  console.log("Vault address:", vaultPda.toString());
  console.log("\nView on explorer:");
  console.log(`https://explorer.solana.com/address/${multisigPda}?cluster=devnet`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
```

Run:
```bash
ts-node scripts/initialize.ts
```

---

## Mobile App Deployment

### 1. Update Configuration

Edit `mobile/src/utils/constants.ts`:

```typescript
export const CLUSTER = 'devnet';  // or 'mainnet-beta'
export const RPC_ENDPOINT = clusterApiUrl(CLUSTER);

// Update with your deployed program ID
export const PROGRAM_ID = 'YourProgramIdHere';
```

### 2. Test Locally

```bash
cd mobile

# Start Expo
npm start

# Run on device
# Scan QR code with Expo Go app
```

### 3. Build for Production

#### iOS

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for iOS
eas build --platform ios
```

Requirements:
- Apple Developer account ($99/year)
- App Store Connect access

#### Android

```bash
# Build APK
eas build --platform android --profile preview

# Build for Play Store
eas build --platform android --profile production
```

Requirements:
- Google Play Developer account ($25 one-time)

### 4. Submit to App Stores

```bash
# Submit to Apple App Store
eas submit --platform ios

# Submit to Google Play Store
eas submit --platform android
```

---

## Mainnet Deployment

### ⚠️ Critical Pre-Deployment Checklist

Before deploying to mainnet:

- [ ] Complete professional security audit
- [ ] All tests passing (100% coverage)
- [ ] Extended devnet testing (minimum 1 month)
- [ ] Bug bounty program active
- [ ] Monitoring infrastructure ready
- [ ] Emergency procedures documented
- [ ] Insurance considerations evaluated
- [ ] Legal review completed
- [ ] Team training completed
- [ ] Backup procedures tested

### 1. Configure for Mainnet

```bash
solana config set --url mainnet-beta
```

### 2. Fund Deployment Wallet

```bash
# Check balance (requires real SOL)
solana balance

# You need at least 10 SOL for safe deployment
```

**Get SOL:**
- Buy on exchange (Coinbase, Binance, etc.)
- Transfer to your deployer wallet

### 3. Final Security Review

```bash
# Review all code one more time
git diff devnet-deployment..mainnet-deployment

# Check for hardcoded values
grep -r "devnet" .
grep -r "localhost" .

# Verify program ID is updated everywhere
```

### 4. Deploy to Mainnet

```bash
# Build with optimizations
anchor build --release

# Deploy
anchor deploy --provider.cluster mainnet-beta
```

**Cost:** ~5-10 SOL depending on program size

### 5. Verify Deployment

```bash
# Check program
solana program show <program-id> --url mainnet-beta

# View on explorer
# https://explorer.solana.com/address/<program-id>
```

### 6. Revoke Upgrade Authority (Recommended)

**⚠️ This is irreversible!**

```bash
# Revoke upgrade authority (makes program immutable)
solana program set-upgrade-authority <program-id> --final --url mainnet-beta

# Or transfer to multisig (recommended)
solana program set-upgrade-authority <program-id> --new-upgrade-authority <multisig-address> --url mainnet-beta
```

### 7. Initialize Production Multisig

```bash
# Update scripts/initialize.ts with real signer addresses
# Use production signers (with hardware wallets)

ts-node scripts/initialize.ts
```

**Important:**
- Use real signer public keys
- Verify all addresses multiple times
- Document multisig address securely
- Fund vault with small amount initially

### 8. Update Mobile App

Update `mobile/src/utils/constants.ts`:

```typescript
export const CLUSTER = 'mainnet-beta';
export const RPC_ENDPOINT = 'https://your-premium-rpc.com'; // Use paid RPC
export const PROGRAM_ID = 'YourMainnetProgramId';
```

Build and deploy new app version:

```bash
# Build production versions
eas build --platform all --profile production

# Submit to stores
eas submit --platform all
```

---

## Post-Deployment

### 1. Set Up Monitoring

```typescript
// Example: Monitor events
import { Connection } from '@solana/web3.js';

const connection = new Connection('https://api.mainnet-beta.solana.com');

// Subscribe to program logs
connection.onLogs(
  programId,
  (logs) => {
    console.log('Event:', logs);
    // Send to monitoring service (Datadog, etc.)
  },
  'confirmed'
);
```

### 2. Documentation

Create operator documentation:
- Multisig address and signers
- Emergency contacts
- Incident response procedures
- Regular maintenance tasks

### 3. Regular Tasks

**Daily:**
- Check monitoring dashboards
- Review transaction logs
- Verify system health

**Weekly:**
- Review governance proposals
- Check for security updates
- Backup important data

**Monthly:**
- Security audit review
- Dependency updates
- Performance analysis

### 4. Emergency Procedures

Document procedures for:
- Key compromise
- Smart contract vulnerability
- Network issues
- Team member unavailability

---

## Troubleshooting

### Build Errors

**Error:** `error: package `solana-program v1.x.x` cannot be built`

**Solution:**
```bash
cargo clean
anchor build
```

**Error:** `Program ID mismatch`

**Solution:**
Update program ID in:
1. `lib.rs` - `declare_id!(...)`
2. `Anchor.toml`
3. Rebuild: `anchor build`

### Deployment Errors

**Error:** `Insufficient funds`

**Solution:**
```bash
# Check balance
solana balance

# Get more SOL (devnet)
solana airdrop 2

# Get more SOL (mainnet)
# Buy from exchange
```

**Error:** `Program deploy failed: account data too small`

**Solution:**
```bash
# Extend program size
solana program extend <program-id> <additional-bytes> --url <cluster>
```

### Test Failures

**Error:** `Transaction simulation failed: Insufficient funds`

**Solution:**
```bash
# Airdrop to test accounts
solana airdrop 2 <address>
```

**Error:** `Account does not exist`

**Solution:**
- Ensure local validator is running
- Check if account was created in previous test
- Reset validator state: `solana-test-validator --reset`

### Mobile App Issues

**Error:** `Unable to connect to wallet`

**Solution:**
- Ensure Phantom is installed
- Check deep linking configuration
- Verify URL schemes are correct
- Test on physical device (not simulator)

**Error:** `Transaction failed`

**Solution:**
- Check RPC endpoint is reachable
- Verify program ID is correct
- Ensure wallet has sufficient SOL
- Check transaction simulation results

---

## Resources

### Documentation
- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Documentation](https://docs.solana.com/)
- [Expo Documentation](https://docs.expo.dev/)

### Tools
- [Solana Explorer](https://explorer.solana.com/)
- [Anchor Playground](https://beta.solpg.io/)
- [Solana Cookbook](https://solanacookbook.com/)

### RPC Providers (Mainnet)
- [GenesysGo](https://www.genesysgo.com/)
- [Triton One](https://triton.one/)
- [QuickNode](https://www.quicknode.com/)
- [Alchemy](https://www.alchemy.com/)

### Support
- [Solana Discord](https://discord.gg/solana)
- [Anchor Discord](https://discord.gg/anchor)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/solana)

---

## Maintenance

### Updating Dependencies

```bash
# Update Anchor
avm update

# Update Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Update Node dependencies
yarn upgrade

# Update mobile dependencies
cd mobile && npm update && cd ..
```

### Monitoring Updates

Subscribe to:
- Solana blog for network updates
- Anchor releases on GitHub
- Security advisories

---

## Conclusion

Follow this guide carefully for safe deployment. Always test thoroughly on devnet before mainnet deployment. When in doubt, seek expert advice or conduct additional security reviews.

**Remember:** Once deployed to mainnet, mistakes can be costly. Take your time and verify everything multiple times.

Good luck with your deployment! 🚀
