#!/bin/bash

echo "🗑️  Closing malformed multisig account"
echo ""

# Derive the multisig PDA address
# We need to calculate it using the same seeds the program uses
AUTHORITY=$(solana address)
echo "Authority: $AUTHORITY"

# The PDA is at: Ci8hdZyekgKut3nJsUnKoSRJNth8y1YjTXLUxHfLqasm (we know this from init-simple.js)
MULTISIG_PDA="Ci8hdZyekgKut3nJsUnKoSRJNth8y1YjTXLUxHfLqasm"
echo "Multisig PDA: $MULTISIG_PDA"
echo ""

# Check if the account exists
echo "Checking account..."
solana account $MULTISIG_PDA --url devnet

echo ""
echo "⚠️  This account was initialized with raw bytes (not Anchor format)"
echo "The only way to fix this is to:"
echo "1. Transfer ownership back to yourself (not possible without a 'close' instruction)"
echo "2. OR use a different wallet as authority"
echo "3. OR rebuild the program with a 'close_account' instruction"
echo ""
echo "RECOMMENDED: Click 'Initialize Multisig Now' in the web app."
echo "If it fails with 'account already exists', you need to use a different wallet."
echo ""
