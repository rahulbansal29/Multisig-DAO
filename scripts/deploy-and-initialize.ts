import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import fs from "fs";
import path from "path";

// Load the IDL directly
const idl = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "target", "idl", "multisig_dao.json"), "utf-8"));

async function main() {
  console.log("🚀 Deploying and Initializing Multisig DAO...\n");

  // Set up connection to devnet
  const connection = new anchor.web3.Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );

  // Load wallet keypair
  const walletPath = path.join(process.env.HOME || process.env.USERPROFILE!, ".config", "solana", "id.json");
  
  if (!fs.existsSync(walletPath)) {
    console.error("❌ Wallet not found at:", walletPath);
    console.log("\n📝 Create a wallet first:");
    console.log("   solana-keygen new");
    process.exit(1);
  }

  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );

  console.log("👛 Wallet:", walletKeypair.publicKey.toString());

  // Check balance
  const balance = await connection.getBalance(walletKeypair.publicKey);
  console.log("💰 Balance:", balance / LAMPORTS_PER_SOL, "SOL\n");

  if (balance < 0.1 * LAMPORTS_PER_SOL) {
    console.log("⚠️  Low balance! Request airdrop:");
    console.log("   solana airdrop 1\n");
  }

  // Load program keypair
  const programKeypairPath = path.join(__dirname, "..", "target", "deploy", "multisig_dao-keypair.json");
  const programKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(programKeypairPath, "utf-8")))
  );

  console.log("📦 Program ID:", programKeypair.publicKey.toString());

  // Set up provider
  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  // Load program using deployed program ID 
  const programId = new PublicKey(idl.address);
  const program = new Program(idl as any, provider);

  console.log("\n✅ Program loaded\n");

  // Initialize multisig
  console.log("🔧 Initializing Multisig...");

  // Define signers (you can modify these addresses)
  const signers = [
    walletKeypair.publicKey, // Add your own wallet as a signer
    // Add more signer public keys here
    // new PublicKey("AnotherSignerPublicKey1..."),
    // new PublicKey("AnotherSignerPublicKey2..."),
  ];

  const threshold = 1; // Number of signatures required (adjust based on number of signers)

  let multisigPDA: PublicKey;
  let vaultPDA: PublicKey;

  const writeConfig = () => {
    const config = {
      programId: programKeypair.publicKey.toString(),
      multisigPDA: multisigPDA.toString(),
      vaultPDA: vaultPDA.toString(),
      signers: signers.map(s => s.toString()),
      threshold,
      network: "devnet",
    };

    const configPath = path.join(__dirname, "..", "deployed-config.json");
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    console.log("\n💾 Configuration saved to:", configPath);
  };

  try {
    // Derive multisig PDA
    [multisigPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("multisig"), walletKeypair.publicKey.toBuffer()],
      program.programId
    );

    console.log("📍 Multisig PDA:", multisigPDA.toString());

    // Derive vault PDA
    [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), multisigPDA.toBuffer()],
      program.programId
    );

    console.log("🏦 Vault PDA:", vaultPDA.toString());

    // Initialize multisig
    const tx = await program.methods
      .initialize(signers, threshold)
      .accounts({
        multisig: multisigPDA,
        vault: vaultPDA,
        authority: walletKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("\n✅ Multisig initialized!");
    console.log("📝 Transaction:", `https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    // Save configuration
    writeConfig();
    console.log("\n🎉 Deployment Complete!\n");
    console.log("📋 Next steps:");
    console.log("   1. Update web/src/utils/constants.ts with the program ID");
    console.log("   2. Update mobile/src/utils/constants.ts with the program ID");
    console.log(`   3. Set PROGRAM_ID = "${programKeypair.publicKey.toString()}"`);
    console.log(`   4. Set DEMO_MODE = false in web/src/services/anchor.ts\n`);

  } catch (error) {
    const err = error instanceof Error ? error : undefined;
    const message = err?.message ?? String(error);

    console.error("\n❌ Error:", message);

    if (message.includes("already in use")) {
      console.log("\n ℹ️ Multisig already initialized. This is normal if you've run this before.");
      writeConfig();
      return;
    }

    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
