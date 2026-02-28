import { PublicKey } from '@solana/web3.js';

export interface Multisig {
  authority: PublicKey;
  signers: PublicKey[];
  threshold: number;
  proposalCount: number;
  bump: number;
  vaultBump: number;
}

export interface Proposal {
  index: number;
  multisig: PublicKey;
  creator: PublicKey;
  instructionData: Buffer;
  approvedSigners: PublicKey[];
  executed: boolean;
  rejected: boolean;
  expiry: number;
  createdAt: number;
  executedAt: number;
  bump: number;
}

export interface ProposalWithKey extends Proposal {
  publicKey: PublicKey;
}

export enum ProposalStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  EXECUTED = 'Executed',
  EXPIRED = 'Expired',
}

export interface TreasuryBalance {
  sol: number;
  tokens: TokenBalance[];
}

export interface TokenBalance {
  mint: PublicKey;
  amount: number;
  decimals: number;
  symbol?: string;
}

export interface TransactionSimulation {
  success: boolean;
  logs: string[];
  unitsConsumed: number;
  error?: string;
}

export interface WalletState {
  publicKey: PublicKey | null;
  connected: boolean;
  connecting: boolean;
}
