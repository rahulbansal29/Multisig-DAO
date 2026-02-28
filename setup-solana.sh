#!/bin/bash

echo "=================================="
echo "  Solana DAO Project Setup"
echo "=================================="
echo ""

# Install Solana CLI
echo "📦 Installing Solana CLI..."
if ! command -v solana &> /dev/null; then
    sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
    export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
else
    echo "✅ Solana CLI already installed"
fi

# Verify installation
solana --version

# Configure Solana for devnet
echo ""
echo "🌐 Configuring Solana devnet..."
solana config set --url https://api.devnet.solana.com

# Generate wallet if doesn't exist
if [ ! -f "$HOME/.config/solana/id.json" ]; then
    echo ""
    echo "🔑 Generating new wallet keypair..."
    solana-keygen new --no-bip39-passphrase --outfile ~/.config/solana/id.json
else
    echo "✅ Wallet already exists"
fi

# Show wallet address
echo ""
echo "💰 Your wallet address:"
solana address

# Airdrop SOL for deployment
echo ""
echo "💸 Requesting airdrop (1 SOL for deployment)..."
solana airdrop 1 || echo "⚠️  Airdrop may be rate-limited, try again later"

echo ""
echo "📊 Current balance:"
solana balance

echo ""
echo "✅ Solana setup complete!"
echo ""
echo "Next steps:"
echo "1. Run: anchor build"
echo "2. Run: anchor deploy"
echo "3. Update program ID in web app"
