import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAppStore } from '@store/appStore';
import { formatSol, formatAddress } from '@utils/formatters';

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const {
    wallet,
    multisig,
    treasuryBalance,
    proposals,
    loading,
    error,
    connectWallet,
    disconnectWallet,
    loadTreasuryBalance,
    loadProposals,
  } = useAppStore();

  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    // Load saved wallet on mount
    useAppStore.getState().loadSavedWallet();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadTreasuryBalance(), loadProposals()]);
    setRefreshing(false);
  };

  if (!wallet.connected) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.title}>DAO Treasury</Text>
          <Text style={styles.subtitle}>
            Secure multisig wallet for your DAO
          </Text>
          
          {wallet.connecting ? (
            <ActivityIndicator size="large" color="#6366f1" />
          ) : (
            <TouchableOpacity
              style={styles.connectButton}
              onPress={connectWallet}
            >
              <Text style={styles.connectButtonText}>Connect Wallet</Text>
            </TouchableOpacity>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  const pendingProposals = proposals.filter(
    (p) => !p.executed && !p.rejected && !p.expiry
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>DAO Treasury</Text>
          <Text style={styles.headerSubtitle}>
            {wallet.publicKey && formatAddress(wallet.publicKey.toString())}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.disconnectButton}
          onPress={disconnectWallet}
        >
          <Text style={styles.disconnectButtonText}>Disconnect</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <>
          {/* Treasury Balance Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Treasury Balance</Text>
            <Text style={styles.balanceAmount}>
              {treasuryBalance
                ? `${formatSol(treasuryBalance.sol)} SOL`
                : '0.0000 SOL'}
            </Text>

            {treasuryBalance && treasuryBalance.tokens.length > 0 && (
              <View style={styles.tokenList}>
                <Text style={styles.tokenListTitle}>Tokens:</Text>
                {treasuryBalance.tokens.map((token, index) => (
                  <Text key={index} style={styles.tokenItem}>
                    {token.amount} {token.symbol || 'Unknown'}
                  </Text>
                ))}
              </View>
            )}
          </View>

          {/* Multisig Info Card */}
          {multisig && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Multisig Configuration</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Signers:</Text>
                <Text style={styles.infoValue}>{multisig.signers.length}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Threshold:</Text>
                <Text style={styles.infoValue}>{multisig.threshold}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Proposals:</Text>
                <Text style={styles.infoValue}>{multisig.proposalCount}</Text>
              </View>
            </View>
          )}

          {/* Pending Proposals Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Pending Proposals</Text>
              <Text style={styles.badge}>{pendingProposals.length}</Text>
            </View>

            {pendingProposals.length === 0 ? (
              <Text style={styles.emptyText}>No pending proposals</Text>
            ) : (
              pendingProposals.slice(0, 3).map((proposal) => (
                <TouchableOpacity
                  key={proposal.index}
                  style={styles.proposalItem}
                  onPress={() =>
                    navigation.navigate('ProposalDetail', {
                      proposal: proposal.publicKey.toString(),
                    })
                  }
                >
                  <Text style={styles.proposalTitle}>
                    Proposal #{proposal.index}
                  </Text>
                  <Text style={styles.proposalStatus}>
                    {proposal.approvedSigners.length}/{multisig?.threshold} approvals
                  </Text>
                </TouchableOpacity>
              ))
            )}

            {pendingProposals.length > 3 && (
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('Proposals')}
              >
                <Text style={styles.viewAllText}>View all proposals</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('CreateProposal')}
            >
              <Text style={styles.actionButtonText}>Create Proposal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => navigation.navigate('Proposals')}
            >
              <Text style={styles.secondaryButtonText}>View All Proposals</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 32,
    textAlign: 'center',
  },
  connectButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  connectButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  disconnectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  disconnectButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  tokenList: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  tokenListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  tokenItem: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  badge: {
    backgroundColor: '#6366f1',
    color: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 16,
  },
  proposalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  proposalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  proposalStatus: {
    fontSize: 12,
    color: '#6b7280',
  },
  viewAllButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  viewAllText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
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
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  secondaryButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
});
