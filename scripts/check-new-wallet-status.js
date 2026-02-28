const { Connection, PublicKey } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

const PROGRAM_ID = new PublicKey('CVVKndUZyyWUeguAdjj6upABkz82HF3soCC8UD96VyVZ');

async function main() {
  console.log('\n🔍 Checking Multisig Status for NEW Wallet\n');
  
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load NEW wallet
  const newWalletPath = path.join(__dirname, 'dao-authority.json');
  const walletData = JSON.parse(fs.readFileSync(newWalletPath, 'utf8'));
  const { Keypair } = require('@solana/web3.js');
  const walletKeypair = Keypair.fromSecretKey(new Uint8Array(walletData));
  
  console.log('NEW Wallet Address:', walletKeypair.publicKey.toString());
  
  // Check wallet balance
  const balance = await connection.getBalance(walletKeypair.publicKey);
  console.log('Balance:', (balance / 1e9).toFixed(4), 'SOL');
  console.log('');
  
  // Derive multisig PDA for NEW wallet
  const [multisigPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('multisig'), walletKeypair.publicKey.toBuffer()],
    PROGRAM_ID
  );
  
  console.log('Expected Multisig PDA:', multisigPDA.toString());
  
  // Check if multisig account exists
  const accountInfo = await connection.getAccountInfo(multisigPDA);
  
  if (!accountInfo) {
    console.log('');
    console.log('❌ MULTISIG NOT INITIALIZED!');
    console.log('');
    console.log('The account does NOT exist on-chain.');
    console.log('');
    console.log('💡 SOLUTION:');
    console.log('1. Make sure you are connected to wallet: ' + walletKeypair.publicKey.toString());
    console.log('2. Go to http://localhost:5174/');
    console.log('3. Look for the yellow "Initialize Your Multisig DAO" banner');
    console.log('4. Click "✨ Initialize Multisig Now"');
    console.log('5. APPROVE in Phantom');
    console.log('6. Wait for success message');
    console.log('');
    console.log('If the button doesn\'t appear, check browser console (F12) for errors.\n');
    return;
  }
  
  console.log('');
  console.log('✅ MULTISIG ACCOUNT EXISTS!');
  console.log('');
  console.log('Account Details:');
  console.log('  Owner:', accountInfo.owner.toString());
  console.log('  Size:', accountInfo.data.length, 'bytes');
  console.log('  Lamports:', accountInfo.lamports);
  console.log('');
  
  // Check if it's properly formatted
  if (accountInfo.data.length < 8) {
    console.log('⚠️  Account exists but is too small (likely empty)');
    return;
  }
  
  // Check discriminator (first 8 bytes)
  const discriminator = accountInfo.data.slice(0, 8);
  console.log('Discriminator:', Buffer.from(discriminator).toString('hex'));
  
  // Try to parse basic fields
  try {
    const authority = new PublicKey(accountInfo.data.slice(8, 40));
    console.log('Authority:', authority.toString());
    
    if (authority.equals(walletKeypair.publicKey)) {
      console.log('✅ Authority matches wallet!');
    } else {
      console.log('⚠️  Authority does NOT match wallet');
    }
    
    console.log('');
    console.log('🎉 Multisig is initialized!');
    console.log('');
    console.log('Try creating a proposal now.');
    console.log('If it still fails, check browser console (F12) for errors.\n');
  } catch (e) {
    console.log('');
    console.log('⚠️  Could not parse account data');
    console.log('Error:', e.message);
    console.log('');
    console.log('The account might be malformed.');
    console.log('You may need to use a different wallet.\n');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error.message || error);
    process.exit(1);
  });
