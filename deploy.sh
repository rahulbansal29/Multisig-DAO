#!/bin/bash

echo "=========================================="
echo "  🚀 Solana DAO - Quick Deploy Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0.32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Set Solana PATH
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

echo "📋 Step 1: Checking wallet..."
WALLET_ADDRESS=$(solana address 2>/dev/null)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Wallet found: $WALLET_ADDRESS${NC}"
else
    echo -e "${RED}❌ No wallet found${NC}"
    echo "Creating new wallet..."
    solana-keygen new --no-bip39-passphrase
    WALLET_ADDRESS=$(solana address)
fi

echo ""
echo "📋 Step 2: Checking balance..."
BALANCE=$(solana balance 2>/dev/null | awk '{print $1}')

echo "Current balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 0.5" | bc -l) )); then
    echo -e "${YELLOW}⚠️  Low balance. Need at least 0.5 SOL for deployment${NC}"
    echo ""
    echo "🔗 Get devnet SOL from one of these faucets:"
    echo "   1. Web: https://faucet.solana.com"
    echo "   2. Web: https://solfaucet.com"
    echo "   3. CLI: solana airdrop 2"
    echo ""
    echo "Your wallet address: $WALLET_ADDRESS"
    echo ""
    read -p "Press ENTER when you have funded your wallet..."
fi

echo ""
echo "📋 Step 3: Deploying program to devnet..."
cd "/mnt/c/Users/RAHUL BANSAL/Desktop/solanaproject" || exit

# Update Anchor.toml to use correct path
export ANCHOR_WALLET="$HOME/.config/solana/id.json"

# Try to deploy using solana program deploy
echo "Deploying multisig_dao program..."
PROGRAM_ID=$(solana program deploy target/deploy/multisig_dao.so --program-id target/deploy/multisig_dao-keypair.json 2>&1 | grep "Program Id:" | awk '{print $3}')

if [ -z "$PROGRAM_ID" ]; then
    echo -e "${RED}❌ Deployment failed. Checking balance...${NC}"
    solana balance
    exit 1
fi

echo -e "${GREEN}✅ Program deployed!${NC}"
echo "Program ID: $PROGRAM_ID"

echo ""
echo "📋 Step 4: Initializing multisig..."

# Check if TypeScript is available
if command -v npx &> /dev/null; then
    npx ts-node scripts/deploy-and-initialize.ts
else
    echo -e "${YELLOW}⚠️  TypeScript not available. Skipping initialization.${NC}"
    echo "Run manually: npx ts-node scripts/deploy-and-initialize.ts"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}  ✅ Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "📝 Configuration:"
echo "   Program ID: $PROGRAM_ID"
echo "   Network: Devnet"
echo "   Wallet: $WALLET_ADDRESS"
echo ""
echo "🌐 Next: Open http://localhost:5173 to use the web app!"
echo ""
