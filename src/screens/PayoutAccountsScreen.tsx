import React, { useCallback, useState } from 'react';
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
import {
  PayoutAccount,
  listPayoutAccounts,
  setPrimaryAccount,
  deletePayoutAccount,
} from '../api/payoutAccountApi';

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e',
  inactive: '#f59e0b',
  suspended: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
};

export const PayoutAccountsScreen = () => {
  const navigation = useNavigation<any>();
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAccounts = async () => {
    try {
      const data = await listPayoutAccounts();
      setAccounts(data);
    } catch (error) {
      console.error('Failed to load payout accounts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAccounts();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadAccounts();
  };

  const handleSetPrimary = async (account: PayoutAccount) => {
    if (account.isPrimary) return;
    try {
      await setPrimaryAccount(account._id);
      await loadAccounts();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update primary account');
    }
  };

  const handleDelete = (account: PayoutAccount) => {
    Alert.alert(
      'Remove Account',
      `Remove this ${account.accountType === 'vpa' ? 'UPI' : 'bank'} account? You won't receive payouts until you add another.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePayoutAccount(account._id);
              await loadAccounts();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to remove account');
            }
          },
        },
      ]
    );
  };

  const getAccountLabel = (account: PayoutAccount) => {
    if (account.accountType === 'vpa') return account.upiId ?? 'UPI Account';
    if (account.accountNumber) return `••••${account.accountNumber.slice(-4)}`;
    return 'Bank Account';
  };

  const getAccountSubLabel = (account: PayoutAccount) => {
    if (account.accountType === 'vpa') return 'UPI / VPA';
    return `${account.accountHolderName ?? ''} · ${account.ifscCode ?? ''}`.trim();
  };

  if (loading) return <Loader text="Loading payout accounts..." />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payout Accounts</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('BankAccountSetup')}
          style={styles.addBtn}
        >
          <Ionicons name="add" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {accounts.length === 0 ? (
          <>
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle" size={20} color={Colors.warning} />
              <Text style={styles.infoBannerText}>
                Add a bank account or UPI to receive your earnings via RazorpayX daily payouts.
              </Text>
            </View>
            <EmptyState
              icon="wallet-outline"
              title="No Payout Account"
              subtitle="Add your bank account or UPI ID to receive payouts"
              actionLabel="Add Account"
              onAction={() => navigation.navigate('BankAccountSetup')}
            />
          </>
        ) : (
          accounts.map((account) => {
            const statusColor = STATUS_COLORS[account.status] ?? Colors.textTertiary;
            const statusLabel = STATUS_LABELS[account.status] ?? account.status;

            return (
              <Card key={account._id} style={styles.accountCard}>
                {/* Header row */}
                <View style={styles.accountHeader}>
                  <View style={styles.accountIcon}>
                    <Ionicons
                      name={account.accountType === 'vpa' ? 'phone-portrait-outline' : 'business-outline'}
                      size={22}
                      color={Colors.primary}
                    />
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={styles.accountLabel}>{getAccountLabel(account)}</Text>
                    <Text style={styles.accountSub} numberOfLines={1}>
                      {getAccountSubLabel(account)}
                    </Text>
                  </View>
                  {account.isPrimary && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>Primary</Text>
                    </View>
                  )}
                </View>

                {/* Status row */}
                <View style={styles.statusRow}>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                  </View>

                  {account.isVerified && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark-circle" size={13} color={Colors.success} />
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                  )}
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                  {!account.isPrimary && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleSetPrimary(account)}
                    >
                      <Ionicons name="star-outline" size={15} color={Colors.primary} />
                      <Text style={styles.actionBtnText}>Set Primary</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnDestructive]}
                    onPress={() => handleDelete(account)}
                  >
                    <Ionicons name="trash-outline" size={15} color={Colors.error} />
                    <Text style={[styles.actionBtnText, { color: Colors.error }]}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })
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
  list: { padding: Spacing.xl },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.warningBg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  infoBannerText: { flex: 1, fontSize: 13, color: Colors.warning, fontWeight: '500' },
  accountCard: { padding: Spacing.lg, marginBottom: Spacing.md },
  accountHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  accountIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: { flex: 1 },
  accountLabel: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  accountSub: { fontSize: 12, color: Colors.textSecondary },
  primaryBadge: {
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  primaryBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  verifiedText: { fontSize: 11, fontWeight: '600', color: Colors.success },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
    marginTop: Spacing.xs,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primaryBg,
  },
  actionBtnDestructive: { backgroundColor: '#fef2f2' },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
});
