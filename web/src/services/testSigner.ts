/**
 * Test Signer Service
 * 
 * Provides functionality to load and switch between test signers for multi-signer testing.
 * This allows testing the full approval flow with multiple different signers.
 */

import { PublicKey, Keypair } from '@solana/web3.js';

export interface TestSigner {
  name: string;
  pubkey: string;
  secret: number[];
}

export interface TestSignersData {
  created: string;
  signers: TestSigner[];
}

class TestSignerService {
  private testSignersData: TestSignersData | null = null;
  private currentSignerIndex: number = 0;

  /**
   * Load test signers from test-signers.json
   */
  async loadTestSigners(): Promise<boolean> {
    try {
      // Try to load from file in web environment
      // In production, this would be served from the server
      const response = await fetch('/test-signers.json');
      if (!response.ok) {
        console.log('Test signers file not found. Run: npm run setup:signers');
        return false;
      }
      
      this.testSignersData = await response.json();
      console.log(`✅ Loaded ${this.testSignersData.signers.length} test signers`);
      return true;
    } catch (error) {
      console.log('Could not load test signers file');
      return false;
    }
  }

  /**
   * Get all available test signers
   */
  getTestSigners(): TestSigner[] {
    if (!this.testSignersData) {
      return [];
    }
    return this.testSignersData.signers;
  }

  /**
   * Get current signer
   */
  getCurrentSigner(): TestSigner | null {
    if (!this.testSignersData) {
      return null;
    }
    return this.testSignersData.signers[this.currentSignerIndex] || null;
  }

  /**
   * Get signer by index
   */
  getSignerByIndex(index: number): TestSigner | null {
    if (!this.testSignersData || index < 0 || index >= this.testSignersData.signers.length) {
      return null;
    }
    return this.testSignersData.signers[index];
  }

  /**
   * Switch to a specific signer
   */
  setCurrentSigner(index: number): boolean {
    if (!this.testSignersData || index < 0 || index >= this.testSignersData.signers.length) {
      return false;
    }
    this.currentSignerIndex = index;
    return true;
  }

  /**
   * Get current signer as Keypair
   */
  getCurrentSignerKeypair(): Keypair | null {
    const signer = this.getCurrentSigner();
    if (!signer) {
      return null;
    }
    
    try {
      const secret = new Uint8Array(signer.secret);
      return Keypair.fromSecretKey(secret);
    } catch (error) {
      console.error('Failed to create keypair from signer:', error);
      return null;
    }
  }

  /**
   * Get signer by index as PublicKey
   */
  getSignerPublicKey(index: number): PublicKey | null {
    const signer = this.getSignerByIndex(index);
    if (!signer) {
      return null;
    }
    
    try {
      return new PublicKey(signer.pubkey);
    } catch (error) {
      console.error('Failed to create PublicKey from signer:', error);
      return null;
    }
  }

  /**
   * Check if test signers are loaded
   */
  isEnabled(): boolean {
    return this.testSignersData !== null && this.testSignersData.signers.length > 0;
  }

  /**
   * Get count of available signers
   */
  getSignerCount(): number {
    return this.testSignersData?.signers.length || 0;
  }
}

// Export singleton instance
export const testSignerService = new TestSignerService();
