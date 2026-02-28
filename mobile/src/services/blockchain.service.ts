import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL as LAMPORTS,
} from '@solana/web3.js';
import { AnchorProvider, Program, Idl, BN } from '@coral-xyz/anchor';
import { Buffer } from 'buffer';
import {
  RPC_ENDPOINT,
  PROGRAM_ID,
  COMMITMENT,
  PREFLIGHT_COMMITMENT,
} from '@utils/constants';
import {
  Multisig,
  Proposal,
  ProposalWithKey,
  TreasuryBalance,
  TransactionSimulation,
} from '@types/index';

// Polyfill Buffer for React Native
global.Buffer = Buffer;

export class BlockchainService {
  private connection: Connection;
  private programId: PublicKey;

  constructor() {
    this.connection = new Connection(RPC_ENDPOINT, COMMITMENT);
    this.programId = new PublicKey(PROGRAM_ID);
  }

  /**
   * Get the connection instance
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Derive multisig PDA
   */
  async getMultisigPDA(authority: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
      [Buffer.from('multisig'), authority.toBuffer()],
      this.programId
    );
  }

  /**
   * Derive vault PDA
   */
  async getVaultPDA(multisig: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
      [Buffer.from('vault'), multisig.toBuffer()],
      this.programId
    );
  }

  /**
   * Derive proposal PDA
   */
  async getProposalPDA(
    multisig: PublicKey,
    proposalIndex: number
  ): Promise<[PublicKey, number]> {
    const indexBuffer = Buffer.alloc(8);
    indexBuffer.writeBigUInt64LE(BigInt(proposalIndex));

    return PublicKey.findProgramAddress(
      [Buffer.from('proposal'), multisig.toBuffer(), indexBuffer],
      this.programId
    );
  }

  /**
   * Fetch multisig account data
   */
  async getMultisig(multisigPubkey: PublicKey): Promise<Multisig | null> {
    try {
      const accountInfo = await this.connection.getAccountInfo(multisigPubkey);
      if (!accountInfo) return null;

      // Parse account data (simplified - in production use IDL)
      // This is a placeholder implementation
      const data = accountInfo.data;
      
      // Note: In production, use the Anchor IDL to properly deserialize
      // For now, returning mock structure
      return {
        authority: new PublicKey(data.slice(8, 40)),
        signers: [], // Parse from data
        threshold: data[40],
        proposalCount: 0,
        bump: data[41],
        vaultBump: data[42],
      };
    } catch (error) {
      console.error('Error fetching multisig:', error);
      return null;
    }
  }

  /**
   * Fetch proposal account data
   */
  async getProposal(proposalPubkey: PublicKey): Promise<Proposal | null> {
    try {
      const accountInfo = await this.connection.getAccountInfo(proposalPubkey);
      if (!accountInfo) return null;

      // Parse account data (simplified - in production use IDL)
      // This is a placeholder implementation
      return null; // Use Anchor IDL in production
    } catch (error) {
      console.error('Error fetching proposal:', error);
      return null;
    }
  }

  /**
   * Get all proposals for a multisig
   */
  async getProposals(multisig: PublicKey): Promise<ProposalWithKey[]> {
    try {
      // Get multisig to know proposal count
      const multisigData = await this.getMultisig(multisig);
      if (!multisigData) return [];

      const proposals: ProposalWithKey[] = [];

      // Fetch each proposal
      for (let i = 0; i < multisigData.proposalCount; i++) {
        const [proposalPDA] = await this.getProposalPDA(multisig, i);
        const proposal = await this.getProposal(proposalPDA);

        if (proposal) {
          proposals.push({
            ...proposal,
            publicKey: proposalPDA,
          });
        }
      }

      return proposals;
    } catch (error) {
      console.error('Error fetching proposals:', error);
      return [];
    }
  }

  /**
   * Get treasury balance (SOL + SPL tokens)
   */
  async getTreasuryBalance(vaultPubkey: PublicKey): Promise<TreasuryBalance> {
    try {
      const balance = await this.connection.getBalance(vaultPubkey);

      // Get SPL token accounts
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        vaultPubkey,
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );

      const tokens = tokenAccounts.value.map((account) => {
        const parsed = account.account.data.parsed.info;
        return {
          mint: new PublicKey(parsed.mint),
          amount: parsed.tokenAmount.uiAmount,
          decimals: parsed.tokenAmount.decimals,
        };
      });

      return {
        sol: balance,
        tokens,
      };
    } catch (error) {
      console.error('Error fetching treasury balance:', error);
      return { sol: 0, tokens: [] };
    }
  }

  /**
   * Simulate a transaction before execution
   */
  async simulateTransaction(
    transaction: Transaction
  ): Promise<TransactionSimulation> {
    try {
      const simulation = await this.connection.simulateTransaction(transaction);

      return {
        success: !simulation.value.err,
        logs: simulation.value.logs || [],
        unitsConsumed: simulation.value.unitsConsumed || 0,
        error: simulation.value.err?.toString(),
      };
    } catch (error) {
      return {
        success: false,
        logs: [],
        unitsConsumed: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a new multisig treasury
   * Returns the transaction to be signed by the wallet
   */
  async createInitializeTransaction(
    authority: PublicKey,
    signers: PublicKey[],
    threshold: number
  ): Promise<Transaction> {
    const [multisigPDA] = await this.getMultisigPDA(authority);
    const [vaultPDA] = await this.getVaultPDA(multisigPDA);

    // In production, build this using Anchor IDL
    const transaction = new Transaction();
    
    // Note: This is a placeholder. In production:
    // const program = new Program(IDL, PROGRAM_ID, provider);
    // const tx = await program.methods
    //   .initialize(signers, threshold)
    //   .accounts({ ... })
    //   .transaction();

    return transaction;
  }

  /**
   * Create a proposal transaction
   */
  async createProposalTransaction(
    multisigPubkey: PublicKey,
    creator: PublicKey,
    instructionData: Buffer,
    expiry: number
  ): Promise<Transaction> {
    const multisig = await this.getMultisig(multisigPubkey);
    if (!multisig) throw new Error('Multisig not found');

    const [proposalPDA] = await this.getProposalPDA(
      multisigPubkey,
      multisig.proposalCount
    );

    // Build transaction using Anchor (placeholder)
    const transaction = new Transaction();
    return transaction;
  }

  /**
   * Create approve proposal transaction
   */
  async createApproveTransaction(
    proposalPubkey: PublicKey,
    signer: PublicKey
  ): Promise<Transaction> {
    const transaction = new Transaction();
    // Build using Anchor
    return transaction;
  }

  /**
   * Create execute proposal transaction
   */
  async createExecuteTransaction(
    proposalPubkey: PublicKey,
    executor: PublicKey
  ): Promise<Transaction> {
    const transaction = new Transaction();
    // Build using Anchor
    return transaction;
  }

  /**
   * Send and confirm transaction
   */
  async sendAndConfirmTransaction(
    transaction: Transaction,
    signedTransaction: Buffer
  ): Promise<string> {
    try {
      const signature = await this.connection.sendRawTransaction(signedTransaction, {
        skipPreflight: false,
        preflightCommitment: PREFLIGHT_COMMITMENT,
      });

      await this.connection.confirmTransaction(signature, COMMITMENT);
      return signature;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  }
}

export const blockchainService = new BlockchainService();
