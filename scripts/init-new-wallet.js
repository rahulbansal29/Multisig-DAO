const anchor = require('@coral-xyz/anchor');
const { Connection, PublicKey, Keypair, SystemProgram } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

const PROGRAM_ID = new PublicKey('CVVKndUZyyWUeguAdjj6upABkz82HF3soCC8UD96VyVZ');

async function main() {
  console.log('\n🚀 Initializing Multisig for NEW DAO Wallet\n');
  
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load NEW wallet
  const newWalletPath = path.join(__dirname, 'dao-authority.json');
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(newWalletPath, 'utf8')))
  );
  
  console.log('Wallet:', walletKeypair.publicKey.toString());
  console.log('Program ID:', PROGRAM_ID.toString());
  console.log('');
  
  // Load IDL
  const idlPath = path.join(__dirname, '..', 'target', 'idl', 'multisig_dao.json');
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
  
  // Create provider  
  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed'
  });
  
  // Create program
  const program = new anchor.Program(idl, provider);
  
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
      console.log('⚠️  Account already exists. Checking format...');
      
      try {
        const multisigData = await program.account.multisig.fetch(multisigPDA);
        console.log('✅ Multisig already properly initialized!');
        console.log('Authority:', multisigData.authority.toString());
        console.log('Signers:', multisigData.signers.map(s => s.toString()));
        console.log('Threshold:', multisigData.threshold);
        console.log('Proposal Count:', multisigData.proposalCount.toString());
        console.log('\n🎉 Ready to create proposals!\n');
        return;
      } catch (e) {
        console.log('❌ Account exists but is malformed:', e.message);
        console.log('You need to use a different wallet or rebuild the program with close instruction.\n');
        return;
      }
    }
  } catch (e) {
    // Account doesn't exist, continue
  }
  
  console.log('Initializing new multisig...');
  console.log('Authority:', walletKeypair.publicKey.toString());
  console.log('Signers: [' + walletKeypair.publicKey.toString() + ']');
  console.log('Threshold: 1');
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
    console.log('\n🎉 Now you can create proposals in the web app!');
    console.log('📍 Refresh http://localhost:5174/ and try creating a proposal\n');
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
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  });
