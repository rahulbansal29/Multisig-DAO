import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

// Load the IDL
const IDL = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../target/idl/multisig_dao.json'), 'utf8')
);

const PROGRAM_ID = new PublicKey('CVVKndUZyyWUeguAdjj6upABkz82HF3soCC8UD96VyVZ');

async function main() {
  // Setup connection
  const connection = new anchor.web3.Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load wallet keypair
  const walletPath = path.join(process.env.HOME || process.env.USERPROFILE!, '.config', 'solana', 'id.json');
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
  
  // Create program instance  
  const program = new Program(IDL as any, provider);
  
  console.log('Program ID:', program.programId.toString());
  
  // Derive multisig PDA
  const [multisigPDA, multisigBump] = PublicKey.findProgramAddressSync(
    [Buffer.from('multisig'), walletKeypair.publicKey.toBuffer()],
    program.programId
  );
  
  console.log('Multisig PDA:', multisigPDA.toString());
  
  // Derive vault PDA
  const [vaultPDA, vaultBump] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), multisigPDA.toBuffer()],
    program.programId
  );
  
  console.log('Vault PDA:', vaultPDA.toString());
  
  // Check if already initialized
  try {
    const multisigAccount = await (program.account as any).multisig.fetch(multisigPDA);
    console.log('✅ Multisig already initialized!');
    console.log('Signers:', multisigAccount.signers.map((s: any) => s.toString()));
    console.log('Threshold:', multisigAccount.threshold);
    return;
  } catch (e) {
    console.log('Multisig not initialized yet, creating...');
  }
  
  // Initialize multisig
  const signers = [walletKeypair.publicKey]; // Single signer
  const threshold = 1;
  
  console.log('\nInitializing multisig with:');
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
  console.log('\nYou can now create proposals in the web app!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
