

import { Connection, PublicKey, SystemProgram, LAMPORTS_PER_SOL, clusterApiUrl } from '@solana/web3.js';
import deployedConfig from '../config/deployedConfig';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';
import { walletService } from './wallet';
import IDLData from '../../../target/idl/multisig_dao.json';
const IDL = IDLData as any;
const PROGRAM_ID = new PublicKey(IDL.address);
const DEMO_MODE = false;

export interface ProposalData {
  pubkey: PublicKey;
  id?: number;
  description: string;
  recipient: PublicKey;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  votesFor: number;
  votesAgainst: number;
  proposer: PublicKey;
  createdAt: number;
}

export class AnchorService {
  private connection: Connection;
  private provider: AnchorProvider | null = null;
  private program: Program | null = null;
  private demoProposals: ProposalData[] = [];
  private demoInitialized = false;

  constructor() {
    this.connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  }

  voteOnProposal = async (proposalPubkey: PublicKey, approve: boolean): Promise<string> => {
    if (!this.program) {
      throw new Error('Program not initialized. Call initialize() first.');
    }
    const multisigPda = new PublicKey(deployedConfig.multisigPDA);
    const userKey = await walletService.getPublicKey();
    if (!userKey) {
      throw new Error('Wallet not connected');
    }
    let tx;
    if (approve) {
      tx = await this.program.methods
        .approveProposal()
        .accounts({
          multisig: multisigPda,
          proposal: proposalPubkey,
          signer: userKey,
        })
        .rpc();
    } else {
      tx = await this.program.methods
        .rejectProposal()
        .accounts({
          multisig: multisigPda,
          proposal: proposalPubkey,
          signer: userKey,
        })
        .rpc();
    }
    return tx;
  }

  async initialize(): Promise<void> {
    try {
      if (DEMO_MODE) {
        this.demoInitialized = true;
        return;
      }
      const wallet = await walletService.getProvider();
      this.provider = new AnchorProvider(
        this.connection,
        wallet as any,
        { commitment: 'confirmed' }
      );
      this.program = new Program(IDL, this.provider as any) as any;
    } catch (error) {
      console.error('❌ Error initializing Anchor program:', error);
      throw new Error(`Failed to initialize program: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async createProposal(
    walletPublicKey: PublicKey,
    description: string,
    recipient: PublicKey,
    amount: number
  ): Promise<string> {
    try {
      if (DEMO_MODE) {
        if (!this.demoInitialized) {
          throw new Error('Program not initialized. Call initialize() first.');
        }
        const newProposal: ProposalData = {
          pubkey: new PublicKey(`1111111111111111111111111111111${this.demoProposals.length + 4}`),
          description,
          recipient,
          amount,
          status: 'pending',
          votesFor: 0,
          votesAgainst: 0,
          proposer: walletPublicKey,
          createdAt: Date.now()
        };
        this.demoProposals.push(newProposal);
        return 'demo_tx_' + Math.random().toString(36).substring(7);
      }
      if (!this.program) {
        throw new Error('Program not initialized. Call initialize() first.');
      }
      // deployedConfig is imported at the top
      const multisigPda = new PublicKey(deployedConfig.multisigPDA);
      let proposalCount = 0;
      try {
        const multisigAccount = await (this.program as any).account.multisig.fetch(multisigPda);
        proposalCount = (multisigAccount as any).proposalCount || 0;
      } catch (fetchError) {
        proposalCount = 0;
      }
      const proposalCountBuffer = Buffer.alloc(8);
      proposalCountBuffer.writeBigUInt64LE(BigInt(proposalCount.toString()));
      const [proposalPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('proposal'), multisigPda.toBuffer(), proposalCountBuffer],
        PROGRAM_ID
      );
      const lamports = amount * LAMPORTS_PER_SOL;
      const instructionDataObj = {
        description,
        recipient: recipient.toString(),
        amount: lamports
      };
      const instructionData = Buffer.from(JSON.stringify(instructionDataObj));
      const expiry = new anchor.BN(Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60));
      const tx = await this.program.methods
        .createProposal(
          instructionData,
          expiry
        )
        .accounts({
          multisig: multisigPda,
          proposal: proposalPda,
          creator: walletPublicKey,
          systemProgram: SystemProgram.programId
        })
        .rpc();
      return tx;
    } catch (error) {
      console.error('❌ Error creating proposal:', error);
      throw error;
    }
  }

  async getProposals(): Promise<ProposalData[]> {
    try {
      if (DEMO_MODE) {
        return [...this.demoProposals];
      }
      if (!this.program) {
        throw new Error('Program not initialized. Call initialize() first.');
      }
      // deployedConfig is imported at the top
      const multisigPda = new PublicKey(deployedConfig.multisigPDA);
      let proposals = [];
      try {
        proposals = await (this.program as any).account.proposal.all([
          {
            memcmp: {
              offset: 16,
              bytes: multisigPda.toBase58()
            }
          }
        ]);
        console.log('[getProposals] proposals.length:', proposals.length);
        if (proposals.length === 0) {
          console.warn('[getProposals] No proposals found for multisig:', multisigPda.toBase58());
        } else {
          proposals.forEach((account: any, idx: number) => {
            console.log(`[getProposals] Proposal #${idx}:`, account);
          });
        }
      } catch (fetchErr) {
        console.error('[getProposals] Error fetching proposals:', fetchErr);
      }
      return proposals.map((account: any) => {
        const data = account.account;
        let description = 'Unknown';
        let recipient = new PublicKey('11111111111111111111111111111111');
        let amount = 0;
        try {
          const instructionDataStr = Buffer.from(data.instructionData).toString('utf8');
          const parsed = JSON.parse(instructionDataStr);
          description = parsed.description || 'No description';
          recipient = new PublicKey(parsed.recipient);
          amount = parsed.amount / LAMPORTS_PER_SOL;
        } catch (e) {
          console.warn('[getProposals] Failed to parse instructionData:', e, data.instructionData);
        }
        let status: 'pending' | 'approved' | 'rejected' | 'executed' = 'pending';
        if (data.executed) status = 'executed';
        if (data.rejected) status = 'rejected';
        // Fallbacks for missing fields
        const proposalObj = {
          pubkey: account.publicKey,
          description,
          recipient,
          amount,
          status,
          votesFor: data.votesFor ?? (data.approvedSigners?.length || 0),
          votesAgainst: data.votesAgainst ?? 0,
          proposer: data.proposer ?? data.creator ?? new PublicKey('11111111111111111111111111111111'),
          createdAt: data.createdAt?.toNumber?.() || data.created_at?.toNumber?.() || 0
        };
        console.log('[getProposals] Proposal mapped:', proposalObj);
        return proposalObj;
      });
    } catch (error) {
      console.error('❌ Error fetching proposals:', error);
      throw error;
    }
  }
}

export const anchorService = new AnchorService();

