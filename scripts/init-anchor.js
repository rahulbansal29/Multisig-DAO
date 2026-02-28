const anchor = require('@coral-xyz/anchor');
const { Connection, PublicKey, Keypair, SystemProgram } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PROGRAM_ID = new PublicKey('CVVKndUZyyWUeguAdjj6upABkz82HF3soCC8UD96VyVZ');

async function main() {
  console.log('\n🚀 Initializing Multisig with Anchor\n');
  
  // Setup connection
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load wallet
  const homeDir = os.homedir();
  const walletPath = path.join(homeDir, '.config', 'solana', 'id.json');
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf8')))
  );
  
  console.log('Wallet:', walletKeypair.publicKey.toString());
  console.log('Program ID:', PROGRAM_ID.toString());
  console.log('');
  
  // Load IDL
  const idlPath = path.join(__dirname, '..', 'target', 'idl', 'multisig_dao.json');
  console.log('Loading IDL from:', idlPath);
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
  
  // Create provider
  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed'
  });
  anchor.setProvider(provider);
  
  // Create program (don't pass program ID since it's in the IDL metadata)
  const program = new anchor.Program(idl, provider);
  console.log('Anchor program loaded successfully\n');
  
  // Derive PDAs
  const [multisigPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('multisig'), walletKeypair.publicKey.toBuffer()],
    PROGRAM_ID
  );
  
  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), multisigPDA.toBuffer()],
    PROGRAM_ID
  );
  
  console.log('Multisig PDA:', multisigPDA.toString());
  console.log('Vault PDA:', vaultPDA.toString());
  console.log('');
  
  // Check if already initialized
  try {
    const accountInfo = await connection.getAccountInfo(multisigPDA);
    if (accountInfo && accountInfo.data.length > 0) {
      console.log('⚠️  Multisig account already exists');
      console.log('Checking if it\'s properly formatted...\n');
      
      try {
        const multisigData = await program.account.multisig.fetch(multisigPDA);
        console.log('✅ Multisig is properly initialized with Anchor!');
        console.log('Authority:', multisigData.authority.toString());
        console.log('Signers:', multisigData.signers.length);
        console.log('Threshold:', multisigData.threshold);
        console.log('Proposal Count:', multisigData.proposalCount.toString());
        console.log('\n🎉 You can now create proposals in the web app!');
        console.log('📍 Go to http://localhost:5174\n');
        return;
      } catch (e) {
        console.log('❌ Existing account is NOT Anchor-compatible!');
        console.log('We need to close it and reinitialize properly.\n');
        console.log('Please run: node scripts/close-and-reinit.js');
        return;
      }
    }
  } catch (e) {
    // Account doesn't exist, continue with initialization
  }
  
  console.log('Initializing multisig with Anchor...');
  console.log('  Authority: ' + walletKeypair.publicKey.toString());
  console.log('  Signers: [' + walletKeypair.publicKey.toString() + ']');
  console.log('  Threshold: 1');
  console.log('');
  
  try {
    const tx = await program.methods
      .initialize(
        [walletKeypair.publicKey], // signers array
        1 // threshold
      )
      .accounts({
        multisig: multisigPDA,
        vault: vaultPDA,
        authority: walletKeypair.publicKey,
        systemProgram: SystemProgram.programId
      })
      .rpc();
    
    console.log('✅ Multisig initialized successfully!');
    console.log('Transaction:', tx);
    console.log('\n🎉 You can now create proposals in the web app!');
    console.log('📍 Go to http://localhost:5174\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message || error);
    if (error.logs) {
      console.error('\nProgram logs:');
      error.logs.forEach(log => console.error('  ', log));
    }
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Initialization failed.');
    console.error('Error:', error.message || error);
    console.error('\nFull error:', error);
    process.exit(1);
  });
