import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { accountingApi } from '../api/accountingApi';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { formatCurrency, formatDate } from '../utils/format';
import { ProfessionalAccountingSummary, ProfessionalBookingEarning, ProfessionalMonthlyEarning, TodayBooking } from '../types';
import { Loader } from '../components/common/Loader';

type Tab = 'today' | 'history' | 'monthly';

export const EarningsScreen = () => {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [summary, setSummary] = useState<ProfessionalAccountingSummary | null>(null);
  const [earnings, setEarnings] = useState<ProfessionalBookingEarning[]>([]);
  const [monthly, setMonthly] = useState<ProfessionalMonthlyEarning[]>([]);
  const [today, setToday] = useState<TodayBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [s, e, m, t] = await Promise.all([
        accountingApi.getSummary(),
        accountingApi.getEarnings(),
        accountingApi.getMonthlyEarnings(6),
        accountingApi.getTodayBookings(),
      ]);
      setSummary(s?.data || s);
      const earningsList = e?.data || e?.earnings || e || [];
      setEarnings(Array.isArray(earningsList) ? earningsList : []);
      const monthlyList = m?.data || m?.months || m || [];
      setMonthly(Array.isArray(monthlyList) ? monthlyList : []);
      const todayList = t?.data || t?.bookings || t || [];
      setToday(Array.isArray(todayList) ? todayList : []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (loading) return <Loader text="Loading earnings..." />;

  const maxMonthlyEarning = Math.max(...monthly.map((m) => m.earnings), 1);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Earnings & Jobs</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Payouts')}>
          <Text style={styles.payoutsLink}>Payouts →</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        contentContainerStyle={styles.scroll}
      >
        {/* Summary Cards */}
        {summary && (
          <View style={styles.summaryGrid}>
            <SummaryCard label="Total Earnings" value={formatCurrency(summary.totalEarnings)} color={Colors.success} icon="cash-outline" />
            <SummaryCard label="Pending Payout" value={formatCurrency(summary.pendingPayout)} color={Colors.warning} icon="time-outline" />
            <SummaryCard label="Paid Out" value={formatCurrency(summary.paidOut)} color={Colors.primary} icon="card-outline" />
            <SummaryCard label="Avg Per Job" value={formatCurrency(summary.averageEarningsPerJob)} color={Colors.purple} icon="trending-up-outline" />
          </View>
        )}

        {/* Rating */}
        {summary && (
          <View style={styles.ratingCard}>
            <View style={styles.ratingLeft}>
              <Text style={styles.ratingValue}>{summary.rating.toFixed(1)}</Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Ionicons
                    key={s}
                    name={s <= Math.round(summary.rating) ? 'star' : 'star-outline'}
                    size={14}
                    color={Colors.warning}
                  />
                ))}
              </View>
              <Text style={styles.ratingReviews}>{summary.reviewCount} reviews</Text>
            </View>
            <View style={styles.ratingRight}>
              <StatPill label="Completed" value={summary.completedBookings} color={Colors.success} />
              <StatPill label="Cancelled" value={summary.cancelledBookings} color={Colors.error} />
              <StatPill label="Total" value={summary.totalBookings} color={Colors.primary} />
            </View>
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          {([
            { key: 'today', label: "Today's Jobs" },
            { key: 'history', label: 'History' },
            { key: 'monthly', label: 'Monthly' },
          ] as { key: Tab; label: string }[]).map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, activeTab === t.key && styles.tabActive]}
              onPress={() => setActiveTab(t.key)}
            >
              <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Today's Jobs */}
        {activeTab === 'today' && (
          <View style={styles.section}>
            {today.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="calendar-outline" size={36} color={Colors.gray300} />
                <Text style={styles.emptyText}>No jobs scheduled today</Text>
              </View>
            ) : (
              today.map((job) => (
                <View key={job.bookingId} style={styles.todayCard}>
                  <View style={styles.todayTop}>
                    <View>
                      <Text style={styles.todayCustomer}>{job.customerName}</Text>
                      <Text style={styles.todayService}>{job.serviceName}</Text>
                      <Text style={styles.todayTime}>
                        {new Date(job.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <View style={styles.todayRight}>
                      <Text style={styles.todayEarnings}>{formatCurrency(job.earnings)}</Text>
                      {job.customerPhone && (
                        <Text style={styles.todayPhone}>{job.customerPhone}</Text>
                      )}
                    </View>
                  </View>

                  {/* OTP Codes */}
                  {(job.startOtp || job.completionOtp) && (
                    <View style={styles.otpRow}>
                      {job.startOtp && (
                        <View style={styles.otpBox}>
                          <Text style={styles.otpBoxLabel}>Start OTP</Text>
                          <Text style={styles.otpBoxValue}>{job.startOtp}</Text>
                        </View>
                      )}
                      {job.completionOtp && (
                        <View style={[styles.otpBox, { backgroundColor: Colors.successBg }]}>
                          <Text style={[styles.otpBoxLabel, { color: Colors.success }]}>Complete OTP</Text>
                          <Text style={[styles.otpBoxValue, { color: Colors.success }]}>{job.completionOtp}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* History */}
        {activeTab === 'history' && (
          <View style={styles.section}>
            {earnings.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No earnings history</Text>
              </View>
            ) : (
              earnings.map((e) => (
                <View key={e.bookingId} style={styles.historyRow}>
                  <View style={styles.historyLeft}>
                    <Text style={styles.historyCustomer}>{e.customerName}</Text>
                    <Text style={styles.historyService}>{e.serviceName}</Text>
                    <Text style={styles.historyDate}>{formatDate(e.scheduledAt)}</Text>
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={styles.historyEarnings}>{formatCurrency(e.earnings)}</Text>
                    <Text style={styles.historyCommission}>-{formatCurrency(e.commission)} fee</Text>
                    <View style={[styles.historyStatus, { backgroundColor: e.status === 'completed' ? Colors.successBg : Colors.cancelledBg }]}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: e.status === 'completed' ? Colors.success : Colors.error }}>
                        {e.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Monthly */}
        {activeTab === 'monthly' && (
          <View style={styles.section}>
            <Text style={styles.chartTitle}>Last 6 Months</Text>
            {monthly.map((m) => (
              <View key={m.month} style={styles.barRow}>
                <Text style={styles.barMonth}>{m.month}</Text>
                <View style={styles.barWrap}>
                  <View style={[styles.barFill, { width: `${(m.earnings / maxMonthlyEarning) * 100}%` }]} />
                </View>
                <Text style={styles.barValue}>{formatCurrency(m.earnings)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const SummaryCard = ({ label, value, color, icon }: { label: string; value: string; color: string; icon: any }) => (
  <View style={[styles.summaryCard, { borderTopColor: color, borderTopWidth: 3 }]}>
    <Ionicons name={icon} size={18} color={color} style={{ marginBottom: 4 }} />
    <Text style={[styles.summaryValue, { color }]}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const StatPill = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <View style={styles.statPill}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingTop: 56, paddingBottom: Spacing.md,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  payoutsLink: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.xl },
  summaryCard: {
    width: '47%', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  summaryValue: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  summaryLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  ratingCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xl, marginBottom: Spacing.xl,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  ratingLeft: { alignItems: 'center' },
  ratingValue: { fontSize: 36, fontWeight: '800', color: Colors.textPrimary },
  stars: { flexDirection: 'row', gap: 2, marginVertical: 4 },
  ratingReviews: { fontSize: 11, color: Colors.textSecondary },
  ratingRight: { flex: 1, gap: 8 },
  statPill: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 13, color: Colors.textSecondary },
  tabs: {
    flexDirection: 'row', backgroundColor: Colors.gray100, borderRadius: BorderRadius.md,
    padding: 3, marginBottom: Spacing.xl,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: BorderRadius.sm },
  tabActive: { backgroundColor: Colors.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  tabText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary },
  section: { gap: Spacing.md },
  todayCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
    borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  todayTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
  todayCustomer: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  todayService: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  todayTime: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  todayRight: { alignItems: 'flex-end' },
  todayEarnings: { fontSize: 20, fontWeight: '800', color: Colors.success },
  todayPhone: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  otpRow: { flexDirection: 'row', gap: Spacing.md },
  otpBox: {
    flex: 1, backgroundColor: Colors.primaryBg, borderRadius: BorderRadius.md,
    padding: Spacing.md, alignItems: 'center',
  },
  otpBoxLabel: { fontSize: 10, fontWeight: '600', color: Colors.primary, marginBottom: 2 },
  otpBoxValue: { fontSize: 22, fontWeight: '800', color: Colors.primary, letterSpacing: 4 },
  historyRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  historyLeft: { flex: 1, marginRight: 8 },
  historyCustomer: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  historyService: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  historyDate: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  historyRight: { alignItems: 'flex-end', gap: 3 },
  historyEarnings: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  historyCommission: { fontSize: 11, color: Colors.error },
  historyStatus: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  emptyBox: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { fontSize: 14, color: Colors.textTertiary },
  chartTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  barMonth: { width: 50, fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  barWrap: { flex: 1, height: 10, backgroundColor: Colors.gray100, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 5 },
  barValue: { width: 72, fontSize: 12, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right' },
});
