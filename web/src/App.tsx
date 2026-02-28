import React, { useState } from 'react'
import './App.css'
import Dashboard from './components/Dashboard'
import ProposalForm from './components/ProposalForm'


function App() {
  const [showForm, setShowForm] = useState(false);
  const [reloadProposals, setReloadProposals] = useState(0);

  const handleProposalSuccess = () => {
    setShowForm(false);
    setReloadProposals(prev => prev + 1);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🏛️ DAO Treasury</h1>
        <p>Multisig Wallet on Solana</p>
      </header>

      <main className="main">
        {showForm ? (
          <ProposalForm onCancel={() => setShowForm(false)} onSuccess={handleProposalSuccess} />
        ) : (
          <Dashboard onCreateProposal={() => setShowForm(true)} reloadProposals={reloadProposals} />
        )}
      </main>
    </div>
  );
}

export default App

