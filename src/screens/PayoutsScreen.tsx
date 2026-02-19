import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { fetchPayouts } from '../store/payoutSlice';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { formatCurrency, formatDateOnly } from '../utils/format';
import { Loader } from '../components/common/Loader';
import { EmptyState } from '../components/common/EmptyState';
import { Payout } from '../types';

const statusColor = (s: string) => {
  if (s === 'paid') return Colors.success;
  if (s === 'pending') return Colors.warning;
  if (s === 'failed') return Colors.error;
  return Colors.textSecondary;
};

export const PayoutsScreen = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { items, status } = useAppSelector((s) => s.payouts);
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => { dispatch(fetchPayouts()); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchPayouts());
    setRefreshing(false);
  };

  const totalPaid = items.filter((p) => p.status === 'paid').reduce((a, p) => a + p.amount, 0);
  const totalPending = items.filter((p) => p.status === 'pending').reduce((a, p) => a + p.amount, 0);

  if (status === 'loading' && items.length === 0) return <Loader text="Loading payouts..." />;

  const renderItem = ({ item }: { item: Payout }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View>
          <Text style={styles.reference}>{item.reference}</Text>
          <Text style={styles.period}>
            {formatDateOnly(item.periodStart)} – {formatDateOnly(item.periodEnd)}
          </Text>
        </View>
        <View style={styles.amountWrap}>
          <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Payouts</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Paid</Text>
          <Text style={[styles.summaryValue, { color: Colors.success }]}>{formatCurrency(totalPaid)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Pending</Text>
          <Text style={[styles.summaryValue, { color: Colors.warning }]}>{formatCurrency(totalPending)}</Text>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        ListEmptyComponent={<EmptyState icon="card-outline" title="No payouts yet" subtitle="Completed jobs will appear here" />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingTop: 56, paddingBottom: Spacing.md,
  },
  backBtn: { padding: 4 },
  navTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  summaryRow: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  summaryCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  summaryLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  summaryValue: { fontSize: 22, fontWeight: '800' },
  list: { paddingHorizontal: Spacing.xl, gap: Spacing.md, paddingBottom: 24 },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  reference: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  period: { fontSize: 12, color: Colors.textSecondary },
  amountWrap: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: '700' },
});
