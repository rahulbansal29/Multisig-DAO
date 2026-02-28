import React, { useState } from 'react'
import { PublicKey } from '@solana/web3.js'
import { walletService } from '../services/wallet'
import { anchorService } from '../services/anchor'

interface ProposalFormProps {
  onCancel: () => void
  onSuccess?: () => void
}

export default function ProposalForm({ onCancel, onSuccess }: ProposalFormProps) {
  const [formData, setFormData] = useState({
    description: '',
    recipient: '',
    amount: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.description || !formData.recipient || !formData.amount) {
      setError('Please fill all fields')
      return
    }

    // Validate recipient is a valid Solana address
    try {
      new PublicKey(formData.recipient)
    } catch {
      setError('Invalid Solana address')
      return
    }

    const amount = parseFloat(formData.amount)
    if (amount <= 0) {
      setError('Amount must be greater than 0')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Get wallet public key
      const walletKey = await walletService.getPublicKey()
      if (!walletKey) {
        setError('Wallet not connected')
        return
      }

      // Create proposal on blockchain
      const recipientPubkey = new PublicKey(formData.recipient)
      const txSignature = await anchorService.createProposal(
        walletKey,
        formData.description,
        recipientPubkey,
        amount
      )

      setSuccess(true)
      console.log('Proposal created with transaction:', txSignature)

      // Clear form after success
      setFormData({ description: '', recipient: '', amount: '' })

      // Call success callback immediately to reload proposals
      if (onSuccess) {
        onSuccess();
      }
      // Optionally close the form after a short delay
      setTimeout(() => {
        onCancel();
      }, 1000);
    } catch (err) {
      console.error('Error creating proposal:', err)
      setError(
        err instanceof Error 
          ? err.message 
          : 'Failed to create proposal. Make sure the smart contract is deployed.'
      )
      setSuccess(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h2 className="section-title" style={{ color: '#333', margin: 0, marginBottom: '1.5rem' }}>
        Create New Proposal
      </h2>

      {success && (
        <div style={{ 
          background: '#d4edda', 
          color: '#155724', 
          padding: '1rem', 
          borderRadius: '0.5rem', 
          marginBottom: '1rem',
          border: '1px solid #c3e6cb'
        }}>
          ✓ Proposal created successfully! Redirecting...
        </div>
      )}

      {error && (
        <div style={{ 
          background: '#f8d7da', 
          color: '#721c24', 
          padding: '1rem', 
          borderRadius: '0.5rem', 
          marginBottom: '1rem',
          border: '1px solid #f5c6cb'
        }}>
          ✗ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ maxWidth: '500px' }}>
        
        <div className="form-group">
          <label>Description *</label>
          <textarea
            name="description"
            placeholder="What is this proposal for?"
            rows={3}
            value={formData.description}
            onChange={handleChange}
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Recipient Address *</label>
          <input
            type="text"
            name="recipient"
            placeholder="Solana address"
            value={formData.recipient}
            onChange={handleChange}
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Amount (SOL) *</label>
          <input
            type="number"
            name="amount"
            placeholder="0.00"
            step="0.1"
            min="0"
            value={formData.amount}
            onChange={handleChange}
            disabled={loading}
          />
        </div>

        <div className="info-box">
          <strong>Note:</strong> Proposals are stored on-chain. Requires Phantom wallet signature.
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Proposal'}
          </button>
        </div>
      </form>
    </div>
  )
}
