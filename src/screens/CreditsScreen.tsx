import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { Card } from '../components/common/Card';
import { Loader } from '../components/common/Loader';
import { EmptyState } from '../components/common/EmptyState';
import { PurchaseCreditsModal } from '../components/PurchaseCreditsModal';
import { formatCurrency, formatDate } from '../utils/format';
import { RootState, AppDispatch } from '../store';
import { fetchCreditStats, fetchCreditTransactions } from '../store/creditSlice';
import { CreditTransaction as CreditTransactionType } from '../api/creditApi';
import { useAppSelector } from '../hooks/useAppSelector';

type Tab = 'all' | 'recharges' | 'expenses' | 'penalties';

export const CreditsScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();
  const [tab, setTab] = useState<Tab>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  const { stats, transactions, status } = useSelector((state: RootState) => state.credit);
  const { items: bookings } = useAppSelector((s) => s.bookings);
  const balance = stats?.currentBalance || 0;

  // Calculate job stats
  const completedJobs = bookings.filter((b) => b.status === 'completed').length;
  const cancelledJobs = bookings.filter((b) => b.status === 'cancelled').length;

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    await Promise.all([
      dispatch(fetchCreditStats()),
      dispatch(fetchCreditTransactions({})),
    ]);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleAddCredits = () => {
    setShowPurchaseModal(true);
  };

  const handlePurchaseSuccess = () => {
    load(); // Refresh data after successful purchase
  };

  const filtered = transactions.filter((t) => {
    if (tab === 'all') return true;
    if (tab === 'recharges') return t.type === 'purchase' || t.type === 'refund';
    if (tab === 'expenses') return t.type === 'job_deduction';
    if (tab === 'penalties') return t.type === 'penalty';
    return true;
  });

  const TABS: { id: Tab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'recharges', label: 'Recharges' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'penalties', label: 'Penalties' },
  ];

  if (status === 'loading' && !stats) return <Loader text="Loading credits..." />;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Credits</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Balance Card */}
      <View style={styles.balanceSection}>
        <Card style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
          {stats && (
            <Text style={styles.jobsRemaining}>
              ~{Math.floor(stats.jobsRemaining / 2)} jobs remaining (₹{stats.creditPerJob * 2}/job)
            </Text>
          )}

          {/* Job Stats */}
          <View style={styles.jobStats}>
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <Text style={styles.statValue}>{completedJobs}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Ionicons name="close-circle" size={20} color={Colors.cancelled} />
              <Text style={styles.statValue}>{cancelledJobs}</Text>
              <Text style={styles.statLabel}>Cancelled</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.rechargeBtn} onPress={handleAddCredits}>
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.rechargeBtnText}>Add Credits</Text>
          </TouchableOpacity>
        </Card>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, tab === t.id && styles.tabActive]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transaction List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <EmptyState icon="wallet-outline" title="No transactions" subtitle="Your credit history will appear here" />
        }
        renderItem={({ item }) => <TransactionRow item={item} />}
      />

      {/* Purchase Modal */}
      <PurchaseCreditsModal
        visible={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        onSuccess={handlePurchaseSuccess}
      />
    </View>
  );
};

const TransactionRow = ({ item }: { item: CreditTransactionType }) => {
  const isCredit = item.amount > 0;
  const iconMap: Record<string, any> = {
    purchase: 'add-circle',
    refund: 'arrow-undo',
    job_deduction: 'remove-circle',
    penalty: 'warning',
  };
  const colorMap: Record<string, string> = {
    purchase: Colors.success,
    refund: Colors.warning,
    job_deduction: Colors.error,
    penalty: Colors.error,
  };
  const icon = iconMap[item.type] || 'ellipse';
  const color = colorMap[item.type] || Colors.textSecondary;

  return (
    <View style={styles.txRow}>
      <View style={[styles.txIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.txContent}>
        <Text style={styles.txDesc} numberOfLines={1}>{item.description}</Text>
        <Text style={styles.txDate}>{formatDate(item.createdAt)}</Text>
      </View>
      <Text style={[styles.txAmount, { color: isCredit ? Colors.success : Colors.error }]}>
        {isCredit ? '+' : '-'}{formatCurrency(item.amount)}
      </Text>
    </View>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  balanceSection: { padding: Spacing.xl, paddingBottom: 0 },
  balanceCard: {
    backgroundColor: Colors.primary, alignItems: 'center', paddingVertical: Spacing.xxl,
  },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginBottom: 8 },
  balanceAmount: { fontSize: 36, fontWeight: '800', color: '#fff', marginBottom: 4 },
  jobsRemaining: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: Spacing.md },
  jobStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.lg,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  rechargeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  rechargeBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  tabBar: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    marginTop: Spacing.xl, marginHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg, padding: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: BorderRadius.md },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: '#fff' },
  list: { padding: Spacing.xl, gap: 2 },
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  txIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  txContent: { flex: 1 },
  txDesc: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary, marginBottom: 2 },
  txDate: { fontSize: 12, color: Colors.textSecondary },
  txAmount: { fontSize: 15, fontWeight: '700' },
});
