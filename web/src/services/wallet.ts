import { PublicKey, Transaction, TransactionSignature, Connection } from '@solana/web3.js'
import { testSignerService, TestSigner } from './testSigner'

interface PhantomProvider {
  publicKey: PublicKey
  isConnected: boolean
  signTransaction(transaction: Transaction): Promise<Transaction>
  signAllTransactions(transactions: Transaction[]): Promise<Transaction[]>
  signMessage(message: Uint8Array): Promise<{ signature: Uint8Array; publicKey: PublicKey }>
  connect(): Promise<{ publicKey: PublicKey }>
  disconnect(): Promise<void>
}

export class WalletService {
  private provider: PhantomProvider | null = null
  private useTestSigner = false
  private currentTestSigner: TestSigner | null = null

  async getProvider(): Promise<PhantomProvider> {
    if (this.provider) {
      return this.provider
    }

    // Check if Phantom is installed
    const solana = (window as any).solana
    if (!solana) {
      throw new Error('Phantom wallet not found. Please install it from https://phantom.app')
    }

    this.provider = solana
    return solana
  }

  async connect(): Promise<PublicKey> {
    try {
      const provider = await this.getProvider()
      
      if (!provider.isConnected) {
        const response = await provider.connect()
        return response.publicKey
      }
      
      return provider.publicKey
    } catch (error) {
      console.error('Error connecting wallet:', error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    try {
      const provider = await this.getProvider()
      await provider.disconnect()
      this.provider = null
    } catch (error) {
      console.error('Error disconnecting wallet:', error)
    }
  }

  async isConnected(): Promise<boolean> {
    try {
      const provider = await this.getProvider()
      return provider.isConnected
    } catch {
      return false
    }
  }

  async getPublicKey(): Promise<PublicKey | null> {
    try {
      if (this.useTestSigner && this.currentTestSigner) {
        return new PublicKey(this.currentTestSigner.pubkey)
      }
      const provider = await this.getProvider()
      return provider.isConnected ? provider.publicKey : null
    } catch {
      return null
    }
  }

  /**
   * Switch to a test signer for multi-signer testing
   */
  async useTestSignerByIndex(index: number): Promise<PublicKey | null> {
    const signers = testSignerService.getTestSigners()
    if (index < 0 || index >= signers.length) {
      throw new Error(`Invalid test signer index: ${index}`)
    }

    testSignerService.setCurrentSigner(index)
    this.currentTestSigner = signers[index]
    this.useTestSigner = true

    return new PublicKey(this.currentTestSigner.pubkey)
  }

  /**
   * Switch to a test signer by name
   */
  async useTestSignerByName(name: string): Promise<PublicKey | null> {
    const signers = testSignerService.getTestSigners()
    const index = signers.findIndex((s) => s.name === name)

    if (index === -1) {
      throw new Error(`Test signer not found: ${name}`)
    }

    return this.useTestSignerByIndex(index)
  }

  /**
   * Get current test signer (if using test mode)
   */
  getCurrentTestSigner(): TestSigner | null {
    if (this.useTestSigner) {
      return this.currentTestSigner
    }
    return null
  }

  /**
   * Check if currently using a test signer
   */
  isUsingTestSigner(): boolean {
    return this.useTestSigner
  }

  /**
   * Get all available test signers
   */
  getAvailableTestSigners(): TestSigner[] {
    return testSignerService.getTestSigners()
  }


  async signTransaction(transaction: Transaction): Promise<Transaction> {
    try {
      const provider = await this.getProvider()
      return await provider.signTransaction(transaction)
    } catch (error) {
      console.error('Error signing transaction:', error)
      throw error
    }
  }

  async signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    try {
      const provider = await this.getProvider()
      return await provider.signAllTransactions(transactions)
    } catch (error) {
      console.error('Error signing transactions:', error)
      throw error
    }
  }

  async signMessage(message: string): Promise<Uint8Array> {
    try {
      const provider = await this.getProvider()
      const encodedMessage = new TextEncoder().encode(message)
      const signature = await provider.signMessage(encodedMessage)
      return signature.signature
    } catch (error) {
      console.error('Error signing message:', error)
      throw error
    }
  }
}

export const walletService = new WalletService()
