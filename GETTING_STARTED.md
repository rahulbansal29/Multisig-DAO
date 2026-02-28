# 🚀 Getting Started - Simple Steps

## Current Status
- ✅ Solana program deployed: `CVVKndUZyyWUeguAdjj6upABkz82HF3soCC8UD96VyVZ`
- ✅ Wallet funded: `3wEzj7icty3RaBUpuroWmCt5mpNL8Ki8TaajBRqBFEFk` (3.13 SOL)
- ❌ Multisig NOT initialized yet (this is why you get errors)

## The Problem
You're getting **"AccountNotInitialized"** error because the multisig account must be created BEFORE you can create proposals.

## Solution - Follow These Exact Steps

### Step 1: Initialize Multisig (REQUIRED - Do this ONCE)

Open PowerShell in your project folder and run:

```powershell
node scripts/init-multisig.js
```

**Expected output:**
```
Wallet: 3wEzj7icty3RaBUpuroWmCt5mpNL8Ki8TaajBRqBFEFk
Program ID: CVVKndUZyyWUeguAdjj6upABkz82HF3soCC8UD96VyVZ
Multisig PDA: [some address]
Vault PDA: [some address]

✅ Multisig initialized successfully!
Transaction: [transaction signature]

🎉 You can now create proposals in the web app!
```

### Step 2: Start Web App

```powershell
cd web
npm run dev
```

### Step 3: Use the App

1. Open browser: http://localhost:5173/
2. Connect your Phantom wallet (make sure it's on **Devnet**)
3. Click **"+ Create New Proposal"**
4. Fill in details and create!

---

## Common Issues & Fixes

### Issue: "AccountNotInitialized" error
**Fix:** Run Step 1 above (initialize multisig)

### Issue: Script fails with "Cannot read properties of undefined"
**Fix:** The IDL might be outdated. Rebuild the program:
```powershell
cargo build-sbf
```
Then try Step 1 again.

### Issue: "Insufficient funds"
**Fix:** Get more SOL from faucet:
```powershell
Start-Process "https://faucet.solana.com/?address=3wEzj7icty3RaBUpuroWmCt5mpNL8Ki8TaajBRqBFEFk"
```

### Issue: Web page is blank
**Fix:** 
1. Stop all node processes: `Get-Process node | Stop-Process -Force`
2. Restart dev server: `cd web; npm run dev`
3. Refresh browser (Ctrl+R)

---

## What Each Command Does

- `node scripts/init-multisig.js` - Creates the multisig treasury account on Solana blockchain
- `npm run dev` - Starts the web interface
- The web app lets you create, vote on, and execute proposals

---

## Need Help?

Check the browser console (F12) for errors and share the error message.
