import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { fetchPayouts } from '../store/payoutSlice';
import { fetchAccountingSummary } from '../store/accountingSlice';
import { accountingApi } from '../api/accountingApi';
import { creditApi } from '../api/creditApi';
import { useDebouncedRefresh } from '../hooks/useDebouncedRefresh';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { formatCurrency, formatDateOnly } from '../utils/format';
import { ProfessionalMonthlyEarning } from '../types';
import { Loader } from '../components/common/Loader';

export const EarningsScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { items: payouts } = useAppSelector((s) => s.payouts);
  const { summary } = useAppSelector((s) => s.accounting);

  const [monthlyData, setMonthlyData] = useState<ProfessionalMonthlyEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
  const [expandEarnings, setExpandEarnings] = useState(true);
  const [expandDeductions, setExpandDeductions] = useState(true);
  const [pendingDeductionAmount, setPendingDeductionAmount] = useState(0);

  const load = async () => {
    try {
      dispatch(fetchAccountingSummary());
      dispatch(fetchPayouts());

      const m = await accountingApi.getMonthlyEarnings(7);
      const monthlyList = m?.data || m?.months || m || [];
      const sortedData = Array.isArray(monthlyList)
        ? monthlyList.sort((a: ProfessionalMonthlyEarning, b: ProfessionalMonthlyEarning) =>
          b.month.localeCompare(a.month))
        : [];
      setMonthlyData(sortedData);

      // Fetch pending cash deductions (partner received cash but hasn't paid back)
      try {
        const txResp = await creditApi.getCreditTransactions({ type: 'job_deduction' });
        const txList = txResp?.data?.transactions || [];
        const pendingTotal = txList
          .filter((t: any) => t.status === 'pending')
          .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
        setPendingDeductionAmount(pendingTotal);
      } catch (_) {
        // pending deductions unavailable
      }
    } catch (err) {
      console.error('Failed to load earnings:', err);
    }
    setLoading(false);
  };

  const loadForced = async () => {
    try {
      dispatch(fetchAccountingSummary(true));
      dispatch(fetchPayouts(true));
      const m = await accountingApi.getMonthlyEarnings(7);
      const monthlyList = m?.data || m?.months || m || [];
      const sortedData = Array.isArray(monthlyList)
        ? monthlyList.sort((a: ProfessionalMonthlyEarning, b: ProfessionalMonthlyEarning) =>
          b.month.localeCompare(a.month))
        : [];
      setMonthlyData(sortedData);
    } catch (err) {
      console.error('Failed to load earnings:', err);
    }
  };

  useEffect(() => { load(); }, []);

  const debouncedRefresh = useDebouncedRefresh(loadForced);

  const onRefresh = async () => {
    setRefreshing(true);
    await debouncedRefresh();
    setRefreshing(false);
  };

  if (loading) return <Loader text="Loading earnings..." />;

  // ── selected month ──────────────────────────────────────────
  const selectedMonth = monthlyData[selectedMonthIndex] || monthlyData[0];
  const selectedMonthEarnings = selectedMonth?.earnings || 0;
  const selectedMonthCommission = selectedMonth?.commission || 0;
  const selectedMonthServiceTaxes = selectedMonth?.serviceTaxes || 0;
  const selectedMonthTotalPaid = selectedMonth?.totalPaid || 0;
  const selectedMonthName = selectedMonth?.month || '';

  const customerPaid = selectedMonthTotalPaid;
  const revenueToSplit = selectedMonthEarnings + selectedMonthCommission;
  const platformFee = selectedMonthCommission;          // Paid to Homelyo
  const grossEarnings = selectedMonthEarnings;
  const gstAmount = grossEarnings * 0.18;               // GST on professional's earnings
  const serviceTax = selectedMonthServiceTaxes;
  const totalDeductions = platformFee + serviceTax + gstAmount;
  const paidToGovernment = serviceTax + gstAmount;
  const netEarnings = customerPaid - totalDeductions;
  // Job Value ≈ revenue to split (customer paid minus service tax)
  const jobValue = revenueToSplit;
  const cancellationIncentive = 0; // placeholder — no data field yet

  // ── month helpers ────────────────────────────────────────────
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const formatMonthTitle = (monthStr: string) => {
    if (!monthStr) return 'This Month';
    const [year, mon] = monthStr.split('-');
    const fullNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return `${fullNames[parseInt(mon) - 1]} ${year}`;
  };

  const goToPrevMonth = () => {
    if (selectedMonthIndex < monthlyData.length - 1)
      setSelectedMonthIndex(selectedMonthIndex + 1);
  };
  const goToNextMonth = () => {
    if (selectedMonthIndex > 0)
      setSelectedMonthIndex(selectedMonthIndex - 1);
  };

  // ── bar chart ─────────────────────────────────────────────────
  const monthlyChartData = [...monthlyData].reverse().map((m) => {
    const [, mon] = m.month.split('-');
    return { label: monthNames[parseInt(mon) - 1], amount: m.totalPaid || 0, monthKey: m.month };
  });
  const maxMonthlyAmount = Math.max(...monthlyChartData.map(d => d.amount), 1);

  // ── payouts ───────────────────────────────────────────────────
  const allPayouts = [...payouts].sort(
    (a, b) => new Date(b.periodEnd).getTime() - new Date(a.periodEnd).getTime()
  );

  const getPayoutStatus = (status: string) => {
    if (status === 'paid') return { label: 'Success', color: Colors.success };
    if (status === 'processing') return { label: 'Processing', color: '#F59E0B' };
    return { label: 'Upcoming', color: Colors.textSecondary };
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Month Navigation Header ── */}
        <View style={styles.monthNav}>
          <TouchableOpacity
            onPress={goToPrevMonth}
            disabled={selectedMonthIndex >= monthlyData.length - 1}
            style={[styles.navArrow, selectedMonthIndex >= monthlyData.length - 1 && styles.navArrowDisabled]}
          >
            <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{formatMonthTitle(selectedMonthName)}</Text>
          <TouchableOpacity
            onPress={goToNextMonth}
            disabled={selectedMonthIndex <= 0}
            style={[styles.navArrow, selectedMonthIndex <= 0 && styles.navArrowDisabled]}
          >
            <Ionicons name="chevron-forward" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* ── Bar Chart ── */}
        <View style={styles.chartCard}>
          <View style={styles.chartContainer}>
            {monthlyChartData.map((mon, index) => {
              const barHeight = (mon.amount / maxMonthlyAmount) * 70;
              const actualIndex = monthlyData.length - 1 - index;
              const isSelected = selectedMonthIndex === actualIndex;
              return (
                <TouchableOpacity
                  key={mon.monthKey}
                  style={styles.barColumn}
                  onPress={() => setSelectedMonthIndex(actualIndex)}
                  activeOpacity={0.7}
                >
                  <View style={styles.barWrapper}>
                    <View
                      style={[
                        styles.bar,
                        { height: Math.max(barHeight, 4), backgroundColor: isSelected ? Colors.primary : Colors.primaryBg },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barLabel, isSelected && { color: Colors.primary, fontWeight: '700' }]}>
                    {mon.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Total Earnings Row ── */}
        <View style={styles.earningsBlock}>
          <TouchableOpacity
            style={styles.summaryRow}
            onPress={() => setExpandEarnings(!expandEarnings)}
            activeOpacity={0.8}
          >
            <View style={styles.iconBg}>
              <Ionicons name="arrow-down" size={20} color={Colors.success} />
            </View>
            <View style={styles.summaryText}>
              <Text style={styles.summaryAmount}>{formatCurrency(customerPaid)}</Text>
              <Text style={styles.summaryLabel}>Total Earnings</Text>
            </View>
            <Ionicons
              name={expandEarnings ? 'chevron-up' : 'chevron-down'}
              size={20} color={Colors.textSecondary}
            />
          </TouchableOpacity>

          {expandEarnings && (
            <View style={styles.expandedRows}>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.detailRow} activeOpacity={0.7}
                onPress={() => navigation.navigate('Payouts')}>
                <Text style={styles.detailLabel}>Job Value</Text>
                <View style={styles.detailRight}>
                  <Text style={styles.detailValue}>{formatCurrency(jobValue)}</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
                </View>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.detailRow} activeOpacity={0.7}>
                <Text style={styles.detailLabel}>Cancellation incentive</Text>
                <View style={styles.detailRight}>
                  <Text style={styles.detailValue}>{formatCurrency(cancellationIncentive)}</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Total Deductions Row ── */}
        <View style={[styles.earningsBlock, styles.deductionsBlock]}>
          <TouchableOpacity
            style={styles.summaryRow}
            onPress={() => setExpandDeductions(!expandDeductions)}
            activeOpacity={0.8}
          >
            <View style={[styles.iconBg, styles.iconBgOrange]}>
              <Ionicons name="arrow-up" size={20} color="#F97316" />
            </View>
            <View style={styles.summaryText}>
              <Text style={[styles.summaryAmount, { color: '#F97316' }]}>
                -{formatCurrency(totalDeductions)}
              </Text>
              <Text style={styles.summaryLabel}>Total Deductions</Text>
            </View>
            <Ionicons
              name={expandDeductions ? 'chevron-up' : 'chevron-down'}
              size={20} color={Colors.textSecondary}
            />
          </TouchableOpacity>

          {expandDeductions && (
            <View style={styles.expandedRows}>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.detailRow} activeOpacity={0.7}
                onPress={() => navigation.navigate('Payouts')}>
                <Text style={styles.detailLabel}>Paid to Homelyo</Text>
                <View style={styles.detailRight}>
                  <Text style={[styles.detailValue, { color: '#F97316' }]}>
                    -{formatCurrency(platformFee)}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
                </View>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.detailRow} activeOpacity={0.7}>
                <Text style={styles.detailLabel}>Paid to Government</Text>
                <View style={styles.detailRight}>
                  <Text style={[styles.detailValue, { color: '#F97316' }]}>
                    -{formatCurrency(paidToGovernment)}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Net Earnings Row ── */}
        <View style={[styles.earningsBlock, styles.netBlock]}>
          <View style={styles.summaryRow}>
            <View style={[styles.iconBg, styles.iconBgBlue]}>
              <Ionicons name="hand-left" size={20} color="#6366F1" />
            </View>
            <View style={styles.summaryText}>
              <Text style={[styles.summaryAmount, { color: Colors.textPrimary }]}>
                {formatCurrency(netEarnings)}
              </Text>
              <Text style={styles.summaryLabel}>Net Earnings</Text>
            </View>
          </View>
        </View>

        {/* ── Bank Transfers ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Bank transfers</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Payouts')} style={styles.sectionLink}>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {allPayouts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="wallet-outline" size={40} color={Colors.gray300} />
            <Text style={styles.emptyText}>No bank transfers yet</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.bankCardsScroll}
          >
            {allPayouts.slice(0, 8).map((payout) => {
              const st = getPayoutStatus(payout.status);
              return (
                <TouchableOpacity
                  key={payout.id}
                  style={styles.bankCard}
                  onPress={() => navigation.navigate('Payouts')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.bankCardAmount}>{formatCurrency(payout.amount)}</Text>
                  <Text style={styles.bankCardDate}>
                    {formatDateOnly(payout.periodStart).replace(/\d{4}/, '').trim().replace(',', '')} -{' '}
                    {formatDateOnly(payout.periodEnd).replace(/\d{4}/, '').trim().replace(',', '')}
                  </Text>
                  <Text style={[styles.bankCardStatus, { color: st.color }]}>{st.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ── Pending Deductions ── */}
        {pendingDeductionAmount > 0 && (
          <View style={styles.pendingRow}>
            <View style={styles.pendingLeft}>
              <View style={styles.pendingIconBg}>
                <Ionicons name="timer-outline" size={22} color={Colors.textSecondary} />
              </View>
              <View>
                <Text style={styles.pendingLabel}>PENDING DEDUCTIONS</Text>
                <Text style={styles.pendingAmount}>{formatCurrency(pendingDeductionAmount)}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.payNowBtn}
              onPress={() => navigation.navigate('Credits')}
              activeOpacity={0.85}
            >
              <Text style={styles.payNowText}>Pay now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Overview ── */}
        {summary && (
          <View style={styles.overviewSection}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                <Text style={styles.statValue}>{summary.completedBookings}</Text>
                <Text style={styles.statLabel}>Completed Jobs</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="trending-up" size={20} color={Colors.primary} />
                <Text style={styles.statValue}>{formatCurrency(summary.averageEarningsPerJob)}</Text>
                <Text style={styles.statLabel}>Avg per Job</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="star" size={20} color={Colors.warning} />
                <Text style={styles.statValue}>{summary.rating.toFixed(1)}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingTop: Spacing.md,
    paddingBottom: 100,
  },

  // ── Month Navigation
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    gap: Spacing.lg,
  },
  navArrow: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  navArrowDisabled: {
    opacity: 0.3,
  },
  monthTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  // ── Bar Chart
  chartCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.xl,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 90,
    gap: 4,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barWrapper: {
    width: '100%',
    height: 70,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '65%',
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    marginTop: 6,
    fontSize: 10,
    color: Colors.textTertiary,
    fontWeight: '500',
  },

  // ── Earnings / Deductions / Net blocks
  earningsBlock: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.xl,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  deductionsBlock: {
    // same shape, different icon color handled inline
  },
  netBlock: {
    marginBottom: Spacing.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBgOrange: {
    backgroundColor: '#FEF3C7',
  },
  iconBgBlue: {
    backgroundColor: '#EEF2FF',
  },
  summaryText: {
    flex: 1,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.success,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  // ── Expanded detail rows
  expandedRows: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  detailRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
  },

  // ── Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sectionLink: {
    padding: 4,
  },

  // ── Bank Transfer Cards
  bankCardsScroll: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  bankCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: 150,
    borderWidth: 1,
    borderColor: Colors.divider,
    gap: 6,
  },
  bankCardAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  bankCardDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  bankCardStatus: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },

  // ── Pending Deductions
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  pendingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  pendingIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.divider,
    borderStyle: 'dashed',
  },
  pendingLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  pendingAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  payNowBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  payNowText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // ── Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  // ── Overview
  overviewSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
