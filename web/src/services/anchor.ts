

import { Connection, PublicKey, SystemProgram, LAMPORTS_PER_SOL, clusterApiUrl } from '@solana/web3.js';
import deployedConfig from '../config/deployedConfig';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';
import { walletService } from './wallet';
import { multisigService } from './multisig';

// IDL is fetched at runtime from public directory
let IDL: any = null;
let PROGRAM_ID: PublicKey | null = null;

async function loadIDL() {
  if (!IDL) {
    const response = await fetch('/idl.json');
    IDL = await response.json();
    PROGRAM_ID = new PublicKey(IDL.address);
  }
  return { IDL, PROGRAM_ID };
}
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
  expiry?: number;
  approvedSigners?: PublicKey[];
  threshold?: number;
}

export class AnchorService {
  private connection: Connection
  private provider: AnchorProvider | null = null
  private program: Program | null = null
  private multisigPda: PublicKey | null = null  // Cache the multisig PDA
  private demoProposals: ProposalData[] = []
  private demoInitialized = false

  constructor() {
    this.connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
  }

  voteOnProposal = async (proposalPubkey: PublicKey, approve: boolean): Promise<string> => {
    if (!this.program) {
      throw new Error('Program not initialized. Call initialize() first.');
    }
    const userKey = await walletService.getPublicKey();
    if (!userKey) {
      throw new Error('Wallet not connected');
    }
    
    // Get the proposal to find its multisig
    const proposalAccount = await (this.program as any).account.proposal.fetch(proposalPubkey);
    const multisigPda = proposalAccount.multisig;
    
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
      // Load IDL from public directory
      const { IDL: loadedIDL, PROGRAM_ID: loadedPID } = await loadIDL();
      
      const wallet = await walletService.getProvider();
      this.provider = new AnchorProvider(
        this.connection,
        wallet as any,
        { commitment: 'confirmed' }
      );
      this.program = new Program(loadedIDL, this.provider as any) as any;
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
      
      // Use cached or derive multisig PDA - use Wallet 1 (first signer) for consistency
      const multisigPda = await multisigService.getActiveMultisigPda()
      
      let proposalCount = 0;
      try {
        const multisigAccount = await (this.program as any).account.multisig.fetch(multisigPda);
        proposalCount = (multisigAccount as any).proposalCount || 0;
      } catch (fetchError) {
        console.error('[createProposal] Multisig not initialized:', fetchError);
        throw new Error('Multisig not initialized. Please initialize it first.');
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
      
      // Use Wallet 1 (first signer) for consistent multisig PDA derivation
      const multisigPda = await multisigService.getActiveMultisigPda()

      let threshold = 0
      try {
        const multisigAccount = await (this.program as any).account.multisig.fetch(multisigPda)
        threshold = Number((multisigAccount as any).threshold || 0)
      } catch {
        threshold = 0
      }
      
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
        console.log('[getProposals] Found', proposals.length, 'proposals for multisig:', multisigPda.toString());
      } catch (fetchErr) {
        console.error('[getProposals] Error fetching proposals:', fetchErr);
        return [];
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
          console.warn('[getProposals] Failed to parse instructionData');
        }
        const approvalsCount = data.approvedSigners?.length || 0
        let status: 'pending' | 'approved' | 'rejected' | 'executed' = 'pending';
        if (data.executed) status = 'executed';
        else if (data.rejected) status = 'rejected';
        else if (threshold > 0 && approvalsCount >= threshold) status = 'approved';
        
        return {
          pubkey: account.publicKey,
          description,
          recipient,
          amount,
          status,
          votesFor: approvalsCount,
          votesAgainst: 0,
          proposer: data.creator ?? new PublicKey('11111111111111111111111111111111'),
          createdAt: data.createdAt?.toNumber?.() || 0,
          expiry: data.expiry?.toNumber?.() || 0,
          approvedSigners: data.approvedSigners || [],
          threshold
        };
      });
    } catch (error) {
      console.error('❌ Error fetching proposals:', error);
      return [];
    }
  }

  async executeProposal(proposalPubkey: PublicKey): Promise<string> {
    try {
      if (DEMO_MODE) {
        const proposal = this.demoProposals.find(p => p.pubkey.equals(proposalPubkey));
        if (proposal) {
          proposal.status = 'executed';
          return 'demo_tx_exec_' + Math.random().toString(36).substring(7);
        }
        throw new Error('Proposal not found');
      }

      if (!this.program) {
        throw new Error('Program not initialized. Call initialize() first.');
      }

      const executor = await walletService.getPublicKey();
      if (!executor) {
        throw new Error('Wallet not connected');
      }

      // Get proposal account first - this is the source of truth for multisig linkage
      const proposalAccount = await (this.program as any).account.proposal.fetch(proposalPubkey);
      const multisigPda = proposalAccount.multisig as PublicKey

      // Derive vault PDA from the proposal's multisig
      const vaultPda = multisigService.getVaultPda(this.program.programId, multisigPda)

      const instructionDataStr = Buffer.from(proposalAccount.instructionData).toString('utf8');
      let parsedInstruction: { recipient: string }
      try {
        parsedInstruction = JSON.parse(instructionDataStr)
      } catch {
        throw new Error('Invalid proposal instruction data')
      }

      if (!parsedInstruction?.recipient) {
        throw new Error('Recipient missing from proposal data')
      }

      const recipientAddress = new PublicKey(parsedInstruction.recipient);

      console.log('Executing proposal:', proposalPubkey.toString());
      console.log('Multisig:', multisigPda.toString());

      const tx = await (this.program as any).methods
        .executeProposal()
        .accounts({
          multisig: multisigPda,
          proposal: proposalPubkey,
          vault: vaultPda,
          recipient: recipientAddress,
          executor: executor,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('✅ Proposal executed! TX:', tx);
      return tx;
    } catch (error) {
      console.error('❌ Error executing proposal:', error);
      throw error;
    }
  }
}

export const anchorService = new AnchorService();

