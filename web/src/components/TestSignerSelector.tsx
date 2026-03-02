import React, { useEffect, useState } from 'react';
import { testSignerService, TestSigner } from '../services/testSigner';

interface TestSignerSelectorProps {
  onSignerChange?: (signer: TestSigner, index: number) => void;
}

export function TestSignerSelector({ onSignerChange }: TestSignerSelectorProps) {
  const [testSigners, setTestSigners] = useState<TestSigner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(2);

  useEffect(() => {
    initializeTestSigners();
  }, []);

  const initializeTestSigners = async () => {
    const available = await testSignerService.loadTestSigners();
    if (available) {
      const signers = testSignerService.getTestSigners();
      setTestSigners(signers);
      setEnabled(true);
      // Load threshold from test-signers.json if available
      const response = await fetch('/test-signers.json');
      if (response.ok) {
        const data = await response.json();
        if (data.threshold) {
          setThreshold(data.threshold);
        }
      }
    }
    setLoading(false);
  };

  const handleSignerChange = (index: number) => {
    setCurrentIndex(index);
    const signer = testSigners[index];
    if (signer && onSignerChange) {
      onSignerChange(signer, index);
    }
  };

  if (loading) {
    return null;
  }

  if (!enabled || testSigners.length === 0) {
    return null;
  }

  const currentSigner = testSigners[currentIndex];

  return (
    <div
      style={{
        background: '#e8f5e9',
        border: '2px solid #4caf50',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '2rem',
      }}
    >
      <h3 style={{ color: '#2e7d32', margin: '0 0 1rem 0' }}>
        ✅ Multi-Wallet Setup ({threshold}-of-{testSigners.length})
      </h3>

      <p style={{ color: '#1b5e20', marginBottom: '1rem', fontSize: '0.95rem', fontWeight: '500' }}>
        <strong>Your Configuration:</strong> {threshold} out of {testSigners.length} signers must approve proposals
      </p>

      <div style={{ 
        background: '#fff', 
        padding: '1rem', 
        borderRadius: '6px',
        marginBottom: '1rem',
        border: '1px solid #a5d6a7'
      }}>
        <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: '#666' }}>
          <strong>📋 Your {testSigners.length} Authorized Wallets:</strong>
        </p>
        {testSigners.map((signer, index) => (
          <div
            key={index}
            style={{
              padding: '0.5rem',
              marginBottom: '0.5rem',
              background: currentIndex === index ? '#e8f5e9' : '#f5f5f5',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              cursor: 'pointer',
              border: currentIndex === index ? '2px solid #4caf50' : '1px solid #ddd',
            }}
            onClick={() => handleSignerChange(index)}
          >
            <strong style={{ color: '#2e7d32' }}>{signer.name}:</strong>
            <br />
            <span style={{ wordBreak: 'break-all', color: '#666' }}>
              {signer.pubkey}
            </span>
            {currentIndex === index && (
              <span style={{ marginLeft: '0.5rem', color: '#4caf50' }}>← Current</span>
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          background: '#fff3cd',
          padding: '0.75rem',
          borderRadius: '6px',
          fontSize: '0.85rem',
          color: '#856404',
          border: '1px solid #ffc107',
        }}
      >
        <strong>� How to Switch Wallets (Important!):</strong>
        <ol style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.25rem' }}>
          <li><strong>Open Phantom extension</strong> (click browser icon)</li>
          <li><strong>Click wallet/account name</strong> at the top</li>
          <li><strong>Select different wallet</strong> from the list</li>
          <li><strong>Disconnect & reconnect</strong> in this app</li>
          <li>Now the new wallet is active for voting!</li>
        </ol>
        <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.8rem', fontStyle: 'italic' }}>
          ⚠️ This UI above is for reference only - it does NOT switch wallets. 
          You must switch in Phantom extension itself.
        </p>
      </div>

      <p style={{ fontSize: '0.85rem', color: '#2e7d32', marginTop: '1rem', marginBottom: 0, fontWeight: '500' }}>
        💡 <strong>Tip:</strong> If you only have 1 wallet, create more in Phantom: 
        Settings → Add Wallet (or use same wallet for testing)
      </p>
    </div>
  );
}

export default TestSignerSelector;
