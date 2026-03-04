
import React, { useState, useEffect } from 'react'
import deployedConfig from '../config/deployedConfig';
import { walletService } from '../services/wallet'
import { anchorService, ProposalData } from '../services/anchor'
import { AUTHORIZED_SIGNERS, REQUIRED_THRESHOLD, multisigService } from '../services/multisig'
import TestSignerSelector from './TestSignerSelector'
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Connection, clusterApiUrl, Transaction } from '@solana/web3.js'

interface Proposal {
  id: string
  pubkey: string
  title: string
  amount: number
  recipient: string
  status: 'pending' | 'approved' | 'rejected' | 'executed'
  votesFor: number
  votesAgainst: number
  proposer: string
  approvedSigners?: string[]
  threshold?: number
}

interface DashboardProps {
  onCreateProposal: () => void
  reloadProposals?: number
}

export default function Dashboard({ onCreateProposal, reloadProposals }: DashboardProps) {
  const [connected, setConnected] = useState(false)
  const [userAddress, setUserAddress] = useState<string | null>(null)
  const [balance, setBalance] = useState<number>(0)
  const [vaultBalance, setVaultBalance] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null)
  const [isMultisigInitialized, setIsMultisigInitialized] = useState<boolean | null>(null)
  const [initializing, setInitializing] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [isTestMode, setIsTestMode] = useState(false)
  const [multisigSigners, setMultisigSigners] = useState<string[]>([])
  const [multisigThreshold, setMultisigThreshold] = useState<number>(0)
  const [fundAmount, setFundAmount] = useState<string>('0.5')

  // Initialize wallet on component mount
  useEffect(() => {
    checkWalletConnection()
  }, [])

  const handleConnectWallet = async () => {
    setConnecting(true)
    setError(null)
    try {
      const pubkey = await walletService.connect()
      setUserAddress(pubkey.toBase58())
      setConnected(true)
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet')
    } finally {
      setConnecting(false)
    }
  }

  // Load proposals when connected
  useEffect(() => {
    if (connected && userAddress) {
      checkMultisigInitialized();
      loadProposals();
      loadBalance();
      loadVaultBalance();
    }
  }, [connected, userAddress]);

  // Reload proposals when requested from parent (App)
  useEffect(() => {
    if (reloadProposals && connected && userAddress) {
      loadProposals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadProposals]);

  const checkMultisigInitialized = async () => {
    try {
      const publicKey = await walletService.getPublicKey()
      if (publicKey) {
        const initialized = await multisigService.isInitialized(publicKey)
        setIsMultisigInitialized(initialized)
        if (initialized) {
          await loadMultisigPermissions(publicKey)
        } else {
          setMultisigSigners([])
          setMultisigThreshold(0)
        }
      }
    } catch (err) {
      console.error('Error checking multisig:', err)
      setIsMultisigInitialized(false)
    }
  }

  const loadMultisigPermissions = async (authorityKey?: PublicKey) => {
    try {
      const publicKey = authorityKey ?? await walletService.getPublicKey()
      if (!publicKey) return

      const multisigData = await multisigService.getMultisigData(publicKey)
      if (!multisigData) return

      const signers = (multisigData.signers || []).map((signer: PublicKey) => signer.toString())
      setMultisigSigners(signers)
      setMultisigThreshold(Number(multisigData.threshold || 0))
    } catch (err) {
      console.error('Error loading multisig permissions:', err)
    }
  }

  const checkWalletConnection = async () => {
    try {
      const publicKey = await walletService.getPublicKey()
      if (publicKey) {
        await anchorService.initialize()
        setUserAddress(publicKey.toString())
        setConnected(true)
        
        // Check if multisig is initialized (no auto-init)
        const initialized = await multisigService.isInitialized(publicKey)
        setIsMultisigInitialized(initialized)
        if (initialized) {
          await loadMultisigPermissions(publicKey)
        }
        
        // Check if running in test mode
        const testSigners = walletService.getAvailableTestSigners()
        setIsTestMode(testSigners.length > 0)
      }
    } catch (err) {
      console.log('Wallet not connected yet')
    }
  }

  const handleConnect = async () => {
    try {
      setLoading(true)
      setError(null)
      const publicKey = await walletService.connect()
      await anchorService.initialize()
      setUserAddress(publicKey.toString())
      setConnected(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet')
      console.error('Connection error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await walletService.disconnect()
      setConnected(false)
      setUserAddress(null)
      setBalance(0)
      setProposals([])
      setIsMultisigInitialized(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect')
    }
  }

  const handleInitializeMultisig = async () => {
    try {
      setInitializing(true)
      setError(null)
      const publicKey = await walletService.getPublicKey()
      if (!publicKey) {
        setError('Wallet not connected')
        return
      }

      const signers = AUTHORIZED_SIGNERS
      const threshold = REQUIRED_THRESHOLD
      
      const tx = await multisigService.initializeMultisig(publicKey, signers, threshold)
      alert(`✅ Multisig initialized!\nTX: ${tx.slice(0, 20)}...`)
      
      setIsMultisigInitialized(true)
      await loadMultisigPermissions(publicKey)
      await loadProposals()
    } catch (err: any) {
      setError(err.message || 'Failed to initialize multisig')
    } finally {
      setInitializing(false)
    }
  }

  const loadBalance = async () => {
    try {
      if (!userAddress) return;
      const connection = anchorService.connection;
      const publicKey = await walletService.getPublicKey();
      if (publicKey && userAddress === publicKey.toString()) {
        const lamports = await connection.getBalance(publicKey);
        setBalance(lamports / LAMPORTS_PER_SOL);
      } else {
        console.warn('Wallet address mismatch or not connected.');
        setBalance(0);
      }
    } catch (err) {
      console.error('Error loading balance:', err);
      setBalance(0);
    }
  }

  const loadVaultBalance = async () => {
    try {
      const publicKey = await walletService.getPublicKey()
      if (!publicKey) return
      
      let program = anchorService.program
      if (!program) {
        await anchorService.initialize()
        program = anchorService.program
      }
      if (!program) return
      
      const multisigPda = await multisigService.getActiveMultisigPda()
      const vaultPda = multisigService.getVaultPda(program.programId, multisigPda)
      
      const connection = anchorService.connection
      const lamports = await connection.getBalance(vaultPda)
      setVaultBalance(lamports / LAMPORTS_PER_SOL)
    } catch (err) {
      console.error('Error loading vault balance:', err)
      setVaultBalance(0)
    }
  }

  const loadProposals = async () => {
    try {
      setLoading(true)
      const program = anchorService.program;
      if (!program) {
        setProposals([])
        return
      }
      const fetchedProposals = await anchorService.getProposals();
      console.log('[Dashboard] fetchedProposals:', fetchedProposals);
      const formattedProposals: Proposal[] = fetchedProposals.map((p: ProposalData, index: number) => ({
        id: (index + 1).toString(),
        pubkey: p.pubkey.toString(),
        title: p.description,
        amount: p.amount,
        recipient: p.recipient.toString().slice(0, 20) + '...',
        status: p.status as any,
        votesFor: p.votesFor,
        votesAgainst: p.votesAgainst,
        proposer: p.proposer.toString(),
        approvedSigners: p.approvedSigners?.map(s => s.toString()) || [],
        threshold: p.threshold
      }))
      console.log('[Dashboard] formattedProposals:', formattedProposals);
      setProposals(formattedProposals)

      if (selectedProposal) {
        const updatedSelected = formattedProposals.find((proposal) => proposal.pubkey === selectedProposal.pubkey) || null
        setSelectedProposal(updatedSelected)
      }
    } catch (err) {
      console.error('[Dashboard] Error loading proposals:', err);
      setProposals([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: Proposal['status']) => {
    switch (status) {
      case 'pending':
        return 'status-pending'
      case 'approved':
        return 'status-approved'
      case 'rejected':
        return 'status-danger'
      case 'executed':
        return 'status-executed'
    }
  }

  const hasCurrentWalletApproved = (): boolean => {
    if (!selectedProposal || !userAddress) return false;
    const approvedSigners = selectedProposal.approvedSigners || [];
    return approvedSigners.some(signer => signer === userAddress);
  }

  const isCurrentWalletSigner = (): boolean => {
    if (!userAddress) return false
    return multisigSigners.includes(userAddress)
  }

  const canCreateProposal = (): boolean => {
    return !!isMultisigInitialized && isCurrentWalletSigner()
  }

  const canVoteSelectedProposal = (): boolean => {
    return !!selectedProposal && selectedProposal.status === 'pending' && isCurrentWalletSigner()
  }

  const canExecuteSelectedProposal = (): boolean => {
    if (!selectedProposal || selectedProposal.status !== 'approved' || !isCurrentWalletSigner()) {
      return false
    }
    return true
  }

  const getExecuteButtonMessage = (): string => {
    if (!selectedProposal) return ''
    if (selectedProposal.status !== 'approved') return 'Proposal must be approved before execution'
    if (!isCurrentWalletSigner()) return 'Only multisig signers can execute proposals'
    const proposalAmount = selectedProposal.amount || 0
    if (vaultBalance < proposalAmount) {
      return `Warning: vault may be low. Need ${proposalAmount} SOL, showing ${vaultBalance.toFixed(4)} SOL. You can still try execute.`
    }
    return ''
  }

  const handleVote = async (approve: boolean) => {
    try {
      if (!selectedProposal) return;
      setLoading(true);
      await anchorService.initialize();
      await anchorService.voteOnProposal(new PublicKey(selectedProposal.pubkey), approve);
      await loadProposals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to vote');
    } finally {
      setLoading(false);
    }
  }

  const handleFundVault = async () => {
    try {
      setLoading(true)
      setError(null)

      const amountSol = Number(fundAmount)
      if (!Number.isFinite(amountSol) || amountSol <= 0) {
        throw new Error('Enter a valid funding amount in SOL')
      }
      const lamportsToFund = Math.round(amountSol * LAMPORTS_PER_SOL)
      if (lamportsToFund <= 0) {
        throw new Error('Funding amount is too small')
      }
      
      const vaultPda = await multisigService.getVaultPdaPublic()
      const walletKey = await walletService.getPublicKey()
      
      if (!walletKey) {
        throw new Error('Wallet not connected')
      }

      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
      
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: walletKey,
          toPubkey: vaultPda,
          lamports: lamportsToFund,
        })
      )

      const latestBlockhash = await connection.getLatestBlockhash('confirmed')
      tx.recentBlockhash = latestBlockhash.blockhash
      tx.feePayer = walletKey

      const provider = await walletService.getProvider()
      const signedTx = await provider.signTransaction?.(tx)
      if (!signedTx) throw new Error('Failed to sign transaction')
      
      const txId = await connection.sendRawTransaction(signedTx.serialize())
      await connection.confirmTransaction({
        signature: txId,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      }, 'confirmed')

      console.log('✅ Vault funded! TX:', txId)
      alert(`✅ Vault funded with ${amountSol} SOL!\nTransaction: ${txId}`)
      
      // Reload vault balance
      await loadBalance()
      await loadVaultBalance()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fund vault'
      setError(errorMsg)
      console.error('Fund vault error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExecute = async () => {
    try {
      if (!selectedProposal) return
      setLoading(true)
      setError(null)

      await anchorService.initialize()
      
      const proposalPubkey = new PublicKey(selectedProposal.pubkey)
      const txSignature = await anchorService.executeProposal(proposalPubkey)
      
      console.log('Proposal executed! TX:', txSignature)
      
      // Reload proposals to show updated status
      await loadProposals()
      alert(`✅ Proposal executed successfully!\nTransaction: ${txSignature}`)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to execute'
      setError(errorMsg)
      console.error('Execute error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!connected) {
    return (
      <div style={{ textAlign: 'center', color: 'white' }}>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>Connect Your Wallet</h2>
        <p style={{ fontSize: '1.1rem', marginBottom: '2rem', opacity: 0.9 }}>
          Connect your Phantom wallet to manage the DAO treasury
        </p>
        {error && (
          <div style={{ color: '#ff6b6b', marginBottom: '1rem', padding: '0.5rem' }}>
            {error}
          </div>
        )}
        <button 
          className="btn btn-primary" 
          onClick={handleConnect}
          disabled={loading}
        >
          {loading ? 'Connecting...' : 'Connect Phantom Wallet'}
        </button>
      </div>
    )
  }

  const handleTestSignerChange = async (signer: any) => {
    try {
      setLoading(true)
      const pubkey = await walletService.useTestSignerByIndex(
        walletService.getAvailableTestSigners().indexOf(signer)
      )
      if (pubkey) {
        setUserAddress(pubkey.toString())
        await loadBalance()
        await checkMultisigInitialized()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch signer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {error && (
        <div style={{ background: '#ff6b6b', color: 'white', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Mode Indicator */}
      {isTestMode && (
        <div style={{
          background: '#fff3cd',
          border: '2px solid #ffc107',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '1.5rem' }}>🧪</span>
          <div>
            <strong style={{ color: '#856404' }}>Test Mode Active</strong>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#856404' }}>
              Using test signers for development. Switch signers below to test multi-party approval.
            </p>
          </div>
        </div>
      )}

      {/* Test Signer Selector - Only show if test signers are available */}
      {walletService.getAvailableTestSigners().length > 0 && (
        <TestSignerSelector onSignerChange={handleTestSignerChange} />
      )}

      {/* Multisig Status Info */}
      <div style={{
        background: '#e3f2fd',
        border: '2px solid #2196f3',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '2rem',
        fontFamily: 'monospace'
      }}>
        <h3 style={{ color: '#1565c0', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>
          🔍 DAO Status
        </h3>
        <div style={{ color: '#1565c0', fontSize: '0.9rem' }}>
          <p style={{ margin: '0.5rem 0' }}>
            <strong>Connected Wallet:</strong><br/>
            <code style={{ background: '#fff', padding: '0.25rem 0.5rem', borderRadius: '4px', display: 'block', marginTop: '0.25rem' }}>
              {userAddress}
            </code>
          </p>
          <p style={{ margin: '0.5rem 0', opacity: 0.8 }}>
            <strong>Multisig Status:</strong> {isMultisigInitialized === null ? 'Checking...' : isMultisigInitialized ? '✅ Initialized' : '❌ Not Initialized'}
          </p>
          {isMultisigInitialized && (
            <p style={{ margin: '0.5rem 0', opacity: 0.8 }}>
              <strong>Your Role:</strong> {isCurrentWalletSigner() ? '✅ Signer (create/approve/reject/execute)' : '👀 Viewer (read-only)'}
            </p>
          )}
          {isMultisigInitialized && (
            <p style={{ margin: '0.5rem 0', opacity: 0.8 }}>
              <strong>Policy:</strong> {multisigThreshold > 0 ? `${multisigThreshold}-of-${multisigSigners.length}` : 'Unknown'} approvals required
            </p>
          )}
          {!isMultisigInitialized && balance === 0 && (
            <p style={{ margin: '1rem 0', padding: '0.75rem', background: '#ff9800', color: 'white', borderRadius: '4px' }}>
              ⚠️ Fund this wallet with SOL from the faucet first!<br/>
              <a href={`https://faucet.solana.com/?address=${userAddress}`} target="_blank" rel="noopener noreferrer" style={{ color: 'white', textDecoration: 'underline' }}>
                Click here to get devnet SOL
              </a>
            </p>
          )}
        </div>
      </div>

      {/* Initialize Multisig Warning */}
      {(isMultisigInitialized === false || (connected && proposals.length === 0 && isMultisigInitialized !== true)) && balance > 0 && (
        <div style={{
          background: '#fff3cd',
          border: '2px solid #ffc107',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{ color: '#856404', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>
            🚀 Initialize Your Multisig DAO
          </h3>
          <p style={{ color: '#856404', margin: '0 0 1rem 0' }}>
            Before creating proposals, you need to initialize the multisig treasury.
            This is a one-time setup that creates your DAO's on-chain account.
          </p>
          <button 
            className="btn btn-primary"
            onClick={handleInitializeMultisig}
            disabled={initializing}
            style={{ marginTop: '0.5rem' }}
          >
            {initializing ? '⏳ Initializing...' : '✨ Initialize Multisig Now'}
          </button>
        </div>
      )}

      {/* Wallet Info & Treasury Balance */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="section-title">Wallet & Treasury</h3>
          <button className="btn btn-secondary" onClick={handleDisconnect}>
            Disconnect
          </button>
        </div>
        
        {/* Two-column layout for wallet and vault */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ 
            background: '#f8f9fa', 
            padding: '1rem', 
            borderRadius: '8px',
            border: '2px solid #e9ecef'
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#666', marginBottom: '0.5rem' }}>
              💼 Your Wallet
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333' }}>
              {balance.toFixed(4)} SOL
            </div>
            <div style={{ fontSize: '0.8rem', color: '#999' }}>
              ≈ ${(balance * 150).toFixed(2)} USD
            </div>
          </div>
          
          <div style={{ 
            background: isMultisigInitialized ? '#e8f5e9' : '#f8f9fa', 
            padding: '1rem', 
            borderRadius: '8px',
            border: isMultisigInitialized ? '2px solid #4caf50' : '2px solid #e9ecef'
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#666', marginBottom: '0.5rem' }}>
              🏛️ Treasury Vault
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: isMultisigInitialized ? '#2e7d32' : '#999' }}>
              {isMultisigInitialized ? `${vaultBalance.toFixed(4)} SOL` : 'Not initialized'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#999' }}>
              {isMultisigInitialized ? `≈ $${(vaultBalance * 150).toFixed(2)} USD` : 'Initialize multisig to activate'}
            </div>
            {isMultisigInitialized && (
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="number"
                  min="0.000001"
                  step="0.01"
                  value={fundAmount}
                  onChange={(event) => setFundAmount(event.target.value)}
                  disabled={loading}
                  placeholder="Amount (SOL)"
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #cfd8dc',
                    fontSize: '0.85rem'
                  }}
                />
                <button
                  className="btn btn-secondary"
                  onClick={handleFundVault}
                  disabled={loading}
                  style={{ fontSize: '0.8rem', padding: '0.5rem 0.8rem', whiteSpace: 'nowrap', background: '#ff9800' }}
                >
                  {loading ? '⏳ Funding...' : '💰 Fund Vault'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <div className="stat-value">{proposals.length}</div>
          <div className="stat-label">Total Proposals</div>
        </div>
        <div className="card">
          <div className="stat-value">{proposals.filter(p => p.status === 'pending').length}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="card">
          <div className="stat-value">{proposals.filter(p => p.status === 'approved').length}</div>
          <div className="stat-label">Approved</div>
        </div>
        <div className="card">
          <div className="stat-value">{proposals.filter(p => p.status === 'executed').length}</div>
          <div className="stat-label">Executed</div>
        </div>
      </div>

      {/* Selected Proposal Detail */}
      {selectedProposal && (
        <div className="card" style={{ marginBottom: '2rem', background: '#f0f7ff', borderLeft: '4px solid #667eea' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="card-title">#{selectedProposal.id} - {selectedProposal.title}</h3>
            <button className="btn btn-secondary" onClick={() => setSelectedProposal(null)}>
              ✕
            </button>
          </div>
          <p style={{ margin: '0.5rem 0', color: '#666' }}>
            <strong>Amount:</strong> {selectedProposal.amount} SOL
          </p>
          <p style={{ margin: '0.5rem 0', color: '#666' }}>
            <strong>Recipient:</strong> {selectedProposal.recipient}
          </p>
          <p style={{ margin: '0.5rem 0', color: '#666' }}>
            <strong>Proposer:</strong> {selectedProposal.proposer.slice(0, 20)}...
          </p>
          <p style={{ margin: '0.5rem 0', color: '#666' }}>
            <strong>Approvals:</strong> {(selectedProposal.approvedSigners || []).length}/{selectedProposal.threshold || '?'} signers
          </p>
          <p style={{ margin: '0.5rem 0', color: '#666' }}>
            <strong>Votes:</strong> {selectedProposal.votesFor} for, {selectedProposal.votesAgainst} against
          </p>
          <span className={`status-badge ${getStatusColor(selectedProposal.status)}`}>
            {selectedProposal.status === 'pending' && '⏳ Pending'}
            {selectedProposal.status === 'approved' && '✓ Approved'}
            {selectedProposal.status === 'rejected' && '✗ Rejected'}
            {selectedProposal.status === 'executed' && '✓ Executed'}
          </span>
          <div className="proposal-actions">
            {selectedProposal.status === 'pending' && (
              <>
                <button 
                  className="btn btn-success" 
                  onClick={() => handleVote(true)}
                  disabled={loading || !canVoteSelectedProposal() || hasCurrentWalletApproved()}
                  title={!canVoteSelectedProposal() ? 'Only multisig signers can approve pending proposals' : (hasCurrentWalletApproved() ? 'You have already approved this proposal' : '')}
                >
                  {hasCurrentWalletApproved() ? '✓ Already Approved' : 'Approve'}
                </button>
                <button 
                  className="btn btn-danger" 
                  onClick={() => handleVote(false)}
                  disabled={loading || !canVoteSelectedProposal()}
                  title={!canVoteSelectedProposal() ? 'Only multisig signers can reject pending proposals' : ''}
                >
                  Reject
                </button>
              </>
            )}
            {selectedProposal.status === 'approved' && (
              <button 
                className="btn btn-primary" 
                onClick={handleExecute}
                disabled={loading || !canExecuteSelectedProposal()}
                title={getExecuteButtonMessage()}
              >
                {loading ? 'Executing...' : 'Execute'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Proposals List */}
      <h3 className="section-title">Recent Proposals</h3>
      {loading && proposals.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>
          Loading proposals...
        </div>
      ) : proposals.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>
          <p>No proposals yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="proposal-list">
          {proposals.map(proposal => (
            <div 
              key={proposal.pubkey}
              className="proposal-item"
              onClick={() => setSelectedProposal(proposal)}
              style={{ cursor: 'pointer' }}
            >
              <div className="proposal-header">
                <h4 className="proposal-title">#{proposal.id} - {proposal.title}</h4>
                <span className="proposal-amount">{proposal.amount} SOL</span>
              </div>
              <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: '#666' }}>
                {proposal.recipient}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                <span className={`status-badge ${getStatusColor(proposal.status)}`}>
                  {proposal.status === 'pending' && '⏳ Pending'}
                  {proposal.status === 'approved' && '✓ Approved'}
                  {proposal.status === 'rejected' && '✗ Rejected'}
                  {proposal.status === 'executed' && '✓ Executed'}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#999' }}>
                  {proposal.votesFor} votes for
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Button */}
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <button 
          className="btn btn-primary" 
          onClick={onCreateProposal} 
          disabled={loading || !canCreateProposal()}
        >
          + Create New Proposal
        </button>
        {!isMultisigInitialized && (
          <p style={{ fontSize: '0.9rem', color: '#856404', marginTop: '0.5rem' }}>
            ⚠️ Initialize multisig first to create proposals
          </p>
        )}
        {isMultisigInitialized && !isCurrentWalletSigner() && (
          <p style={{ fontSize: '0.9rem', color: '#856404', marginTop: '0.5rem' }}>
            👀 Read-only mode: only signer wallets can create/approve/reject/execute.
          </p>
        )}
      </div>
    </>
  )}