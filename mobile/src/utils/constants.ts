import { clusterApiUrl } from '@solana/web3.js';

export const CLUSTER = 'devnet';
export const RPC_ENDPOINT = clusterApiUrl(CLUSTER);

// Program ID deployed on devnet
export const PROGRAM_ID = 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS';

// Phantom wallet deep link
export const PHANTOM_CONNECT_URL = 'https://phantom.app/ul/browse/';
export const APP_SCHEME = 'daotreasuryapp://';

// Proposal expiry defaults
export const DEFAULT_PROPOSAL_EXPIRY_DAYS = 7;

// Transaction confirmation settings
export const COMMITMENT = 'confirmed';
export const PREFLIGHT_COMMITMENT = 'processed';

// UI constants
export const LAMPORTS_PER_SOL = 1_000_000_000;
export const MAX_SIGNERS = 10;
export const MAX_INSTRUCTION_SIZE = 1000;

// Biometric authentication
export const REQUIRE_BIOMETRIC_FOR_TRANSACTIONS = true;
export const BIOMETRIC_PROMPT_MESSAGE = 'Authenticate to sign transaction';
