const { Keypair } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

console.log('\n🔑 Creating new DAO authority wallet\n');

// Generate new keypair
const keypair = Keypair.generate();

console.log('Public Key:', keypair.publicKey.toString());
console.log('');

// Save to file
const keyPath = path.join(__dirname, 'dao-authority.json');
fs.writeFileSync(
  keyPath,
  JSON.stringify(Array.from(keypair.secretKey))
);

console.log('Keypair saved to:', keyPath);
console.log('');

// Show private key array for Phantom import
console.log('📋 TO IMPORT TO PHANTOM:');
console.log('Copy this private key array:');
console.log('');
console.log(JSON.stringify(Array.from(keypair.secretKey)));
console.log('');
console.log('STEPS:');
console.log('1. Open Phantom wallet');
console.log('2. Menu → Add / Connect Wallet → Import Private Key');
console.log('3. Paste the array above');
console.log('4. Switch to Devnet in Phantom settings');
console.log('5. Fund it: https://faucet.solana.com/?address=' + keypair.publicKey.toString());
console.log('6. Connect this wallet in the web app');
console.log('7. Initialize multisig - it will work!');
console.log('');
