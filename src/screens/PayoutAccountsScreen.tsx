import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { Card } from '../components/common/Card';
import { Loader } from '../components/common/Loader';
import { EmptyState } from '../components/common/EmptyState';
import client from '../api/client';

interface LinkedAccountStatus {
  hasLinkedAccount: boolean;
  linkedAccountId?: string;
  status: 'created' | 'activated' | 'suspended' | 'needs_clarification' | null;
  canReceivePayments: boolean;
  message: string;
}

const STATUS_COLORS: Record<string, string> = {
  activated: '#22c55e',
  created: '#f59e0b',
  suspended: '#ef4444',
  needs_clarification: '#f97316',
};

const STATUS_LABELS: Record<string, string> = {
  activated: 'Active',
  created: 'Pending Activation',
  suspended: 'Suspended',
  needs_clarification: 'Needs Clarification',
};

export const PayoutAccountsScreen = () => {
  const navigation = useNavigation<any>();
  const [linkedAccount, setLinkedAccount] = useState<LinkedAccountStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAccounts();
    }, [])
  );

  const loadAccounts = async () => {
    try {
      const response = await client.get('/linked-accounts/status');
      setLinkedAccount(response.data?.data ?? null);
    } catch (error) {
      console.error('Failed to load linked account status:', error);
      setLinkedAccount(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAccounts();
  };

  const handleAddAccount = () => {
    navigation.navigate('BankAccountSetup');
  };

  if (loading) {
    return <Loader text="Loading payout account..." />;
  }

  const statusKey = linkedAccount?.status ?? '';
  const statusColor = STATUS_COLORS[statusKey] ?? Colors.textTertiary;
  const statusLabel = STATUS_LABELS[statusKey] ?? 'Unknown';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payout Account</Text>
        {!linkedAccount?.hasLinkedAccount && (
          <TouchableOpacity onPress={handleAddAccount} style={styles.addBtn}>
            <Ionicons name="add" size={24} color={Colors.primary} />
          </TouchableOpacity>
        )}
        {linkedAccount?.hasLinkedAccount && <View style={{ width: 36 }} />}
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {!linkedAccount?.hasLinkedAccount ? (
          <>
            {/* Info Banner */}
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle" size={20} color={Colors.warning} />
              <Text style={styles.infoBannerText}>
                Add a payout account to receive your earnings automatically via Razorpay Route.
              </Text>
            </View>
            <EmptyState
              icon="wallet-outline"
              title="No Payout Account"
              subtitle="Add your bank account or UPI to receive payouts"
              actionLabel="Add Account"
              onAction={handleAddAccount}
            />
          </>
        ) : (
          <Card style={styles.accountCard}>
            {/* Razorpay Route badge */}
            <View style={styles.routeBadge}>
              <Ionicons name="git-network-outline" size={14} color={Colors.primary} />
              <Text style={styles.routeBadgeText}>Razorpay Route</Text>
            </View>

            <View style={styles.accountHeader}>
              <View style={styles.accountIcon}>
                <Ionicons name="wallet" size={26} color={Colors.primary} />
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountTitle}>Linked Payout Account</Text>
                <Text style={styles.accountId} numberOfLines={1}>
                  {linkedAccount.linkedAccountId}
                </Text>
              </View>
            </View>

            {/* Status row */}
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
              </View>

              {linkedAccount.canReceivePayments && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                  <Text style={styles.verifiedText}>Can receive payments</Text>
                </View>
              )}
            </View>

            {/* Status message */}
            <Text style={styles.statusMessage}>{linkedAccount.message}</Text>

            {/* Action – add bank account to linked account */}
            <TouchableOpacity style={styles.manageBtn} onPress={handleAddAccount}>
              <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
              <Text style={styles.manageBtnText}>Add / Update Bank Account</Text>
            </TouchableOpacity>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  addBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.warningBg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: Colors.warning,
    fontWeight: '500',
  },
  list: { padding: Spacing.xl },
  accountCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  routeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
  },
  routeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  accountHeader: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  accountIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  accountTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  accountId: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: 'monospace',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.success,
  },
  statusMessage: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryBg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
    marginTop: Spacing.sm,
  },
  manageBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
});
