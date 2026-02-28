import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, Connection } from "@solana/web3.js";
import fs from "fs";

async function main() {
  console.log("🔧 Initializing Multisig DAO...\n");

  // Connect to devnet
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  // Load wallet from WSL location
  const walletPath = "C:\\Users\\RAHUL BANSAL\\.config\\solana\\id.json";
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );

  console.log("👛 Wallet:", walletKeypair.publicKey.toString());

  // Check balance
  const balance = await connection.getBalance(walletKeypair.publicKey);
  console.log("💰 Balance:", balance / 1e9, "SOL\n");

  // Program ID
  const programId = new PublicKey("CVVKndUZyyWUeguAdjj6upABkz82HF3soCC8UD96VyVZ");

  // Define authorized signers (add more wallets here if you want)
  const signers = [
    walletKeypair.publicKey, // Your wallet as first signer
    // new PublicKey("AnotherWalletAddress..."), // Add more signers here
  ];

  const threshold = 1; // Number of approvals needed (1 for testing)

  console.log("📝 Multisig Configuration:");
  console.log("   Signers:", signers.length);
  console.log("   Threshold:", threshold);
  console.log("   Authorized wallets:");
  signers.forEach((s, i) => console.log(`     ${i + 1}. ${s.toString()}`));
  console.log();

  // Derive multisig PDA
  const [multisigPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("multisig"), walletKeypair.publicKey.toBuffer()],
    programId
  );

  console.log("📍 Multisig PDA:", multisigPDA.toString());

  // Derive vault PDA
  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), multisigPDA.toBuffer()],
    programId
  );

  console.log("🏦 Vault PDA:", vaultPDA.toString());
  console.log();

  // Build initialize instruction manually
  const initializeIx = new anchor.web3.TransactionInstruction({
    programId,
    keys: [
      { pubkey: multisigPDA, isSigner: false, isWritable: true },
      { pubkey: vaultPDA, isSigner: false, isWritable: false },
      { pubkey: walletKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: encodeInitialize(signers, threshold),
  });

  // Send transaction
  const tx = new anchor.web3.Transaction().add(initializeIx);
  
  try {
    const signature = await connection.sendTransaction(tx, [walletKeypair], {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    console.log("📤 Transaction sent!");
    console.log("⏳ Confirming...");

    await connection.confirmTransaction(signature, "confirmed");

    console.log("\n✅ Multisig initialized successfully!");
    console.log("📝 Transaction:", `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    console.log();

    // Save config
    const config = {
      programId: programId.toString(),
      multisigPDA: multisigPDA.toString(),
      vaultPDA: vaultPDA.toString(),
      authorizedSigners: signers.map(s => s.toString()),
      threshold,
      network: "devnet",
    };

    fs.writeFileSync("deployed-config.json", JSON.stringify(config, null, 2));
    console.log("💾 Configuration saved to: deployed-config.json\n");

    console.log("🎉 Setup Complete! You can now:");
    console.log("   1. Open http://localhost:5173");
    console.log("   2. Connect your Phantom wallet");
    console.log("   3. Create and vote on proposals!\n");

  } catch (error: any) {
    console.error("\n❌ Error:", error.message || error);
    
    if (error.logs) {
      console.log("\n📋 Program logs:");
      error.logs.forEach((log: string) => console.log("   ", log));
    }
  }
}

// Encode initialize instruction data
function encodeInitialize(signers: PublicKey[], threshold: number): Buffer {
  // Instruction discriminator for "initialize" (first 8 bytes of sha256("global:initialize"))
  const discriminator = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);
  
  // Encode signers count (4 bytes) + signers (32 bytes each)
  const signersCount = Buffer.alloc(4);
  signersCount.writeUInt32LE(signers.length, 0);
  
  const signersData = Buffer.concat(signers.map(s => s.toBuffer()));
  
  // Encode threshold (1 byte)
  const thresholdByte = Buffer.from([threshold]);
  
  return Buffer.concat([discriminator, signersCount, signersData, thresholdByte]);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
