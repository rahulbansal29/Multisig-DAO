const anchor = require('@coral-xyz/anchor');
const { PublicKey, Keypair, SystemProgram } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PROGRAM_ID = new PublicKey('CVVKndUZyyWUeguAdjj6upABkz82HF3soCC8UD96VyVZ');

// Load the IDL
const IDL = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../target/idl/multisig_dao.json'), 'utf8')
);

async function main() {
  // Setup connection
  const connection = new anchor.web3.Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load wallet keypair
  const homeDir = os.homedir();
  const walletPath = path.join(homeDir, '.config', 'solana', 'id.json');
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf8')))
  );
  
  console.log('Wallet:', walletKeypair.publicKey.toString());
  
  // Create provider
  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });
  anchor.setProvider(provider);
  
  // Create program instance with explicit program ID
  const program = new anchor.Program(IDL, PROGRAM_ID, provider);
  
  console.log('Program ID:', program.programId.toString());
  
  // Derive multisig PDA
  const [multisigPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('multisig'), walletKeypair.publicKey.toBuffer()],
    program.programId
  );
  
  console.log('Multisig PDA:', multisigPDA.toString());
  
  // Derive vault PDA
  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), multisigPDA.toBuffer()],
    program.programId
  );
  
  console.log('Vault PDA:', vaultPDA.toString());
  
  // Check if already initialized
  try {
    const multisigAccount = await program.account.multisig.fetch(multisigPDA);
    console.log('\n✅ Multisig already initialized!');
    console.log('Signers:', multisigAccount.signers.map(s => s.toString()));
    console.log('Threshold:', multisigAccount.threshold);
    console.log('\nYou can now create proposals in the web app!');
    return;
  } catch (e) {
    console.log('\nMultisig not initialized yet, creating...\n');
  }
  
  // Initialize multisig
  const signers = [walletKeypair.publicKey]; // Single signer
  const threshold = 1;
  
  console.log('Initializing multisig with:');
  console.log('Signers:', signers.map(s => s.toString()));
  console.log('Threshold:', threshold);
  
  const tx = await program.methods
    .initialize(signers, threshold)
    .accounts({
      multisig: multisigPDA,
      vault: vaultPDA,
      authority: walletKeypair.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  
  console.log('\n✅ Multisig initialized successfully!');
  console.log('Transaction:', tx);
  console.log('\n🎉 You can now create proposals in the web app!');
  console.log('📍 Go to http://localhost:5173 and refresh the page');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error.message || error);
    process.exit(1);
  });
