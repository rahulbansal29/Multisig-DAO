import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js'

const RPC_ENDPOINT = clusterApiUrl('devnet')
const COMMITMENT = 'confirmed'

export class SolanaService {
  private connection: Connection

  constructor() {
    this.connection = new Connection(RPC_ENDPOINT, COMMITMENT)
  }

  async getBalance(address: PublicKey): Promise<number> {
    try {
      const balance = await this.connection.getBalance(address)
      return balance / 1e9 // Convert lamports to SOL
    } catch (error) {
      console.error('Error getting balance:', error)
      throw error
    }
  }

  async getConnection(): Promise<Connection> {
    return this.connection
  }

  async getAccountInfo(address: PublicKey) {
    try {
      return await this.connection.getAccountInfo(address)
    } catch (error) {
      console.error('Error getting account info:', error)
      throw error
    }
  }

  async requestAirdrop(address: PublicKey, lamports: number): Promise<string> {
    try {
      const tx = await this.connection.requestAirdrop(address, lamports)
      await this.connection.confirmTransaction(tx)
      return tx
    } catch (error) {
      console.error('Error requesting airdrop:', error)
      throw error
    }
  }
}

export const solanaService = new SolanaService()
