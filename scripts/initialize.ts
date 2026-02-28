import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MultisigDao } from "../target/types/multisig_dao";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";

/**
 * Initialize a new multisig on devnet
 * 
 * Usage: ts-node scripts/initialize.ts
 */
async function main() {
  // Configure provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.MultisigDao as Program<MultisigDao>;

  console.log("🚀 Initializing Multisig DAO Treasury");
  console.log("==========================================");
  console.log(`Program ID: ${program.programId.toString()}`);
  console.log(`Authority: ${provider.wallet.publicKey.toString()}`);
  console.log();

  // Generate test signers (in production, use real addresses)
  const signer1 = Keypair.generate();
  const signer2 = Keypair.generate();
  const signer3 = Keypair.generate();

  // Airdrop SOL to signers for testing
  console.log("Airdropping SOL to test signers...");
  try {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(signer1.publicKey, 2 * LAMPORTS_PER_SOL)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(signer2.publicKey, 2 * LAMPORTS_PER_SOL)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(signer3.publicKey, 2 * LAMPORTS_PER_SOL)
    );
    console.log("✅ Airdrop complete");
  } catch (error) {
    console.warn("⚠️  Airdrop failed (you may be rate limited)");
  }

  console.log();
  console.log("Signer Addresses:");
  console.log("----------------");
  console.log(`Signer 1: ${signer1.publicKey.toString()}`);
  console.log(`Signer 2: ${signer2.publicKey.toString()}`);
  console.log(`Signer 3: ${signer3.publicKey.toString()}`);
  console.log();

  // Configure multisig
  const signers = [
    signer1.publicKey,
    signer2.publicKey,
    signer3.publicKey,
  ];
  const threshold = 2; // 2-of-3 multisig

  console.log(`Configuration: ${threshold}-of-${signers.length} multisig`);
  console.log();

  // Derive PDAs
  const [multisigPda, multisigBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("multisig"), provider.wallet.publicKey.toBuffer()],
    program.programId
  );

  const [vaultPda, vaultBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), multisigPda.toBuffer()],
    program.programId
  );

  console.log("Derived Accounts:");
  console.log("----------------");
  console.log(`Multisig PDA: ${multisigPda.toString()}`);
  console.log(`Vault PDA: ${vaultPda.toString()}`);
  console.log();

  // Initialize multisig
  console.log("Initializing multisig...");
  try {
    const tx = await program.methods
      .initialize(signers, threshold)
      .accounts({
        multisig: multisigPda,
        vault: vaultPda,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Multisig initialized successfully!");
    console.log();
    console.log("Transaction Details:");
    console.log("-------------------");
    console.log(`Signature: ${tx}`);
    console.log();
    
    // Get cluster info
    const cluster = await provider.connection.getClusterNodes();
    const clusterName = cluster.length > 100 ? "mainnet-beta" : "devnet";
    
    console.log("View on Explorer:");
    console.log(`https://explorer.solana.com/tx/${tx}?cluster=${clusterName}`);
    console.log(`https://explorer.solana.com/address/${multisigPda}?cluster=${clusterName}`);
    console.log();

    // Fetch and display multisig data
    const multisigData = await program.account.multisig.fetch(multisigPda);
    
    console.log("Multisig Details:");
    console.log("----------------");
    console.log(`Authority: ${multisigData.authority.toString()}`);
    console.log(`Threshold: ${multisigData.threshold}`);
    console.log(`Signers: ${multisigData.signers.length}`);
    console.log(`Proposal Count: ${multisigData.proposalCount.toString()}`);
    console.log();

    // Fund vault with initial SOL for testing
    console.log("Funding vault with 1 SOL for testing...");
    const fundTx = await provider.connection.requestAirdrop(
      vaultPda,
      1 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(fundTx);
    
    const balance = await provider.connection.getBalance(vaultPda);
    console.log(`✅ Vault balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    console.log();

    // Save configuration to file
    const config = {
      programId: program.programId.toString(),
      multisig: multisigPda.toString(),
      vault: vaultPda.toString(),
      authority: provider.wallet.publicKey.toString(),
      threshold,
      signers: signers.map(s => s.toString()),
      testSignerKeypairs: {
        signer1: Array.from(signer1.secretKey),
        signer2: Array.from(signer2.secretKey),
        signer3: Array.from(signer3.secretKey),
      },
      cluster: clusterName,
      initialized: new Date().toISOString(),
    };

    const fs = require('fs');
    fs.writeFileSync(
      'multisig-config.json',
      JSON.stringify(config, null, 2)
    );
    console.log("📝 Configuration saved to multisig-config.json");
    console.log();

    console.log("==========================================");
    console.log("✅ Setup Complete!");
    console.log("==========================================");
    console.log();
    console.log("Next Steps:");
    console.log("1. Update mobile/src/utils/constants.ts with the Program ID");
    console.log("2. Save the signer keypairs securely");
    console.log("3. Start the mobile app and connect with a wallet");
    console.log("4. Create your first proposal!");
    console.log();
    console.log("⚠️  WARNING: This uses test keypairs. For production:");
    console.log("   - Use real hardware wallets");
    console.log("   - Never share private keys");
    console.log("   - Complete security audit");
    console.log();

  } catch (error) {
    console.error("❌ Initialization failed:");
    console.error(error);
    process.exit(1);
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
