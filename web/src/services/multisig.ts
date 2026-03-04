import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { anchorService } from './anchor'
import { walletService } from './wallet'

export const AUTHORIZED_SIGNER_STRINGS = [
  '3wEzj7icty3RaBUpuroWmCt5mpNL8Ki8TaajBRqBFEFk',
  'HPkUHvWYfAj8CzyeaEsT8CdDyqh6KhZqr4SZFbBjjwQh',
  '2YCDsgD8mZjDh6uom8J4gY6SmXWmJWxcDtQT8y5s5Tjr'
]

export const AUTHORIZED_SIGNERS = AUTHORIZED_SIGNER_STRINGS.map((key) => new PublicKey(key))
export const REQUIRED_THRESHOLD = 2

export interface MultisigConfig {
  signers: PublicKey[]
  threshold: number
}

export class MultisigService {
  private async getProgram() {
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

  private deriveMultisigPda(programId: PublicKey, authority: PublicKey): PublicKey {
    const [multisigPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('multisig'), authority.toBuffer()],
      programId
    )

    return multisigPDA
  }

  getVaultPda(programId: PublicKey, multisigPda: PublicKey): PublicKey {
    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), multisigPda.toBuffer()],
      programId
    )

    return vaultPDA
  }

  private isExpectedSignerSet(signers: PublicKey[]): boolean {
    const expected = [...AUTHORIZED_SIGNER_STRINGS].sort()
    const current = signers.map((s) => s.toString()).sort()

    if (expected.length !== current.length) return false
    return expected.every((value, index) => value === current[index])
  }

  isAuthorizedSigner(publicKey: PublicKey | string): boolean {
    const keyString = typeof publicKey === 'string' ? publicKey : publicKey.toString()
    return AUTHORIZED_SIGNER_STRINGS.includes(keyString)
  }

  private async findConfiguredMultisig(program: any): Promise<{ multisigPda: PublicKey; authority: PublicKey } | null> {
    for (const authority of AUTHORIZED_SIGNERS) {
      const multisigPda = this.deriveMultisigPda(program.programId, authority)
      const account = await program.account.multisig.fetchNullable(multisigPda)

      if (!account) continue

      const thresholdMatches = Number(account.threshold) === REQUIRED_THRESHOLD
      const signersMatch = this.isExpectedSignerSet(account.signers || [])

      if (thresholdMatches && signersMatch) {
        return { multisigPda, authority }
      }
    }

    return null
  }

  async getActiveMultisigPda(): Promise<PublicKey> {
    const program = await this.getProgram()
    const configured = await this.findConfiguredMultisig(program as any)

    if (configured) {
      return configured.multisigPda
    }

    const currentWallet = await walletService.getPublicKey()
    if (currentWallet && this.isAuthorizedSigner(currentWallet)) {
      return this.deriveMultisigPda((program as any).programId, currentWallet)
    }

    return this.deriveMultisigPda((program as any).programId, AUTHORIZED_SIGNERS[0])
  }

  async getVaultPdaPublic(): Promise<PublicKey> {
    const program = await this.getProgram()
    const multisigPda = await this.getActiveMultisigPda()
    return this.getVaultPda((program as any).programId, multisigPda)
  }

  /**
   * Initialize a new multisig account
   * Note: Always uses FIXED authority so all signers can access the same multisig
   */
  async initializeMultisig(
    authority: PublicKey,
    signers: PublicKey[],
    threshold: number
  ): Promise<string> {
    try {
      const program = await this.getProgram()

      const currentWallet = await walletService.getPublicKey()
      if (!currentWallet) {
        throw new Error('Wallet not connected')
      }

      if (!this.isAuthorizedSigner(currentWallet)) {
        throw new Error('Only authorized signer wallets can initialize multisig')
      }

      const multisigPDA = this.deriveMultisigPda(program.programId, currentWallet)
      const existingAccount = await (program as any).account.multisig.fetchNullable(multisigPDA)

      const enforcedSigners = AUTHORIZED_SIGNERS
      const enforcedThreshold = REQUIRED_THRESHOLD

      if (existingAccount) {
        const thresholdMatches = Number(existingAccount.threshold) === REQUIRED_THRESHOLD
        const signersMatch = this.isExpectedSignerSet(existingAccount.signers || [])
        if (thresholdMatches && signersMatch) {
          throw new Error('Multisig is already initialized with the required 3-signer policy')
        }

        const updateTx = await (program as any).methods
          .updateMultisigConfig(enforcedSigners, enforcedThreshold)
          .accounts({
            multisig: multisigPDA,
            authority: currentWallet,
            systemProgram: SystemProgram.programId,
          })
          .rpc()

        console.log('Multisig reconfigured to required 3-signer policy! TX:', updateTx)
        return updateTx
      }

      // Derive vault PDA
      const vaultPDA = this.getVaultPda(program.programId, multisigPDA)

      console.log('Initializing multisig...')
      console.log('Multisig PDA:', multisigPDA.toString())
      console.log('Vault PDA:', vaultPDA.toString())

      // Call initialize instruction
      const tx = await program.methods
        .initialize(enforcedSigners, enforcedThreshold)
        .accounts({
          multisig: multisigPDA,
          vault: vaultPDA,
          authority: currentWallet,
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
      const program = await this.getProgram()
      const configured = await this.findConfiguredMultisig(program as any)
      return configured !== null
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
      const program = await this.getProgram()
      const configured = await this.findConfiguredMultisig(program as any)
      if (!configured) return null
      return await (program as any).account.multisig.fetch(configured.multisigPda)
    } catch (error) {
      console.error('Error fetching multisig:', error)
      return null
    }
  }

  async isCurrentWalletSigner(): Promise<boolean> {
    try {
      const currentWallet = await walletService.getPublicKey()
      if (!currentWallet) return false

      const multisigData = await this.getMultisigData(currentWallet)
      if (!multisigData || !Array.isArray(multisigData.signers)) return false

      return multisigData.signers.some(
        (signer: PublicKey) => signer.toString() === currentWallet.toString()
      )
    } catch {
      return false
    }
  }
}

export const multisigService = new MultisigService()
