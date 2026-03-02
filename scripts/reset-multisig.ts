#!/usr/bin/env ts-node

/**
 * Reset Multisig - Create fresh 2-of-3 multisig with your 3 wallets
 * 
 * This script helps you create a new multisig account with the correct
 * configuration when the old one was initialized incorrectly.
 * 
 * Usage: 
 *   npx ts-node scripts/reset-multisig.ts
 */

import { Connection, PublicKey, Keypair, clusterApiUrl } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

const DEPLOYED_CONFIG_PATH = path.join(__dirname, '../deployed-config.json');

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     Reset Multisig - Create New 2-of-3 Setup         ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // Your 3 wallet addresses
  const wallets = [
    '3wEzj7icty3RaBUpuroWmCt5mpNL8Ki8TaajBRqBFEFk',
    'HPkUHvWYfAj8CzyeaEsT8CdDyqh6KhZqr4SZFbBjjwQh',
    '2YCDsgD8mZjDh6uom8J4gY6SmXWmJWxcDtQT8y5s5Tjr'
  ];

  console.log('📋 Current Configuration (OLD):');
  const oldConfig = JSON.parse(fs.readFileSync(DEPLOYED_CONFIG_PATH, 'utf-8'));
  console.log('   Signers:', oldConfig.signers.length);
  console.log('   Threshold:', oldConfig.threshold);
  console.log('   Multisig PDA:', oldConfig.multisigPDA);
  console.log('\n⚠️  This was initialized with only 1 signer!\n');

  console.log('✅ New Configuration (will be created):');
  console.log('   Signers: 3');
  console.log('   └─ Wallet 1:', wallets[0]);
  console.log('   └─ Wallet 2:', wallets[1]);
  console.log('   └─ Wallet 3:', wallets[2]);
  console.log('   Threshold: 2 (2-of-3)');
  console.log('\n');

  console.log('📝 INSTRUCTIONS:');
  console.log('════════════════════════════════════════════════════════\n');
  
  console.log('1. Delete the old deployed-config.json:');
  console.log('   rm deployed-config.json\n');
  
  console.log('2. In your frontend, click "Initialize Multisig Now"');
  console.log('   This will create a NEW multisig with 3 signers\n');
  
  console.log('3. The new multisig will be created with:');
  console.log('   - All 3 wallet addresses as authorized signers');
  console.log('   - 2-of-3 approval threshold');
  console.log('   - New PDA addresses (different from old one)\n');

  console.log('4. After initialization, you can:');
  console.log('   - Create proposals');
  console.log('   - Approve with any of your 3 wallets');
  console.log('   - Execute after 2 approvals\n');

  console.log('⚠️  IMPORTANT: To approve with different wallets:');
  console.log('   1. Open Phantom extension');
  console.log('   2. Click the wallet switcher (top-right)');
  console.log('   3. Select a different wallet');
  console.log('   4. Refresh the page or disconnect/reconnect');
  console.log('   5. The new wallet will now be connected\n');

  console.log('════════════════════════════════════════════════════════');
  console.log('\nReady to delete old config? (You can do it manually)');
  console.log('Command: rm deployed-config.json\n');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
