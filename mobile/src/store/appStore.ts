import { create } from 'zustand';
import { PublicKey } from '@solana/web3.js';
import {
  WalletState,
  Multisig,
  ProposalWithKey,
  TreasuryBalance,
} from '@types/index';
import { walletService } from '@services/wallet.service';
import { blockchainService } from '@services/blockchain.service';

interface AppState {
  // Wallet state
  wallet: WalletState;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  loadSavedWallet: () => Promise<void>;

  // Multisig state
  multisig: Multisig | null;
  multisigPubkey: PublicKey | null;
  loadMultisig: (authority: PublicKey) => Promise<void>;

  // Treasury state
  treasuryBalance: TreasuryBalance | null;
  loadTreasuryBalance: () => Promise<void>;

  // Proposals state
  proposals: ProposalWithKey[];
  loadProposals: () => Promise<void>;

  // Loading states
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  wallet: {
    publicKey: null,
    connected: false,
    connecting: false,
  },
  multisig: null,
  multisigPubkey: null,
  treasuryBalance: null,
  proposals: [],
  loading: false,
  error: null,

  // Wallet actions
  connectWallet: async () => {
    try {
      set({ 
        wallet: { ...get().wallet, connecting: true },
        error: null 
      });

      const publicKey = await walletService.connect();

      set({
        wallet: {
          publicKey,
          connected: true,
          connecting: false,
        },
      });

      // Load multisig data
      await get().loadMultisig(publicKey);
    } catch (error) {
      set({
        wallet: {
          publicKey: null,
          connected: false,
          connecting: false,
        },
        error: error instanceof Error ? error.message : 'Failed to connect wallet',
      });
    }
  },

  disconnectWallet: async () => {
    try {
      await walletService.disconnect();
      set({
        wallet: {
          publicKey: null,
          connected: false,
          connecting: false,
        },
        multisig: null,
        multisigPubkey: null,
        treasuryBalance: null,
        proposals: [],
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to disconnect wallet',
      });
    }
  },

  loadSavedWallet: async () => {
    try {
      const publicKey = await walletService.getSavedWallet();
      if (publicKey) {
        set({
          wallet: {
            publicKey,
            connected: true,
            connecting: false,
          },
        });

        // Load multisig data
        await get().loadMultisig(publicKey);
      }
    } catch (error) {
      console.error('Failed to load saved wallet:', error);
    }
  },

  // Multisig actions
  loadMultisig: async (authority: PublicKey) => {
    try {
      set({ loading: true, error: null });

      const [multisigPDA] = await blockchainService.getMultisigPDA(authority);
      const multisig = await blockchainService.getMultisig(multisigPDA);

      if (multisig) {
        set({
          multisig,
          multisigPubkey: multisigPDA,
          loading: false,
        });

        // Load related data
        await Promise.all([
          get().loadTreasuryBalance(),
          get().loadProposals(),
        ]);
      } else {
        set({
          multisig: null,
          multisigPubkey: null,
          loading: false,
          error: 'Multisig not found. Please initialize first.',
        });
      }
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load multisig',
      });
    }
  },

  // Treasury actions
  loadTreasuryBalance: async () => {
    try {
      const { multisigPubkey } = get();
      if (!multisigPubkey) return;

      const [vaultPDA] = await blockchainService.getVaultPDA(multisigPubkey);
      const balance = await blockchainService.getTreasuryBalance(vaultPDA);

      set({ treasuryBalance: balance });
    } catch (error) {
      console.error('Failed to load treasury balance:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load treasury balance',
      });
    }
  },

  // Proposals actions
  loadProposals: async () => {
    try {
      const { multisigPubkey } = get();
      if (!multisigPubkey) return;

      const proposals = await blockchainService.getProposals(multisigPubkey);

      set({ proposals });
    } catch (error) {
      console.error('Failed to load proposals:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load proposals',
      });
    }
  },

  // Error handling
  setError: (error: string | null) => {
    set({ error });
  },
}));
