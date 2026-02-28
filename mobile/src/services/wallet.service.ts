import { PublicKey } from '@solana/web3.js';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PHANTOM_CONNECT_URL, APP_SCHEME } from '@utils/constants';
import bs58 from 'bs58';
import { Platform } from 'react-native';

const WALLET_KEY = '@wallet_pubkey';

export interface PhantomConnectResponse {
  publicKey: string;
  session: string;
}

export class WalletService {
  private sessionToken: string | null = null;

  /**
   * Connect to Phantom wallet via deep linking
   */
  async connect(): Promise<PublicKey> {
    try {
      // For web, return a mock wallet address for demo purposes
      if (Platform.OS === 'web') {
        const mockPublicKey = 'FKKpamLRtqfY9xUEJ5yYrF3JrXbhWNFp24jP6MzMqTnD';
        await this.saveWalletWeb(mockPublicKey);
        return new PublicKey(mockPublicKey);
      }

      // Build redirect URL
      const redirectUrl = Linking.createURL('');
      
      // Create connection request
      const params = new URLSearchParams({
        dapp_encryption_public_key: bs58.encode(Buffer.from('placeholder')),
        cluster: 'devnet',
        app_url: redirectUrl,
        redirect_link: redirectUrl,
      });

      const url = `${PHANTOM_CONNECT_URL}?${params.toString()}`;

      // Open Phantom
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        throw new Error('Phantom wallet is not installed');
      }

      // Wait for redirect response
      const response = await this.waitForConnection();
      
      // Save wallet info
      await AsyncStorage.setItem(WALLET_KEY, response.publicKey);
      this.sessionToken = response.session;

      return new PublicKey(response.publicKey);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  }

  /**
   * Wait for connection response from Phantom
   */
  private async waitForConnection(): Promise<PhantomConnectResponse> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        subscription.remove();
        reject(new Error('Connection timeout'));
      }, 60000); // 60 second timeout

      const subscription = Linking.addEventListener('url', (event) => {
        clearTimeout(timeout);
        subscription.remove();

        // Parse response from URL
        const url = event.url;
        const params = new URLSearchParams(url.split('?')[1]);
        
        const publicKey = params.get('phantom_encryption_public_key');
        const session = params.get('session');

        if (publicKey && session) {
          resolve({ publicKey, session });
        } else {
          reject(new Error('Invalid response from Phantom'));
        }
      });
    });
  }

  /**
   * Disconnect wallet
   */
  async disconnect(): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(WALLET_KEY);
    } else {
      await AsyncStorage.removeItem(WALLET_KEY);
    }
    this.sessionToken = null;
  }

  /**
   * Get saved wallet public key
   */
  async getSavedWallet(): Promise<PublicKey | null> {
    try {
      let saved: string | null = null;
      
      if (Platform.OS === 'web') {
        saved = localStorage.getItem(WALLET_KEY);
      } else {
        saved = await AsyncStorage.getItem(WALLET_KEY);
      }
      
      return saved ? new PublicKey(saved) : null;
    } catch {
      return null;
    }
  }

  /**
   * Save wallet to storage (web implementation)
   */
  private async saveWalletWeb(publicKey: string): Promise<void> {
    localStorage.setItem(WALLET_KEY, publicKey);
  }

  /**
   * Sign transaction with Phantom
   */
  async signTransaction(transaction: string): Promise<Buffer> {
    if (!this.sessionToken) {
      throw new Error('Not connected to wallet');
    }

    try {
      // For web, return a mock signature for demo
      if (Platform.OS === 'web') {
        return Buffer.from('mocksignature'.padEnd(64, '0'), 'utf8');
      }

      const redirectUrl = Linking.createURL('');
      
      const params = new URLSearchParams({
        transaction,
        session: this.sessionToken,
        redirect_link: redirectUrl,
      });

      const url = `https://phantom.app/ul/v1/signTransaction?${params.toString()}`;
      
      await Linking.openURL(url);

      // Wait for signed transaction
      const signed = await this.waitForSignature();
      return Buffer.from(signed, 'base64');
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw error;
    }
  }

  /**
   * Wait for signed transaction from Phantom
   */
  private async waitForSignature(): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        subscription.remove();
        reject(new Error('Signature timeout'));
      }, 60000);

      const subscription = Linking.addEventListener('url', (event) => {
        clearTimeout(timeout);
        subscription.remove();

        const url = event.url;
        const params = new URLSearchParams(url.split('?')[1]);
        
        const signature = params.get('signature');

        if (signature) {
          resolve(signature);
        } else {
          reject(new Error('Transaction cancelled or failed'));
        }
      });
    });
  }
}

export const walletService = new WalletService();
