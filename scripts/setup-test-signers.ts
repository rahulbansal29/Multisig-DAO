/**
 * Setup Test Signers for Multi-Signer Testing
 * 
 * This script creates 5 test keypairs that simulate 5 different signers
 * in the multisig. You can use these to test the full approval flow.
 * 
 * Usage: npx ts-node scripts/setup-test-signers.ts --fund
 */

import { Keypair, Connection, clusterApiUrl, SystemProgram, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

const TEST_SIGNERS_FILE = path.join(__dirname, '../test-signers.json');
const DEVNET = clusterApiUrl('devnet');
const AIRDROP_AMOUNT = 2; // SOL per signer

async function generateTestSigners() {
  console.log('🔐 Generating 5 test signer keypairs...\n');
  
  const signers = [];
  
  for (let i = 1; i <= 5; i++) {
    const keypair = Keypair.generate();
    const signer = {
      name: `Signer ${i}`,
      pubkey: keypair.publicKey.toString(),
      secret: Array.from(keypair.secretKey),
    };
    signers.push(signer);
    console.log(`✓ Signer ${i}: ${keypair.publicKey.toString()}`);
  }
  
  // Save to file
  const data = {
    created: new Date().toISOString(),
    signers,
  };
  
  fs.writeFileSync(TEST_SIGNERS_FILE, JSON.stringify(data, null, 2));
  console.log(`\n✅ Saved to: ${TEST_SIGNERS_FILE}`);
  
  return signers;
}

async function fundSigners(signers: any[]) {
  const connection = new Connection(DEVNET, 'confirmed');
  
  console.log('\n💰 Funding signers on devnet...\n');
  console.log('⚠️  NOTE: This requires SOL in your payer account!');
  console.log('If you need devnet SOL, visit: https://faucet.solana.com/\n');
  
  for (const signer of signers) {
    try {
      console.log(`Airdropping ${AIRDROP_AMOUNT} SOL to ${signer.name}...`);
      const signature = await connection.requestAirdrop(
        new (require('@solana/web3.js').PublicKey)(signer.pubkey),
        AIRDROP_AMOUNT * 1e9
      );
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      console.log(`✓ ${signer.name} funded!\n`);
    } catch (error: any) {
      if (error.message.includes('429')) {
        console.log(`⏳ Rate limited. Let's skip further airdrop requests.`);
        console.log(`\n📝 To fund remaining signers manually:`);
        console.log(`   Visit: https://faucet.solana.com/`);
        console.log(`   Paste each public key and request 2 SOL\n`);
        break;
      } else {
        console.log(`⚠️  Error: ${error.message}`);
      }
    }
  }
  
  console.log('\n✅ Signers setup complete!\n');
}

async function main() {
  const args = process.argv.slice(2);
  const shouldFund = args.includes('--fund');
  
  console.log(`\n╔════════════════════════════════════════╗`);
  console.log(`║     Multi-Signer Test Setup             ║`);
  console.log(`╚════════════════════════════════════════╝\n`);
  
  // Generate signers
  const signers = await generateTestSigners();
  
  console.log('\n📋 Test Signer Information:');
  console.log('═══════════════════════════');
  console.log(`Total signers created: 5`);
  console.log(`File saved: ${TEST_SIGNERS_FILE}\n`);
  
  console.log('Use this setup for testing:\n');
  console.log('  1. Initialize multisig with these 5 signers');
  console.log('  2. Set threshold to 3');
  console.log('  3. Create a proposal');
  console.log('  4. Use different signers to approve:\n');
  
  signers.forEach((s, i) => {
    console.log(`     ${i + 1}. Connect Signer ${i + 1}`);
    console.log(`        ${s.pubkey}`);
    if (i === 0) console.log(`        (Click "Approve" button)`);
  });
  
  console.log('\n  5. After 3 approvals, execute the proposal');
  console.log('  6. Verify the SOL transfer!\n');
  
  // Fund if requested
  if (shouldFund) {
    await fundSigners(signers);
  } else {
    console.log('To fund signers on devnet, run:');
    console.log('  npx ts-node scripts/setup-test-signers.ts --fund\n');
    console.log('Or manually visit: https://faucet.solana.com/\n');
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
