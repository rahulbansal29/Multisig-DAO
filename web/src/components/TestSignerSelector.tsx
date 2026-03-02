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

  useEffect(() => {
    initializeTestSigners();
  }, []);

  const initializeTestSigners = async () => {
    const available = await testSignerService.loadTestSigners();
    if (available) {
      const signers = testSignerService.getTestSigners();
      setTestSigners(signers);
      setEnabled(true);
    }
    setLoading(false);
  };

  const handleSignerChange = (index: number) => {
    testSignerService.setCurrentSigner(index);
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
        background: '#f0f7ff',
        border: '2px solid #667eea',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '2rem',
      }}
    >
      <h3 style={{ color: '#667eea', margin: '0 0 1rem 0' }}>
        🧪 Test Mode - Multi-Signer Testing
      </h3>

      <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.9rem' }}>
        <strong>Current Signer:</strong> {currentSigner.name} ({currentSigner.pubkey.slice(0, 10)}...)
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {testSigners.map((signer, index) => (
          <button
            key={index}
            onClick={() => handleSignerChange(index)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: currentIndex === index ? '2px solid #667eea' : '1px solid #ccc',
              background: currentIndex === index ? '#667eea' : '#fff',
              color: currentIndex === index ? '#fff' : '#667eea',
              cursor: 'pointer',
              fontWeight: currentIndex === index ? '600' : '400',
              transition: 'all 0.2s',
            }}
          >
            {signer.name}
          </button>
        ))}
      </div>

      <div
        style={{
          background: '#fff',
          padding: '0.75rem',
          borderRadius: '6px',
          fontSize: '0.85rem',
          color: '#666',
          fontFamily: 'monospace',
          wordBreak: 'break-all',
        }}
      >
        <strong>Public Key:</strong>
        <br />
        {currentSigner.pubkey}
      </div>

      <p style={{ fontSize: '0.85rem', color: '#999', marginTop: '1rem', marginBottom: 0 }}>
        💡 <strong>Tip:</strong> Switch signers to test the approval flow. Approve with 3
        different signers to reach threshold.
      </p>
    </div>
  );
}

export default TestSignerSelector;
