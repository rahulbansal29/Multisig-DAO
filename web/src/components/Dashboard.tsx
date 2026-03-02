
import React, { useState, useEffect } from 'react'
import deployedConfig from '../config/deployedConfig';
import { walletService } from '../services/wallet'
import { anchorService, ProposalData } from '../services/anchor'
import { multisigService } from '../services/multisig'
import TestSignerSelector from './TestSignerSelector'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'

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
}

interface DashboardProps {
  onCreateProposal: () => void
  reloadProposals?: number
}

export default function Dashboard({ onCreateProposal, reloadProposals }: DashboardProps) {
  const [connected, setConnected] = useState(false)
  const [userAddress, setUserAddress] = useState<string | null>(null)
  const [balance, setBalance] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null)
  const [isMultisigInitialized, setIsMultisigInitialized] = useState<boolean | null>(null)
  const [initializing, setInitializing] = useState(false)
  const [connecting, setConnecting] = useState(false)

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
      }
    } catch (err) {
      console.error('Error checking multisig:', err)
      setIsMultisigInitialized(false)
    }
  }

  const checkWalletConnection = async () => {
    try {
      const publicKey = await walletService.getPublicKey()
      if (publicKey) {
        setUserAddress(publicKey.toString())
        setConnected(true)
        await anchorService.initialize()
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
      setUserAddress(publicKey.toString())
      setConnected(true)
      await anchorService.initialize()
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
        return;
      }

      // Use the 3 configured wallet addresses with 2-of-3 threshold
      const signers = [
        new PublicKey('3wEzj7icty3RaBUpuroWmCt5mpNL8Ki8TaajBRqBFEFk'),
        new PublicKey('HPkUHvWYfAj8CzyeaEsT8CdDyqh6KhZqr4SZFbBjjwQh'),
        new PublicKey('2YCDsgD8mZjDh6uom8J4gY6SmXWmJWxcDtQT8y5s5Tjr')
      ];
      const threshold = 2; // 2 out of 3 signers must approve
      
      console.log('Initializing with 3 signers and 2-of-3 threshold...');
      const tx = await multisigService.initializeMultisig(publicKey, signers, threshold)
      
      console.log('Multisig initialized! TX:', tx)
      alert(`Success! Multisig initialized with 2-of-3 threshold.\nTransaction: ${tx}`)
      
      // Refresh status
      await checkMultisigInitialized()
    } catch (err: any) {
      console.error('Initialize error:', err)
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
      console.log('Balance fetch - userAddress:', userAddress);
      console.log('Balance fetch - Phantom publicKey:', publicKey?.toString());
      console.log('Balance fetch - connection endpoint:', connection.rpcEndpoint);
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
        proposer: p.proposer.toString()
      }))
      console.log('[Dashboard] formattedProposals:', formattedProposals);
      setProposals(formattedProposals)
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

  const handleExecute = async () => {
    try {
      if (!selectedProposal) return
      setLoading(true)
      const userKey = await walletService.getPublicKey()
      if (userKey) {
        // TODO: Implement executeProposal in anchorService or handle execution logic here
        // await anchorService.executeProposal(new PublicKey(selectedProposal.pubkey), userKey)
        await loadProposals()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute')
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
            <strong>Authority Wallet:</strong><br/>
            <code style={{ background: '#fff', padding: '0.25rem 0.5rem', borderRadius: '4px', display: 'block', marginTop: '0.25rem' }}>
              {userAddress}
            </code>
          </p>
          <p style={{ margin: '0.5rem 0', opacity: 0.8 }}>
            <strong>Multisig Status:</strong> {isMultisigInitialized === null ? 'Checking...' : isMultisigInitialized ? '✅ Initialized' : '❌ Not Initialized'}
          </p>
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

      {/* Wallet Info */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="section-title">Connected: {userAddress?.slice(0, 20)}...</h3>
          <button className="btn btn-secondary" onClick={handleDisconnect}>
            Disconnect
          </button>
        </div>
        <div className="balance-label" style={{ opacity: 0.7 }}>Balance: {balance.toFixed(4)} SOL</div>
        <div className="balance-label" style={{ opacity: 0.7 }}>≈ ${(balance * 150).toFixed(2)} USD</div>
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
                  disabled={loading}
                >
                  Approve
                </button>
                <button 
                  className="btn btn-danger" 
                  onClick={() => handleVote(false)}
                  disabled={loading}
                >
                  Reject
                </button>
              </>
            )}
            {selectedProposal.status === 'approved' && (
              <button 
                className="btn btn-primary" 
                onClick={handleExecute}
                disabled={loading}
              >
                Execute
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
          disabled={loading || isMultisigInitialized === false}
        >
          + Create New Proposal
        </button>
        {isMultisigInitialized === false && (
          <p style={{ fontSize: '0.9rem', color: '#856404', marginTop: '0.5rem' }}>
            ⚠️ Initialize multisig first to create proposals
          </p>
        )}
      </div>
    </>
  )}