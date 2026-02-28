const { Connection, PublicKey, Keypair, SystemProgram, Transaction, TransactionInstruction } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PROGRAM_ID = new PublicKey('CVVKndUZyyWUeguAdjj6upABkz82HF3soCC8UD96VyVZ');

async function main() {
  console.log('\n🔧 Fixing Multisig Account\n');
  
  // Setup connection
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load wallet
  const homeDir = os.homedir();
  const walletPath = path.join(homeDir, '.config', 'solana', 'id.json');
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf8')))
  );
  
  console.log('Wallet:', walletKeypair.publicKey.toString());
  
  // Derive multisig PDA
  const [multisigPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('multisig'), walletKeypair.publicKey.toBuffer()],
    PROGRAM_ID
  );
  
  console.log('Multisig PDA:', multisigPDA.toString());
  console.log('');
  
  // Check if account exists
  const accountInfo = await connection.getAccountInfo(multisigPDA);
  
  if (!accountInfo || accountInfo.data.length === 0) {
    console.log('✅ No multisig account found. You can initialize a new one!');
    console.log('📍 Go to http://localhost:5174 and click "Initialize Multisig Now"\n');
    return;
  }
  
  console.log('Found existing account with', accountInfo.data.length, 'bytes of data');
  console.log('Owner:', accountInfo.owner.toString());
  console.log('');
  
  // Check if it's owned by our program
  if (!accountInfo.owner.equals(PROGRAM_ID)) {
    console.log('❌ Account is owned by a different program!');
    console.log('Cannot close this account.');
    return;
  }
  
  console.log('🗑️  Closing malformed multisig account...');
  console.log('This will recover the rent (~0.0023 SOL)\n');
  
  // Create close account instruction
  // The program needs to have a "close" instruction, but since it doesn't,
  // we'll transfer the lamports back and zero the data manually
  // Actually, we can't do this without a close instruction in the program.
  
  console.log('⚠️  The program doesn't have a close instruction.');
  console.log('We need to initialize WITH the same PDA seeds.');
  console.log('');
  console.log('The solution: Use "init_if_needed" or reinitialize:');
  console.log('');
  console.log('OPTION 1: Manually send SOL to cover the account');
  console.log('OPTION 2: Deploy a new version with init_if_needed');
  console.log('OPTION 3: Use a different authority (new wallet)');
  console.log('');
  console.log('❌ Current approach won\'t work. Suggesting workaround...\n');
  
  // The real solution: just use a different seed for the multisig
  console.log('💡 BEST SOLUTION: Use a version seed');
  console.log('');
  console.log('We can modify the PDA derivation to include a version number:');
  console.log('Current: ["multisig", authority]');
  console.log('New:     ["multisig", authority, version]');
  console.log('');
  console.log('This lets you create a fresh multisig without closing the old one.\n');
  console.log('For now, the QUICK FIX:');
  console.log('Go to Solana Explorer and close the account manually:');
  console.log('https://explorer.solana.com/address/' + multisigPDA.toString() + '?cluster=devnet');
  console.log('');
  console.log('OR use a different wallet address to create a new multisig.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error.message || error);
    process.exit(1);
  });
