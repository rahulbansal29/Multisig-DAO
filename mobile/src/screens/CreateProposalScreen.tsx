import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAppStore } from '@store/appStore';
import { blockchainService } from '@services/blockchain.service';
import { walletService } from '@services/wallet.service';
import { biometricService } from '@services/biometric.service';
import { PublicKey } from '@solana/web3.js';
import { DEFAULT_PROPOSAL_EXPIRY_DAYS } from '@utils/constants';
import { formatAddress } from '@utils/formatters';

export const CreateProposalScreen: React.FC<{ navigation: any }> = ({
  navigation,
}) => {
  const { wallet, multisigPubkey, loadProposals } = useAppStore();

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [expiryDays, setExpiryDays] = useState(DEFAULT_PROPOSAL_EXPIRY_DAYS.toString());
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const validateInputs = (): boolean => {
    if (!recipient.trim()) {
      Alert.alert('Validation Error', 'Recipient address is required');
      return false;
    }

    try {
      new PublicKey(recipient);
    } catch {
      Alert.alert('Validation Error', 'Invalid recipient address');
      return false;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Validation Error', 'Amount must be greater than 0');
      return false;
    }

    const daysNum = parseInt(expiryDays);
    if (isNaN(daysNum) || daysNum < 1 || daysNum > 365) {
      Alert.alert('Validation Error', 'Expiry must be between 1 and 365 days');
      return false;
    }

    return true;
  };

  const handleCreate = async () => {
    if (!validateInputs() || !wallet.publicKey || !multisigPubkey) return;

    try {
      // Require biometric authentication
      const authenticated = await biometricService.authenticateForTransaction();
      if (!authenticated) {
        Alert.alert('Authentication Failed', 'Biometric authentication required');
        return;
      }

      setLoading(true);

      // Calculate expiry timestamp
      const daysNum = parseInt(expiryDays);
      const expiryTimestamp = Math.floor(Date.now() / 1000) + daysNum * 24 * 60 * 60;

      // Create instruction data (simplified - encode transfer instruction)
      // In production, properly encode the instruction using Anchor IDL
      const instructionData = Buffer.from(
        JSON.stringify({
          type: 'transfer_sol',
          recipient,
          amount: parseFloat(amount),
          description,
        })
      );

      // Create proposal transaction
      const transaction = await blockchainService.createProposalTransaction(
        multisigPubkey,
        wallet.publicKey,
        instructionData,
        expiryTimestamp
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
        `Proposal created!\nSignature: ${formatAddress(signature)}`,
        [
          {
            text: 'OK',
            onPress: () => {
              loadProposals();
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error creating proposal:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to create proposal'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Proposal</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Transfer Details</Text>

        <Text style={styles.label}>Recipient Address *</Text>
        <TextInput
          style={styles.input}
          value={recipient}
          onChangeText={setRecipient}
          placeholder="Enter Solana address"
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Amount (SOL) *</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor="#9ca3af"
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Description (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Brief description of the proposal"
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Proposal Settings</Text>

        <Text style={styles.label}>Expiry (Days) *</Text>
        <TextInput
          style={styles.input}
          value={expiryDays}
          onChangeText={setExpiryDays}
          placeholder={DEFAULT_PROPOSAL_EXPIRY_DAYS.toString()}
          placeholderTextColor="#9ca3af"
          keyboardType="number-pad"
        />

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ℹ️ The proposal will expire in {expiryDays || DEFAULT_PROPOSAL_EXPIRY_DAYS} days
            and cannot be executed after that.
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Summary</Text>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Recipient:</Text>
          <Text style={styles.summaryValue}>
            {recipient ? formatAddress(recipient) : '-'}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Amount:</Text>
          <Text style={styles.summaryValue}>
            {amount || '0'} SOL
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Expires In:</Text>
          <Text style={styles.summaryValue}>
            {expiryDays || DEFAULT_PROPOSAL_EXPIRY_DAYS} days
          </Text>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, loading && styles.disabledButton]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.actionButtonText}>Create Proposal</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.cancelButton]}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
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
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
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
  cancelButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
});
