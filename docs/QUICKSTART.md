# Quick Start Guide

## ⚡ 5-Minute Setup

### 1. Install Dependencies

```bash
# Install project dependencies
yarn install

# Install mobile dependencies
cd mobile && npm install && cd ..
```

### 2. Build & Test

```bash
# Build the Anchor program
anchor build

# Run tests
anchor test
```

### 3. Deploy to Devnet

```bash
# Configure for devnet
solana config set --url devnet

# Get devnet SOL
solana airdrop 2

# Deploy
anchor deploy

# Initialize multisig
ts-node scripts/initialize.ts
```

### 4. Run Mobile App

```bash
cd mobile

# Start Expo
npm start

# Scan QR code with Expo Go app
```

---

## 📱 Mobile App Usage

1. **Connect Wallet**
   - Tap "Connect Wallet"
   - Approve in Phantom wallet

2. **View Treasury**
   - See SOL balance
   - View token holdings
   - Check multisig config

3. **Create Proposal**
   - Tap "Create Proposal"
   - Enter recipient & amount
   - Set expiry (days)
   - Authenticate with biometrics
   - Sign in Phantom

4. **Approve Proposal**
   - Open proposal details
   - Tap "Approve"
   - Authenticate & sign

5. **Execute Proposal**
   - Wait for threshold
   - Tap "Execute"
   - Optional: simulate first
   - Authenticate & sign

---

## 🔑 Key Concepts

### Multisig (M-of-N)
- **M signers** must approve
- Out of **N total** signers
- Example: 2-of-3 means 2 signatures needed from 3 authorized signers

### Proposal Lifecycle
```
Created → Approved → Executed
         ↓
      Rejected/Expired
```

### PDA (Program Derived Address)
- Deterministic addresses
- No private keys needed
- Program has signing authority

---

## 🛠️ Common Commands

```bash
# Build program
anchor build

# Run tests
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Check program
solana program show <program-id>

# View account
solana account <address>

# Get balance
solana balance

# Airdrop (devnet only)
solana airdrop 2
```

---

## 📂 Important Files

```
programs/multisig_dao/src/
├── lib.rs              # Program entry point
├── state.rs            # Account structures
├── errors.rs           # Error codes
├── events.rs           # Event definitions
└── instructions/       # All instructions

mobile/src/
├── services/           # Blockchain & wallet
├── store/              # State management
├── screens/            # UI screens
└── utils/              # Helpers

docs/
├── ARCHITECTURE.md     # System design
├── SECURITY.md         # Security guide
├── THREAT_MODEL.md     # Threat analysis
└── DEPLOYMENT.md       # Deploy guide
```

---

## 🔍 Troubleshooting

### Build Issues

```bash
# Clean and rebuild
cargo clean
anchor build
```

### Test Failures

```bash
# Reset validator
solana-test-validator --reset

# Re-run tests
anchor test
```

### Deployment Errors

```bash
# Check balance
solana balance

# Get more SOL (devnet)
solana airdrop 2

# Verify program ID matches
grep -r "Fg6PaFpoGXkYsidMpWTK" .
```

### Mobile App Issues

```bash
# Clear cache
cd mobile
npm start -- --clear

# Reinstall dependencies
rm -rf node_modules
npm install
```

---

## 📚 Learn More

- [README.md](../README.md) - Full documentation
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- [SECURITY.md](SECURITY.md) - Security details
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide

---

## ⚠️ Important Notes

### For Development
- ✅ Use devnet
- ✅ Test thoroughly
- ✅ Experiment freely

### For Production
- ⚠️ Security audit required
- ⚠️ Use hardware wallets
- ⚠️ Test on devnet first
- ⚠️ Start with small amounts
- ⚠️ Have emergency procedures

---

## 🎯 Next Steps

1. ✅ Complete quick start
2. Read [ARCHITECTURE.md](ARCHITECTURE.md)
3. Review [SECURITY.md](SECURITY.md)
4. Test all features on devnet
5. Plan production deployment
6. Schedule security audit

---

## 💡 Tips

- **Save your keypairs** - You'll need them!
- **Document everything** - Addresses, configs, procedures
- **Test proposals first** - Use small amounts
- **Monitor regularly** - Check logs and events
- **Stay updated** - Follow Solana ecosystem news

---

## 🤝 Get Help

- 📖 Check documentation first
- 💬 Ask in Solana Discord
- 🐛 Open GitHub issue
- 📧 Contact security team (for vulnerabilities)

---

Good luck building! 🚀
