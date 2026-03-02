import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MultisigDao } from "../target/types/multisig_dao";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert, expect } from "chai";

describe("multisig_dao", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.MultisigDao as Program<MultisigDao>;

  // Test keypairs
  let authority: Keypair;
  let signer1: Keypair;
  let signer2: Keypair;
  let signer3: Keypair;
  let nonSigner: Keypair;

  // PDAs
  let multisigPda: PublicKey;
  let vaultPda: PublicKey;
  let multisigBump: number;
  let vaultBump: number;

  before(async () => {
    // Generate test keypairs
    authority = Keypair.generate();
    signer1 = Keypair.generate();
    signer2 = Keypair.generate();
    signer3 = Keypair.generate();
    nonSigner = Keypair.generate();

    // Airdrop SOL to test accounts
    const airdropAmount = 5 * LAMPORTS_PER_SOL;
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(authority.publicKey, airdropAmount)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(signer1.publicKey, airdropAmount)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(signer2.publicKey, airdropAmount)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(signer3.publicKey, airdropAmount)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(nonSigner.publicKey, airdropAmount)
    );

    // Derive PDAs
    [multisigPda, multisigBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("multisig"), authority.publicKey.toBuffer()],
      program.programId
    );

    [vaultPda, vaultBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), multisigPda.toBuffer()],
      program.programId
    );
  });

  describe("initialize", () => {
    it("Creates a multisig with valid parameters", async () => {
      const signers = [signer1.publicKey, signer2.publicKey, signer3.publicKey];
      const threshold = 2;

      const tx = await program.methods
        .initialize(signers, threshold)
        .accounts({
          multisig: multisigPda,
          vault: vaultPda,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();

      console.log("Initialize transaction:", tx);

      // Fetch and validate multisig account
      const multisigAccount = await program.account.multisig.fetch(multisigPda);
      
      assert.equal(multisigAccount.authority.toString(), authority.publicKey.toString());
      assert.equal(multisigAccount.threshold, threshold);
      assert.equal(multisigAccount.signers.length, 3);
      assert.equal(multisigAccount.proposalCount.toNumber(), 0);
      
      // Verify signers
      signers.forEach((signer, index) => {
        assert.equal(multisigAccount.signers[index].toString(), signer.toString());
      });
    });

    it("Fails with threshold = 0", async () => {
      const newAuthority = Keypair.generate();
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(newAuthority.publicKey, LAMPORTS_PER_SOL)
      );

      const [multisig] = PublicKey.findProgramAddressSync(
        [Buffer.from("multisig"), newAuthority.publicKey.toBuffer()],
        program.programId
      );

      const [vault] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), multisig.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .initialize([signer1.publicKey], 0)
          .accounts({
            multisig,
            vault,
            authority: newAuthority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([newAuthority])
          .rpc();
        
        assert.fail("Should have failed with threshold = 0");
      } catch (error) {
        assert.include(error.toString(), "InvalidThreshold");
      }
    });

    it("Fails with threshold > signers length", async () => {
      const newAuthority = Keypair.generate();
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(newAuthority.publicKey, LAMPORTS_PER_SOL)
      );

      const [multisig] = PublicKey.findProgramAddressSync(
        [Buffer.from("multisig"), newAuthority.publicKey.toBuffer()],
        program.programId
      );

      const [vault] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), multisig.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .initialize([signer1.publicKey], 5)
          .accounts({
            multisig,
            vault,
            authority: newAuthority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([newAuthority])
          .rpc();
        
        assert.fail("Should have failed with threshold > signers");
      } catch (error) {
        assert.include(error.toString(), "InvalidThreshold");
      }
    });

    it("Fails with duplicate signers", async () => {
      const newAuthority = Keypair.generate();
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(newAuthority.publicKey, LAMPORTS_PER_SOL)
      );

      const [multisig] = PublicKey.findProgramAddressSync(
        [Buffer.from("multisig"), newAuthority.publicKey.toBuffer()],
        program.programId
      );

      const [vault] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), multisig.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .initialize([signer1.publicKey, signer1.publicKey], 2)
          .accounts({
            multisig,
            vault,
            authority: newAuthority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([newAuthority])
          .rpc();
        
        assert.fail("Should have failed with duplicate signers");
      } catch (error) {
        assert.include(error.toString(), "DuplicateSigner");
      }
    });
  });

  describe("create_proposal", () => {
    let proposalPda: PublicKey;
    let proposalBump: number;

    it("Creates a proposal from authorized signer", async () => {
      const multisigAccount = await program.account.multisig.fetch(multisigPda);
      const proposalIndex = multisigAccount.proposalCount;

      [proposalPda, proposalBump] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("proposal"),
          multisigPda.toBuffer(),
          proposalIndex.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      const instructionData = Buffer.from("test_instruction_data");
      const expiry = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days

      const tx = await program.methods
        .createProposal(instructionData, new anchor.BN(expiry))
        .accounts({
          multisig: multisigPda,
          proposal: proposalPda,
          creator: signer1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([signer1])
        .rpc();

      console.log("Create proposal transaction:", tx);

      // Fetch and validate proposal
      const proposal = await program.account.proposal.fetch(proposalPda);
      
      assert.equal(proposal.multisig.toString(), multisigPda.toString());
      assert.equal(proposal.creator.toString(), signer1.publicKey.toString());
      assert.equal(proposal.index.toNumber(), proposalIndex.toNumber());
      assert.equal(proposal.executed, false);
      assert.equal(proposal.rejected, false);
      assert.equal(proposal.approvedSigners.length, 0);

      // Verify proposal count increased
      const updatedMultisig = await program.account.multisig.fetch(multisigPda);
      assert.equal(updatedMultisig.proposalCount.toNumber(), proposalIndex.toNumber() + 1);
    });

    it("Fails when non-signer tries to create proposal", async () => {
      const multisigAccount = await program.account.multisig.fetch(multisigPda);
      const proposalIndex = multisigAccount.proposalCount;

      const [newProposal] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("proposal"),
          multisigPda.toBuffer(),
          proposalIndex.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      const expiry = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

      try {
        await program.methods
          .createProposal(Buffer.from("test"), new anchor.BN(expiry))
          .accounts({
            multisig: multisigPda,
            proposal: newProposal,
            creator: nonSigner.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([nonSigner])
          .rpc();
        
        assert.fail("Should have failed with unauthorized signer");
      } catch (error) {
        assert.include(error.toString(), "UnauthorizedSigner");
      }
    });
  });

  describe("approve_proposal", () => {
    let proposalPda: PublicKey;

    before(async () => {
      // Get the proposal created in previous test
      const multisigAccount = await program.account.multisig.fetch(multisigPda);
      const proposalIndex = multisigAccount.proposalCount.sub(new anchor.BN(1));

      [proposalPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("proposal"),
          multisigPda.toBuffer(),
          proposalIndex.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );
    });

    it("Allows authorized signer to approve proposal", async () => {
      const tx = await program.methods
        .approveProposal()
        .accounts({
          multisig: multisigPda,
          proposal: proposalPda,
          signer: signer2.publicKey,
        })
        .signers([signer2])
        .rpc();

      console.log("Approve proposal transaction:", tx);

      // Verify approval was recorded
      const proposal = await program.account.proposal.fetch(proposalPda);
      assert.equal(proposal.approvedSigners.length, 1);
      assert.equal(proposal.approvedSigners[0].toString(), signer2.publicKey.toString());
    });

    it("Prevents duplicate approval from same signer", async () => {
      try {
        await program.methods
          .approveProposal()
          .accounts({
            multisig: multisigPda,
            proposal: proposalPda,
            signer: signer2.publicKey,
          })
          .signers([signer2])
          .rpc();
        
        assert.fail("Should have failed with duplicate approval");
      } catch (error) {
        assert.include(error.toString(), "AlreadyApproved");
      }
    });

    it("Allows second signer to approve (reaching threshold)", async () => {
      const tx = await program.methods
        .approveProposal()
        .accounts({
          multisig: multisigPda,
          proposal: proposalPda,
          signer: signer3.publicKey,
        })
        .signers([signer3])
        .rpc();

      console.log("Second approval transaction:", tx);

      // Verify threshold reached
      const proposal = await program.account.proposal.fetch(proposalPda);
      const multisig = await program.account.multisig.fetch(multisigPda);
      
      assert.equal(proposal.approvedSigners.length, 2);
      assert.isTrue(proposal.approvedSigners.length >= multisig.threshold);
    });
  });

  describe("execute_proposal", () => {
    let proposalPda: PublicKey;

    before(async () => {
      const multisigAccount = await program.account.multisig.fetch(multisigPda);
      const proposalIndex = multisigAccount.proposalCount.sub(new anchor.BN(1));

      [proposalPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("proposal"),
          multisigPda.toBuffer(),
          proposalIndex.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );
    });

    it("Executes proposal after threshold reached", async () => {
      const tx = await program.methods
        .executeProposal()
        .accounts({
          multisig: multisigPda,
          proposal: proposalPda,
          vault: vaultPda,
          executor: signer1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([signer1])
        .rpc();

      console.log("Execute proposal transaction:", tx);

      // Verify execution status
      const proposal = await program.account.proposal.fetch(proposalPda);
      assert.equal(proposal.executed, true);
      assert.isTrue(proposal.executedAt.toNumber() > 0);
    });

    it("Prevents re-execution of already executed proposal", async () => {
      try {
        await program.methods
          .executeProposal()
          .accounts({
            multisig: multisigPda,
            proposal: proposalPda,
            vault: vaultPda,
            executor: signer1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([signer1])
          .rpc();
        
        assert.fail("Should have failed with already executed");
      } catch (error) {
        assert.include(error.toString(), "ProposalAlreadyExecuted");
      }
    });
  });

  describe("reject_proposal", () => {
    let proposalPda: PublicKey;

    before(async () => {
      // Create a new proposal to reject
      const multisigAccount = await program.account.multisig.fetch(multisigPda);
      const proposalIndex = multisigAccount.proposalCount;

      [proposalPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("proposal"),
          multisigPda.toBuffer(),
          proposalIndex.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      const expiry = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

      await program.methods
        .createProposal(Buffer.from("test_reject"), new anchor.BN(expiry))
        .accounts({
          multisig: multisigPda,
          proposal: proposalPda,
          creator: signer1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([signer1])
        .rpc();
    });

    it("Allows authorized signer to reject proposal", async () => {
      const tx = await program.methods
        .rejectProposal()
        .accounts({
          multisig: multisigPda,
          proposal: proposalPda,
          signer: signer2.publicKey,
        })
        .signers([signer2])
        .rpc();

      console.log("Reject proposal transaction:", tx);

      // Verify rejection
      const proposal = await program.account.proposal.fetch(proposalPda);
      assert.equal(proposal.rejected, true);
    });

    it("Prevents execution of rejected proposal", async () => {
      // Try to approve and execute
      await program.methods
        .approveProposal()
        .accounts({
          multisig: multisigPda,
          proposal: proposalPda,
          signer: signer1.publicKey,
        })
        .signers([signer1])
        .rpc();

      await program.methods
        .approveProposal()
        .accounts({
          multisig: multisigPda,
          proposal: proposalPda,
          signer: signer3.publicKey,
        })
        .signers([signer3])
        .rpc();

      try {
        await program.methods
          .executeProposal()
          .accounts({
            multisig: multisigPda,
            proposal: proposalPda,
            vault: vaultPda,
            executor: signer1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([signer1])
          .rpc();
        
        assert.fail("Should have failed with rejected proposal");
      } catch (error) {
        assert.include(error.toString(), "ProposalRejected");
      }
    });
  });

  describe("transfer_sol", () => {
    let proposalPda: PublicKey;
    const recipient = Keypair.generate();

    before(async () => {
      // Fund the vault
      const fundTx = await provider.connection.requestAirdrop(
        vaultPda,
        2 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(fundTx);
    });

    it("Transfers SOL from vault using PDA signer", async () => {
      const transferAmount = 0.5 * LAMPORTS_PER_SOL;
      
      const vaultBalanceBefore = await provider.connection.getBalance(vaultPda);
      const recipientBalanceBefore = await provider.connection.getBalance(recipient.publicKey);

      const tx = await program.methods
        .transferSol(new anchor.BN(transferAmount))
        .accounts({
          multisig: multisigPda,
          vault: vaultPda,
          recipient: recipient.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Transfer SOL transaction:", tx);

      // Verify balances changed correctly
      const vaultBalanceAfter = await provider.connection.getBalance(vaultPda);
      const recipientBalanceAfter = await provider.connection.getBalance(recipient.publicKey);

      assert.approximately(
        vaultBalanceBefore - vaultBalanceAfter,
        transferAmount,
        10000 // Allow for transaction fees
      );
      assert.equal(recipientBalanceAfter - recipientBalanceBefore, transferAmount);
    });
  });
});
