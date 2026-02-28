const { Connection, PublicKey } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

const PROGRAM_ID = new PublicKey('CVVKndUZyyWUeguAdjj6upABkz82HF3soCC8UD96VyVZ');

async function main() {
  console.log('\n🔬 Analyzing Multisig Account Data\n');
  
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load NEW wallet
  const newWalletPath = path.join(__dirname, 'dao-authority.json');
  const { Keypair } = require('@solana/web3.js');
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(newWalletPath, 'utf8')))
  );
  
  // Derive multisig PDA
  const [multisigPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('multisig'), walletKeypair.publicKey.toBuffer()],
    PROGRAM_ID
  );
  
  console.log('Multisig PDA:', multisigPDA.toString());
  
  const accountInfo = await connection.getAccountInfo(multisigPDA);
  
  if (!accountInfo) {
    console.log('Account does not exist!');
    return;
  }
  
  const data = accountInfo.data;
  console.log('Total size:', data.length, 'bytes');
  console.log('');
  
  // Parse the data manually
  console.log('Data structure:');
  console.log('');
  
  let offset = 0;
  
  // Discriminator (8 bytes)
  const discriminator = data.slice(offset, offset + 8);
  console.log(`[0-7]   Discriminator: ${Buffer.from(discriminator).toString('hex')}`);
  offset += 8;
  
  // Authority pubkey (32 bytes)
  const authority = new PublicKey(data.slice(offset, offset + 32));
  console.log(`[8-39]  Authority: ${authority.toString()}`);
  offset += 32;
  
  // Signers Vec length (4 bytes)
  const signersLen = data.readUInt32LE(offset);
  console.log(`[40-43] Signers length: ${signersLen}`);
  offset += 4;
  
  // Signers (32 bytes each)
  const signers = [];
  for (let i = 0; i < signersLen; i++) {
    const signer = new PublicKey(data.slice(offset, offset + 32));
    signers.push(signer);
    console.log(`[${offset}-${offset+31}] Signer ${i}: ${signer.toString()}`);
    offset += 32;
  }
  
  // Threshold (1 byte)
  const threshold = data.readUInt8(offset);
  console.log(`[${offset}]     Threshold: ${threshold}`);
  offset += 1;
  
  // Proposal count (8 bytes)
  const proposalCount = data.readBigUInt64LE(offset);
  console.log(`[${offset}-${offset+7}] Proposal count: ${proposalCount}`);
  offset += 8;
  
  // Bump (1 byte)
  if (offset < data.length) {
    const bump = data.readUInt8(offset);
    console.log(`[${offset}]     Bump: ${bump}`);
    offset += 1;
  }
  
  // Vault bump (1 byte)
  if (offset < data.length) {
    const vaultBump = data.readUInt8(offset);
    console.log(`[${offset}]     Vault bump: ${vaultBump}`);
    offset += 1;
  }
  
  console.log('');
  console.log('Bytes used:', offset);
  console.log('Bytes remaining:', data.length - offset);
  console.log('');
  
  // Expected size calculation
  const expectedSize = 8 + 32 + 4 + (32 * signersLen) + 1 + 8 + 1 + 1;
  console.log('Expected size:', expectedSize, 'bytes');
  console.log('Actual size:', data.length, 'bytes');
  console.log('');
  
  if (data.length !== expectedSize) {
    console.log('❌ SIZE MISMATCH!');
    console.log('The account size does not match the expected Multisig structure.');
    console.log('');
    console.log('This is why Anchor can\'t deserialize it!');
    console.log('');
  } else {
    console.log('✅ Size matches!');
    console.log('');
    console.log('Account structure looks correct.');
    console.log('');
    console.log('Summary:');
    console.log('  Authority:', authority.toString());
    console.log('  Signers:', signers.map(s => s.toString()));
    console.log('  Threshold:', threshold);
    console.log('  Proposal Count:', proposalCount.toString());
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error.message || error);
    console.error(error.stack);
    process.exit(1);
  });
