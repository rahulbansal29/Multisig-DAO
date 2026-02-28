const { Connection, PublicKey, SystemProgram, Transaction, Keypair, LAMPORTS_PER_SOL, sendAndConfirmTransaction } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function main() {
  console.log('\n💸 Transferring SOL to new DAO wallet\n');
  
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load old wallet (has SOL)
  const homeDir = os.homedir();
  const oldWalletPath = path.join(homeDir, '.config', 'solana', 'id.json');
  const oldWallet = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(oldWalletPath, 'utf8')))
  );
  
  // Load new wallet (needs SOL)
  const newWalletPath = path.join(__dirname, 'dao-authority.json');
  const newWallet = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(newWalletPath, 'utf8')))
  );
  
  console.log('From:', oldWallet.publicKey.toString());
  console.log('To:', newWallet.publicKey.toString());
  console.log('');
  
  // Check old wallet balance
  const oldBalance = await connection.getBalance(oldWallet.publicKey);
  console.log('Old wallet balance:', (oldBalance / LAMPORTS_PER_SOL).toFixed(4), 'SOL');
  
  // Transfer 1 SOL (enough for DAO operations)
  const amount = 1 * LAMPORTS_PER_SOL;
  
  console.log('Transferring:', amount / LAMPORTS_PER_SOL, 'SOL');
  console.log('');
  
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: oldWallet.publicKey,
      toPubkey: newWallet.publicKey,
      lamports: amount,
    })
  );
  
  console.log('Sending transaction...');
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [oldWallet],
    {
      commitment: 'confirmed',
    }
  );
  
  console.log('✅ Transfer complete!');
  console.log('Transaction:', signature);
  console.log('');
  
  // Check new balance
  const newBalance = await connection.getBalance(newWallet.publicKey);
  console.log('New wallet balance:', (newBalance / LAMPORTS_PER_SOL).toFixed(4), 'SOL');
  console.log('');
  console.log('🎉 Now refresh http://localhost:5174/ and initialize the multisig!\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error.message || error);
    process.exit(1);
  });
