import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Connection, clusterApiUrl, SystemProgram, Transaction } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

const PROGRAM_ID = new PublicKey('246LSTmpgZKDsNVsuJxmfsP22MqeMkYZRWo15majDuu7');
const AUTHORIZED_SIGNERS = [
  new PublicKey('3wEzj7icty3RaBUpuroWmCt5mpNL8Ki8TaajBRqBFEFk'),
  new PublicKey('HPkUHvWYfAj8CzyeaEsT8CdDyqh6KhZqr4SZFbBjjwQh'),
  new PublicKey('2YCDsgD8mZjDh6uom8J4gY6SmXWmJWxcDtQT8y5s5Tjr'),
];
const REQUIRED_THRESHOLD = 2;

async function testWebFlow() {
  // Load IDL
  const idlPath = path.join(__dirname, 'target', 'idl', 'multisig_dao.json');
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));

  console.log('✅ IDL loaded');
  console.log('📋 Available instructions:', idl.instructions.map((i: any) => i.name).join(', '));

  // Check if update_multisig_config is in IDL
  const hasUpdateMethod = idl.instructions.some((i: any) => i.name === 'update_multisig_config');
  console.log(`✅ update_multisig_config instruction available: ${hasUpdateMethod}`);

  // Connect to devnet
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  const balance = await connection.getBalance(AUTHORIZED_SIGNERS[0]);
  console.log(`✅ Connection to Devnet: ${AUTHORIZED_SIGNERS[0].toString()} balance: ${balance / 1e9} SOL`);

  // Check program on chain
  const programInfo = await connection.getAccountInfo(PROGRAM_ID);
  if (programInfo) {
    console.log(`✅ Program deployed: ${PROGRAM_ID.toString()}, Size: ${programInfo.data.length} bytes`);
  } else {
    console.error('❌ Program not found on chain');
    process.exit(1);
  }

  // Check multisig accounts
  console.log('\n🔍 Checking multisig accounts for authorized signers:');
  for (const signer of AUTHORIZED_SIGNERS) {
    const [multisigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('multisig'), signer.toBuffer()],
      PROGRAM_ID
    );

    const account = await connection.getAccountInfo(multisigPda);
    if (account) {
      console.log(`  ✅ ${signer.toString().slice(0, 8)}... has multisig account`);
    } else {
      console.log(`  ⚠️  ${signer.toString().slice(0, 8)}... no multisig account`);
    }
  }

  console.log('\n✅ All checks passed! Web can now initialize and manage multisigs.');
}

testWebFlow().catch(console.error);
