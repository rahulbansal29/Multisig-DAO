import { PublicKey, Transaction, TransactionSignature } from '@solana/web3.js'

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
      const provider = await this.getProvider()
      return provider.isConnected ? provider.publicKey : null
    } catch {
      return null
    }
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
