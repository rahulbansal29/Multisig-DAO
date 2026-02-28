const { Connection, PublicKey, Keypair, SystemProgram, Transaction, TransactionInstruction } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

const PROGRAM_ID = new PublicKey('CVVKndUZyyWUeguAdjj6upABkz82HF3soCC8UD96VyVZ');

async function main() {
  console.log('\n🚀 Initializing Multisig for NEW Wallet (Direct Method)\n');
  
  // Setup connection
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load NEW wallet
  const newWalletPath = path.join(__dirname, 'dao-authority.json');
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(newWalletPath, 'utf8')))
  );
  
  console.log('NEW Wallet:', walletKeypair.publicKey.toString());
  console.log('Program ID:', PROGRAM_ID.toString());
  
  // Derive multisig PDA for NEW wallet
  const [multisigPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('multisig'), walletKeypair.publicKey.toBuffer()],
    PROGRAM_ID
  );
  
  console.log('Multisig PDA:', multisigPDA.toString());
  
  // Derive vault PDA
  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), multisigPDA.toBuffer()],
    PROGRAM_ID
  );
  
  console.log('Vault PDA:', vaultPDA.toString());
  console.log('');
  
  // Check if already initialized
  try {
    const accountInfo = await connection.getAccountInfo(multisigPDA);
    if (accountInfo && accountInfo.data.length > 0) {
      console.log('✅ Multisig already initialized!');
      console.log('Account exists with', accountInfo.data.length, 'bytes');
      console.log('\n🎉 You can now create proposals!');
      console.log('📍 Refresh http://localhost:5174/ and try again\n');
      return;
    }
  } catch (e) {
    // Not initialized yet
  }
  
  console.log('Creating multisig with:');
  console.log('  Authority: ' + walletKeypair.publicKey.toString());
  console.log('  Signer: ' + walletKeypair.publicKey.toString());
  console.log('  Threshold: 1');
  console.log('');
  
  // Create instruction data
  // Format: discriminator (8 bytes) + signers array length (4 bytes) + pubkey (32 bytes) + threshold (1 byte)
  const discriminator = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]); // sha256("global:initialize")[0..8]
  
  const instructionData = Buffer.alloc(8 + 4 + 32 + 1);
  discriminator.copy(instructionData, 0);
  instructionData.writeUInt32LE(1, 8); // 1 signer
  walletKeypair.publicKey.toBuffer().copy(instructionData, 12); // signer pubkey
  instructionData.writeUInt8(1, 44); // threshold = 1
  
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: multisigPDA, isSigner: false, isWritable: true },
      { pubkey: vaultPDA, isSigner: false, isWritable: false },
      { pubkey: walletKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: instructionData,
  });
  
  const transaction = new Transaction().add(instruction);
  transaction.feePayer = walletKeypair.publicKey;
  
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  
  transaction.sign(walletKeypair);
  
  console.log('Sending transaction...');
  const signature = await connection.sendRawTransaction(transaction.serialize());
  
  console.log('Confirming...');
  await connection.confirmTransaction(signature, 'confirmed');
  
  console.log('\n✅ Multisig initialized successfully!');
  console.log('Transaction:', signature);
  console.log('\n🎉 Now you can create proposals!');
  console.log('📍 Refresh http://localhost:5174/ and try creating a proposal\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error.message || error);
    console.error('\nFull error:', error);
    process.exit(1);
  });
