import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAppStore } from '@store/appStore';
import { blockchainService } from '@services/blockchain.service';
import { walletService } from '@services/wallet.service';
import { biometricService } from '@services/biometric.service';
import { PublicKey } from '@solana/web3.js';
import {
  formatAddress,
  formatTimestamp,
  isExpired,
} from '@utils/formatters';
import { ProposalStatus } from '@types/index';

export const ProposalDetailScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { proposals, multisig, wallet, loadProposals } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const proposalPubkey = route.params.proposal;
  const proposal = proposals.find(
    (p) => p.publicKey.toString() === proposalPubkey
  );

  useEffect(() => {
    if (!proposal) {
      navigation.goBack();
    }
  }, [proposal]);

  if (!proposal) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const getProposalStatus = (): ProposalStatus => {
    if (proposal.executed) return ProposalStatus.EXECUTED;
    if (proposal.rejected) return ProposalStatus.REJECTED;
    if (isExpired(proposal.expiry)) return ProposalStatus.EXPIRED;
    if (proposal.approvedSigners.length >= (multisig?.threshold || 0)) {
      return ProposalStatus.APPROVED;
    }
    return ProposalStatus.PENDING;
  };

  const canApprove = (): boolean => {
    if (!wallet.publicKey || !multisig) return false;
    if (proposal.executed || proposal.rejected) return false;
    if (isExpired(proposal.expiry)) return false;

    const hasApproved = proposal.approvedSigners.some(
      (signer) => signer.toString() === wallet.publicKey?.toString()
    );
    if (hasApproved) return false;

    const isSigner = multisig.signers.some(
      (signer) => signer.toString() === wallet.publicKey?.toString()
    );

    return isSigner;
  };

  const canExecute = (): boolean => {
    if (!wallet.publicKey) return false;
    if (proposal.executed || proposal.rejected) return false;
    if (isExpired(proposal.expiry)) return false;

    return proposal.approvedSigners.length >= (multisig?.threshold || 0);
  };

  const handleApprove = async () => {
    if (!wallet.publicKey) return;

    try {
      // Require biometric authentication
      const authenticated = await biometricService.authenticateForTransaction();
      if (!authenticated) {
        Alert.alert('Authentication Failed', 'Biometric authentication required');
        return;
      }

      setLoading(true);

      // Create approve transaction
      const transaction = await blockchainService.createApproveTransaction(
        new PublicKey(proposalPubkey),
        wallet.publicKey
      );

      // Sign with wallet
      const signedTx = await walletService.signTransaction(
        transaction.serialize().toString('base64')
      );

      // Send transaction
      const signature = await blockchainService.sendAndConfirmTransaction(
        transaction,
        signedTx
      );

      Alert.alert('Success', `Proposal approved!\nSignature: ${formatAddress(signature)}`);

      // Reload proposals
      await loadProposals();
    } catch (error) {
      console.error('Error approving proposal:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to approve proposal'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    try {
      setSimulating(true);

      // Create execution transaction
      if (!wallet.publicKey) return;

      const transaction = await blockchainService.createExecuteTransaction(
        new PublicKey(proposalPubkey),
        wallet.publicKey
      );

      // Simulate
      const simulation = await blockchainService.simulateTransaction(transaction);

      Alert.alert(
        'Transaction Simulation',
        `Success: ${simulation.success}\n` +
          `Units consumed: ${simulation.unitsConsumed}\n` +
          `${simulation.error ? `Error: ${simulation.error}` : ''}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error simulating:', error);
      Alert.alert('Simulation Error', 'Failed to simulate transaction');
    } finally {
      setSimulating(false);
    }
  };

  const handleExecute = async () => {
    if (!wallet.publicKey) return;

    // Show simulation first
    Alert.alert(
      'Execute Proposal',
      'Do you want to simulate the transaction first?',
      [
        {
          text: 'Simulate',
          onPress: handleSimulate,
        },
        {
          text: 'Execute Now',
          onPress: async () => {
            try {
              // Require biometric authentication
              const authenticated = await biometricService.authenticateForTransaction();
              if (!authenticated) {
                Alert.alert(
                  'Authentication Failed',
                  'Biometric authentication required'
                );
                return;
              }

              setLoading(true);

              // Create execute transaction
              const transaction = await blockchainService.createExecuteTransaction(
                new PublicKey(proposalPubkey),
                wallet.publicKey
              );

              // Sign with wallet
              const signedTx = await walletService.signTransaction(
                transaction.serialize().toString('base64')
              );

              // Send transaction
              const signature = await blockchainService.sendAndConfirmTransaction(
                transaction,
                signedTx
              );

              Alert.alert(
                'Success',
                `Proposal executed!\nSignature: ${formatAddress(signature)}`
              );

              // Reload proposals
              await loadProposals();
            } catch (error) {
              console.error('Error executing proposal:', error);
              Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to execute proposal'
              );
            } finally {
              setLoading(false);
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const status = getProposalStatus();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Proposal #{proposal.index}</Text>
        <View style={[styles.statusBadge, styles[`status${status}`]]}>
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </View>

      {/* Proposal Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Details</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Creator:</Text>
          <Text style={styles.infoValue}>
            {formatAddress(proposal.creator.toString())}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Created:</Text>
          <Text style={styles.infoValue}>
            {formatTimestamp(proposal.createdAt)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Expires:</Text>
          <Text
            style={[
              styles.infoValue,
              isExpired(proposal.expiry) && styles.expiredText,
            ]}
          >
            {formatTimestamp(proposal.expiry)}
          </Text>
        </View>

        {proposal.executed && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Executed:</Text>
            <Text style={styles.infoValue}>
              {formatTimestamp(proposal.executedAt)}
            </Text>
          </View>
        )}
      </View>

      {/* Approvals */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Approvals ({proposal.approvedSigners.length}/{multisig?.threshold})
        </Text>

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${
                  (proposal.approvedSigners.length / (multisig?.threshold || 1)) *
                  100
                }%`,
              },
            ]}
          />
        </View>

        {proposal.approvedSigners.map((signer, index) => (
          <View key={index} style={styles.approvalItem}>
            <Text style={styles.approvalText}>
              ✓ {formatAddress(signer.toString())}
            </Text>
          </View>
        ))}

        {proposal.approvedSigners.length === 0 && (
          <Text style={styles.emptyText}>No approvals yet</Text>
        )}
      </View>

      {/* Instruction Data */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Instruction Data</Text>
        <Text style={styles.instructionData}>
          {proposal.instructionData.toString('hex').slice(0, 100)}
          {proposal.instructionData.length > 50 && '...'}
        </Text>
        <Text style={styles.instructionSize}>
          Size: {proposal.instructionData.length} bytes
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        {canApprove() && (
          <TouchableOpacity
            style={[styles.actionButton, loading && styles.disabledButton]}
            onPress={handleApprove}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.actionButtonText}>Approve Proposal</Text>
            )}
          </TouchableOpacity>
        )}

        {canExecute() && (
          <>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.executeButton,
                loading && styles.disabledButton,
              ]}
              onPress={handleExecute}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.actionButtonText}>Execute Proposal</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.simulateButton,
                simulating && styles.disabledButton,
              ]}
              onPress={handleSimulate}
              disabled={simulating}
            >
              {simulating ? (
                <ActivityIndicator color="#6366f1" />
              ) : (
                <Text style={styles.simulateButtonText}>
                  Simulate Transaction
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusPending: { backgroundColor: '#f59e0b' },
  statusApproved: { backgroundColor: '#10b981' },
  statusExecuted: { backgroundColor: '#6366f1' },
  statusRejected: { backgroundColor: '#ef4444' },
  statusExpired: { backgroundColor: '#9ca3af' },
  card: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  expiredText: {
    color: '#ef4444',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
  },
  approvalItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  approvalText: {
    fontSize: 14,
    color: '#111827',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 16,
  },
  instructionData: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#374151',
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  instructionSize: {
    fontSize: 12,
    color: '#6b7280',
  },
  actionsContainer: {
    padding: 16,
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  executeButton: {
    backgroundColor: '#10b981',
  },
  simulateButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  simulateButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
  },
});
