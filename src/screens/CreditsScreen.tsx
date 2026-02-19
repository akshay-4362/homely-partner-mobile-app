import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { Card } from '../components/common/Card';
import { Loader } from '../components/common/Loader';
import { EmptyState } from '../components/common/EmptyState';
import { formatCurrency, formatDate } from '../utils/format';
import apiClient from '../api/client';

type Tab = 'all' | 'recharges' | 'expenses' | 'penalties';

interface CreditTransaction {
  _id: string;
  type: 'credit' | 'debit';
  category: 'recharge' | 'expense' | 'penalty' | 'bonus';
  amount: number;
  description: string;
  createdAt: string;
  balance?: number;
}

export const CreditsScreen = () => {
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<Tab>('all');
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiClient.get('/professional/credits');
      const data = res.data?.data || res.data || {};
      setBalance(data.balance ?? 0);
      setTransactions(data.transactions ?? []);
    } catch {
      // Use demo data if API not available
      setBalance(1250);
      setTransactions(DEMO_TRANSACTIONS);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => { setRefreshing(true); load(true); };

  const filtered = transactions.filter((t) => {
    if (tab === 'all') return true;
    if (tab === 'recharges') return t.category === 'recharge' || t.category === 'bonus';
    if (tab === 'expenses') return t.category === 'expense';
    if (tab === 'penalties') return t.category === 'penalty';
    return true;
  });

  const TABS: { id: Tab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'recharges', label: 'Recharges' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'penalties', label: 'Penalties' },
  ];

  if (loading) return <Loader text="Loading credits..." />;

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
          <TouchableOpacity style={styles.rechargeBtn}>
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
    </View>
  );
};

const TransactionRow = ({ item }: { item: CreditTransaction }) => {
  const isCredit = item.type === 'credit';
  const iconMap: Record<string, any> = {
    recharge: 'add-circle',
    bonus: 'star',
    expense: 'remove-circle',
    penalty: 'warning',
  };
  const colorMap: Record<string, string> = {
    recharge: Colors.success,
    bonus: Colors.warning,
    expense: Colors.error,
    penalty: Colors.error,
  };
  const icon = iconMap[item.category] || 'ellipse';
  const color = colorMap[item.category] || Colors.textSecondary;

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

const DEMO_TRANSACTIONS: CreditTransaction[] = [
  { _id: '1', type: 'credit', category: 'recharge', amount: 500, description: 'Credit recharge via UPI', createdAt: new Date(Date.now() - 86400000).toISOString() },
  { _id: '2', type: 'debit', category: 'expense', amount: 50, description: 'Platform fee - Booking #1234', createdAt: new Date(Date.now() - 172800000).toISOString() },
  { _id: '3', type: 'credit', category: 'bonus', amount: 100, description: 'Performance bonus - 5 star week', createdAt: new Date(Date.now() - 259200000).toISOString() },
  { _id: '4', type: 'debit', category: 'penalty', amount: 200, description: 'Cancellation penalty - Booking #1198', createdAt: new Date(Date.now() - 345600000).toISOString() },
  { _id: '5', type: 'credit', category: 'recharge', amount: 1000, description: 'Credit recharge via NEFT', createdAt: new Date(Date.now() - 432000000).toISOString() },
  { _id: '6', type: 'debit', category: 'expense', amount: 100, description: 'Lead purchase - AC repair', createdAt: new Date(Date.now() - 518400000).toISOString() },
];

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
  balanceAmount: { fontSize: 36, fontWeight: '800', color: '#fff', marginBottom: Spacing.lg },
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
