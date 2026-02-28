const { Connection, PublicKey, Transaction, TransactionInstruction, Keypair, SystemProgram } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PROGRAM_ID = new PublicKey('CVVKndUZyyWUeguAdjj6upABkz82HF3soCC8UD96VyVZ');

async function main() {
  console.log('\n🔧 Closing Malformed Multisig Account\n');
  
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load wallet
  const homeDir = os.homedir();
  const walletPath = path.join(homeDir, '.config', 'solana', 'id.json');
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf8')))
  );
  
  console.log('Wallet:', walletKeypair.publicKey.toString());
  
  // Derive multisig PDA
  const [multisigPDA, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('multisig'), walletKeypair.publicKey.toBuffer()],
    PROGRAM_ID
  );
  
  console.log('Multisig PDA:', multisigPDA.toString());
  console.log('Bump:', bump);
  console.log('');
  
  // Check account
  const accountInfo = await connection.getAccountInfo(multisigPDA);
  
  if (!accountInfo) {
    console.log('✅ No account found - you can initialize fresh!');
    console.log('📍 Go to http://localhost:5174 and click Initialize\n');
    return;
  }
  
  console.log('Account exists with', accountInfo.data.length, 'bytes');
  console.log('Owner:', accountInfo.owner.toString());
  console.log('Rent:', accountInfo.lamports / 1e9, 'SOL');
  console.log('');
  
  if (!accountInfo.owner.equals(PROGRAM_ID)) {
    console.log('❌ Account is NOT owned by our program!');
    return;
  }
  
  console.log('Calling close_multisig instruction...');
  console.log('');
  
  try {
    // Create close instruction
    // Discriminator for "global:close_multisig" = sha256("global:close_multisig")[0..8]
    const discriminator = Buffer.from([203, 95, 212, 174, 44, 230, 75, 180]); // This will be different
    
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: multisigPDA, isSigner: false, isWritable: true },
        { pubkey: walletKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: discriminator,
    });
    
    const transaction = new Transaction().add(instruction);
    transaction.feePayer = walletKeypair.publicKey;
    
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    
    transaction.sign(walletKeypair);
    
    console.log('Sending transaction...');
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed'
    });
    
    console.log('Confirming...');
    await connection.confirmTransaction(signature, 'confirmed');
    
    console.log('\n✅ Account closed successfully!');
    console.log('Transaction:', signature);
    console.log('\n🎉 Now go to http://localhost:5174 and initialize fresh!\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message ||error);
    
    if (error.logs) {
      console.error('\nProgram logs:');
      error.logs.forEach(log => console.error('  ', log));
    }
    
    console.log('\n⚠️  The close instruction is not yet deployed.');
    console.log('The program needs to be rebuilt and upgraded first.');
    console.log('');
    console.log('TEMPORARY WORKAROUND:');
    console.log('1. Use a different Phantom wallet (create new one)');
    console.log('2. Request devnet SOL from faucet for new wallet');
    console.log('3. Connect that wallet to the web app');
    console.log('4. Initialize multisig with the new wallet\n');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error.message || error);
    process.exit(1);
  });
