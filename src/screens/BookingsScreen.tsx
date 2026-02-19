import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { fetchProBookings } from '../store/bookingSlice';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { formatCurrency, formatDate } from '../utils/format';
import { Badge } from '../components/common/Badge';
import { Loader } from '../components/common/Loader';
import { EmptyState } from '../components/common/EmptyState';
import { ProBooking } from '../types';

type TabKey = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

const TABS: { key: TabKey; label: string; statuses: string[] }[] = [
  { key: 'upcoming', label: 'Upcoming', statuses: ['confirmed'] },
  { key: 'ongoing', label: 'Ongoing', statuses: ['in_progress'] },
  { key: 'completed', label: 'Completed', statuses: ['completed'] },
  { key: 'cancelled', label: 'Cancelled', statuses: ['cancelled', 'cancellation_pending'] },
];

export const BookingsScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { items, status } = useAppSelector((s) => s.bookings);
  const [activeTab, setActiveTab] = useState<TabKey>('upcoming');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { dispatch(fetchProBookings()); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchProBookings());
    setRefreshing(false);
  };

  const filtered = items.filter((b) =>
    TABS.find((t) => t.key === activeTab)?.statuses.includes(b.status)
  );

  // Count badges
  const counts = TABS.reduce((acc, t) => {
    acc[t.key] = items.filter((b) => t.statuses.includes(b.status)).length;
    return acc;
  }, {} as Record<TabKey, number>);

  const renderItem = ({ item }: { item: ProBooking }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('BookingDetail', { booking: item })}
      activeOpacity={0.7}
    >
      {/* Top row */}
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.bookingNum}>#{item.bookingNumber}</Text>
          <Text style={styles.serviceName}>{item.serviceName}</Text>
        </View>
        <Badge status={item.status} label={item.status} />
      </View>

      {/* Customer */}
      <View style={styles.customerRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.customerName[0]}</Text>
        </View>
        <View>
          <Text style={styles.customerName}>{item.customerName}</Text>
          <Text style={styles.dateText}>{formatDate(item.scheduledAt)}</Text>
        </View>
      </View>

      {/* Address */}
      {item.addressLine && (
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={14} color={Colors.textTertiary} />
          <Text style={styles.addressText} numberOfLines={1}>{item.addressLine}</Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.jobValue}>Job Value</Text>
          <Text style={styles.amount}>{formatCurrency(item.total)}</Text>
          {item.additionalChargesTotal > 0 && (
            <Text style={styles.extraCharges}>+{formatCurrency(item.additionalChargesTotal)} extra</Text>
          )}
        </View>
        <View style={styles.footerRight}>
          {item.paymentMethod === 'pay_later' && (
            <View style={styles.payLaterBadge}>
              <Text style={styles.payLaterText}>Pay Later</Text>
            </View>
          )}
          {item.paymentStatus === 'succeeded' && (
            <View style={styles.paidBadge}>
              <Text style={styles.paidText}>Paid Online</Text>
            </View>
          )}
          <View style={styles.viewBtn}>
            <Text style={styles.viewText}>View Details</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (status === 'loading' && items.length === 0) return <Loader text="Loading bookings..." />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Jobs</Text>
        <TouchableOpacity onPress={() => dispatch(fetchProBookings())}>
          <Ionicons name="refresh" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={TABS}
          keyExtractor={(t) => t.key}
          contentContainerStyle={styles.tabs}
          renderItem={({ item: tab }) => (
            <TouchableOpacity
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {counts[tab.key] > 0 && (
                <View style={[styles.tabCount, activeTab === tab.key && styles.tabCountActive]}>
                  <Text style={[styles.tabCountText, activeTab === tab.key && styles.tabCountTextActive]}>
                    {counts[tab.key]}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        ListEmptyComponent={
          <EmptyState
            icon="briefcase-outline"
            title={`No ${activeTab} jobs`}
            subtitle="Pull down to refresh"
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingTop: 56, paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  tabsWrap: { backgroundColor: Colors.background },
  tabs: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md, gap: Spacing.sm },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: BorderRadius.full, backgroundColor: Colors.gray100,
  },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: Colors.textInverse },
  tabCount: {
    minWidth: 18, height: 18, borderRadius: 9, backgroundColor: Colors.gray300,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  tabCountText: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary },
  tabCountTextActive: { color: Colors.textInverse },
  list: { paddingHorizontal: Spacing.xl, paddingBottom: 24, gap: Spacing.md },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  cardLeft: { flex: 1, marginRight: 8 },
  bookingNum: { fontSize: 11, fontWeight: '600', color: Colors.textTertiary, marginBottom: 2 },
  serviceName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  avatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  customerName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  dateText: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.md },
  addressText: { fontSize: 12, color: Colors.textSecondary, flex: 1 },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.divider,
  },
  jobValue: { fontSize: 11, color: Colors.textTertiary, marginBottom: 2 },
  amount: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  extraCharges: { fontSize: 11, color: Colors.success, marginTop: 2 },
  footerRight: { alignItems: 'flex-end', gap: 6 },
  payLaterBadge: { backgroundColor: Colors.warningBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  payLaterText: { fontSize: 11, color: Colors.warning, fontWeight: '600' },
  paidBadge: { backgroundColor: Colors.successBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  paidText: { fontSize: 11, color: Colors.success, fontWeight: '600' },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
});
