import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { anchorService } from './anchor'
import { walletService } from './wallet'

export interface MultisigConfig {
  signers: PublicKey[]
  threshold: number
}

export class MultisigService {
  private async getProgram(authority: PublicKey) {
    let program = anchorService.program;
    if (!program) {
      await anchorService.initialize();
      program = anchorService.program;
    }
    if (!program) {
      throw new Error('Program not loaded');
    }
    return program;
  }

  /**
   * Initialize a new multisig account
   */
  async initializeMultisig(
    authority: PublicKey,
    signers: PublicKey[],
    threshold: number
  ): Promise<string> {
    try {
      const program = await this.getProgram(authority)

      // Derive multisig PDA
      const [multisigPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('multisig'), authority.toBuffer()],
        program.programId
      )

      // Derive vault PDA
      const [vaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), multisigPDA.toBuffer()],
        program.programId
      )

      console.log('Initializing multisig...')
      console.log('Multisig PDA:', multisigPDA.toString())
      console.log('Vault PDA:', vaultPDA.toString())

      // Call initialize instruction
      const tx = await program.methods
        .initialize(signers, threshold)
        .accounts({
          multisig: multisigPDA,
          vault: vaultPDA,
          authority: authority,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      console.log('Multisig initialized! TX:', tx)
      return tx
    } catch (error) {
      console.error('Error initializing multisig:', error)
      throw error
    }
  }

  /**
   * Check if multisig is initialized
   */
  async isInitialized(authority: PublicKey): Promise<boolean> {
    try {
      const program = await this.getProgram(authority)

      const [multisigPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('multisig'), authority.toBuffer()],
        program.programId
      )

      const account = await program.account.multisig.fetchNullable(multisigPDA)
      return account !== null
    } catch (error) {
      console.error('Error checking multisig:', error)
      return false
    }
  }

  /**
   * Get multisig account data
   */
  async getMultisigData(authority: PublicKey): Promise<any> {
    try {
      const program = await this.getProgram(authority)

      const [multisigPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('multisig'), authority.toBuffer()],
        program.programId
      )

      return await program.account.multisig.fetch(multisigPDA)
    } catch (error) {
      console.error('Error fetching multisig:', error)
      return null
    }
  }
}

export const multisigService = new MultisigService()
