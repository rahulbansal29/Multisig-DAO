import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useAppStore } from '@store/appStore';
import { ProposalStatus } from '@types/index';
import { formatAddress, formatTimeAgo, isExpired } from '@utils/formatters';

export const ProposalListScreen: React.FC<{ navigation: any }> = ({
  navigation,
}) => {
  const { proposals, multisig, loadProposals } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'executed'>('all');

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProposals();
    setRefreshing(false);
  };

  const getProposalStatus = (proposal: any): ProposalStatus => {
    if (proposal.executed) return ProposalStatus.EXECUTED;
    if (proposal.rejected) return ProposalStatus.REJECTED;
    if (isExpired(proposal.expiry)) return ProposalStatus.EXPIRED;
    if (proposal.approvedSigners.length >= (multisig?.threshold || 0)) {
      return ProposalStatus.APPROVED;
    }
    return ProposalStatus.PENDING;
  };

  const getStatusColor = (status: ProposalStatus): string => {
    switch (status) {
      case ProposalStatus.PENDING:
        return '#f59e0b';
      case ProposalStatus.APPROVED:
        return '#10b981';
      case ProposalStatus.EXECUTED:
        return '#6366f1';
      case ProposalStatus.REJECTED:
        return '#ef4444';
      case ProposalStatus.EXPIRED:
        return '#9ca3af';
    }
  };

  const filteredProposals = proposals.filter((p) => {
    if (filter === 'all') return true;
    if (filter === 'pending')
      return !p.executed && !p.rejected && !isExpired(p.expiry);
    if (filter === 'executed') return p.executed;
    return true;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Proposals</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('CreateProposal')}
        >
          <Text style={styles.createButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.activeFilterTab]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'all' && styles.activeFilterText,
            ]}
          >
            All ({proposals.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === 'pending' && styles.activeFilterTab,
          ]}
          onPress={() => setFilter('pending')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'pending' && styles.activeFilterText,
            ]}
          >
            Pending (
            {
              proposals.filter(
                (p) => !p.executed && !p.rejected && !isExpired(p.expiry)
              ).length
            }
            )
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === 'executed' && styles.activeFilterTab,
          ]}
          onPress={() => setFilter('executed')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'executed' && styles.activeFilterText,
            ]}
          >
            Executed ({proposals.filter((p) => p.executed).length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredProposals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No proposals found</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('CreateProposal')}
            >
              <Text style={styles.emptyButtonText}>Create First Proposal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredProposals.map((proposal) => {
            const status = getProposalStatus(proposal);
            const statusColor = getStatusColor(status);

            return (
              <TouchableOpacity
                key={proposal.index}
                style={styles.proposalCard}
                onPress={() =>
                  navigation.navigate('ProposalDetail', {
                    proposal: proposal.publicKey.toString(),
                  })
                }
              >
                <View style={styles.proposalHeader}>
                  <Text style={styles.proposalTitle}>
                    Proposal #{proposal.index}
                  </Text>
                  <View
                    style={[styles.statusBadge, { backgroundColor: statusColor }]}
                  >
                    <Text style={styles.statusText}>{status}</Text>
                  </View>
                </View>

                <Text style={styles.proposalCreator}>
                  By {formatAddress(proposal.creator.toString())}
                </Text>

                <View style={styles.proposalFooter}>
                  <Text style={styles.approvalText}>
                    {proposal.approvedSigners.length}/{multisig?.threshold}{' '}
                    approvals
                  </Text>
                  <Text style={styles.timeText}>
                    {formatTimeAgo(proposal.createdAt)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
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
  createButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#ffffff',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  activeFilterTab: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeFilterText: {
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  proposalCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  proposalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  proposalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  proposalCreator: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  proposalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  approvalText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#111827',
  },
  timeText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
