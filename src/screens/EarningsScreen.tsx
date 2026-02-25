import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity,
  Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { fetchPayouts } from '../store/payoutSlice';
import { fetchAccountingSummary, fetchMonthlyEarnings } from '../store/accountingSlice';
import { accountingApi } from '../api/accountingApi';
import { useDebouncedRefresh } from '../hooks/useDebouncedRefresh';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { formatCurrency, formatDateOnly } from '../utils/format';
import { ProfessionalMonthlyEarning } from '../types';
import { Loader } from '../components/common/Loader';

export const EarningsScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { items: payouts, status: payoutsStatus } = useAppSelector((s) => s.payouts);
  const { summary, monthlyEarnings } = useAppSelector((s) => s.accounting);

  const [monthlyData, setMonthlyData] = useState<ProfessionalMonthlyEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0); // 0 = current month

  const load = async () => {
    try {
      dispatch(fetchAccountingSummary());
      dispatch(fetchPayouts());

      // Fetch 6 months data (not cached yet, can be added later if needed)
      const m = await accountingApi.getMonthlyEarnings(6);
      const monthlyList = m?.data || m?.months || m || [];
      // Sort by month descending (most recent first)
      const sortedData = Array.isArray(monthlyList)
        ? monthlyList.sort((a, b) => b.month.localeCompare(a.month))
        : [];
      setMonthlyData(sortedData);
    } catch (err) {
      console.error('Failed to load earnings:', err);
    }
    setLoading(false);
  };

  const loadForced = async () => {
    try {
      dispatch(fetchAccountingSummary(true));
      dispatch(fetchPayouts(true));

      const m = await accountingApi.getMonthlyEarnings(6);
      const monthlyList = m?.data || m?.months || m || [];
      // Sort by month descending (most recent first)
      const sortedData = Array.isArray(monthlyList)
        ? monthlyList.sort((a, b) => b.month.localeCompare(a.month))
        : [];
      setMonthlyData(sortedData);
    } catch (err) {
      console.error('Failed to load earnings:', err);
    }
  };

  useEffect(() => { load(); }, []);

  // No need for daily data - we'll use monthly data for the chart

  const debouncedRefresh = useDebouncedRefresh(loadForced);

  const onRefresh = async () => {
    setRefreshing(true);
    await debouncedRefresh();
    setRefreshing(false);
  };

  if (loading) return <Loader text="Loading earnings..." />;

  // Get selected month data
  const selectedMonth = monthlyData[selectedMonthIndex] || monthlyData[0];
  const selectedMonthEarnings = selectedMonth?.earnings || 0;
  const selectedMonthCommission = selectedMonth?.commission || 0;
  const selectedMonthServiceTaxes = selectedMonth?.serviceTaxes || 0;
  const selectedMonthTotalPaid = selectedMonth?.totalPaid || 0;
  const selectedMonthName = selectedMonth?.month || 'This Month';

  // Calculate breakdown for selected month
  // selectedMonthTotalPaid = total amount customer paid (including service tax)
  // selectedMonthServiceTaxes = GST on services (goes to government, not split)
  // Revenue to split = totalPaid - serviceTaxes (what's split between platform and professional)
  // selectedMonthCommission = platform's commission (10% of revenue to split)
  // selectedMonthEarnings = professional's payout (90% of revenue to split)
  const customerPaid = selectedMonthTotalPaid; // Total customer paid
  const serviceTax = selectedMonthServiceTaxes; // Service GST (goes to govt)
  const revenueToSplit = selectedMonthEarnings + selectedMonthCommission; // Amount split between platform & pro
  const platformFee = selectedMonthCommission; // 10% of revenue to split
  const grossEarnings = selectedMonthEarnings; // Professional's share (90% of revenue to split)
  const gstAmount = grossEarnings * 0.18; // 18% GST on professional's earnings
  const totalDeductions = serviceTax + platformFee + gstAmount; // All deductions
  const netEarnings = customerPaid - totalDeductions;

  // Prepare monthly chart data (show last 6 months, oldest to newest for timeline)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyChartData = [...monthlyData]
    .reverse() // Reverse to show oldest to newest (left to right)
    .map((m) => {
      const [year, month] = m.month.split('-');
      const monthIndex = parseInt(month) - 1;
      return {
        label: monthNames[monthIndex],
        amount: m.totalPaid || 0,
        monthKey: m.month,
      };
    });

  const maxMonthlyAmount = Math.max(...monthlyChartData.map(d => d.amount), 1);

  // Categorize payouts
  const upcomingPayouts = payouts.filter(p => p.status === 'pending');
  const processingPayouts = payouts.filter(p => p.status === 'processing');
  const paidPayouts = payouts.filter(p => p.status === 'paid');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        contentContainerStyle={styles.scroll}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Money</Text>
        </View>

        {/* Month Selector */}
        <View style={styles.monthSelector}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.monthScrollContent}
          >
            {monthlyData.map((month, index) => {
              // Format: "2026-02" -> "Feb 2026"
              const [year, monthNum] = month.month.split('-');
              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const monthName = monthNames[parseInt(monthNum) - 1];
              const displayText = `${monthName} ${year}`;

              return (
                <TouchableOpacity
                  key={month.month}
                  style={[
                    styles.monthChip,
                    selectedMonthIndex === index && styles.monthChipActive
                  ]}
                  onPress={() => setSelectedMonthIndex(index)}
                >
                  <Text
                    style={[
                      styles.monthChipText,
                      selectedMonthIndex === index && styles.monthChipTextActive
                    ]}
                  >
                    {displayText}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Main Earnings Card */}
        <View style={styles.earningsCard}>
          <TouchableOpacity
            style={styles.earningsTop}
            onPress={() => navigation.navigate('Payouts')}
          >
            <View>
              <Text style={styles.mainAmount}>{formatCurrency(customerPaid)}</Text>
              <Text style={styles.mainLabel}>
                {selectedMonthIndex === 0 ? 'Customer paid this month' : `Customer paid in ${selectedMonthName}`}
              </Text>
              <Text style={styles.netLabel}>
                Net to you: {formatCurrency(netEarnings)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          {/* Bar Chart - Monthly */}
          <View style={styles.chartContainer}>
            {monthlyChartData.map((month, index) => {
              const barHeight = (month.amount / maxMonthlyAmount) * 80;
              // Reverse index to match monthlyData order (newest first)
              const actualIndex = monthlyData.length - 1 - index;
              const isSelected = selectedMonthIndex === actualIndex;

              return (
                <TouchableOpacity
                  key={month.monthKey}
                  style={styles.barColumn}
                  onPress={() => setSelectedMonthIndex(actualIndex)}
                  activeOpacity={0.7}
                >
                  <View style={styles.barWrapper}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(barHeight, 4),
                          backgroundColor: isSelected ? Colors.primary : Colors.primaryBg,
                        }
                      ]}
                    />
                  </View>
                  <Text style={[styles.barLabel, isSelected && { color: Colors.primary, fontWeight: '700' }]}>
                    {month.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Earnings Breakdown Card */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>
            {selectedMonthIndex === 0 ? "This month's breakdown" : `${selectedMonthName} breakdown`}
          </Text>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Customer paid (total)</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(customerPaid)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.breakdownRow}>
            <View style={styles.breakdownLabelWithIcon}>
              <Ionicons name="remove-circle-outline" size={16} color={Colors.error} />
              <Text style={styles.breakdownLabel}>Service tax (GST)</Text>
            </View>
            <Text style={[styles.breakdownValue, styles.deductionValue]}>
              -{formatCurrency(serviceTax)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Revenue to split</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(revenueToSplit)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.breakdownRow}>
            <View style={styles.breakdownLabelWithIcon}>
              <Ionicons name="remove-circle-outline" size={16} color={Colors.error} />
              <Text style={styles.breakdownLabel}>Platform fee (10%)</Text>
            </View>
            <Text style={[styles.breakdownValue, styles.deductionValue]}>
              -{formatCurrency(platformFee)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Your share (90%)</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(grossEarnings)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.breakdownRow}>
            <View style={styles.breakdownLabelWithIcon}>
              <Ionicons name="remove-circle-outline" size={16} color={Colors.error} />
              <Text style={styles.breakdownLabel}>GST on earnings (18%)</Text>
            </View>
            <Text style={[styles.breakdownValue, styles.deductionValue]}>
              -{formatCurrency(gstAmount)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabelBold}>Total deductions</Text>
            <Text style={[styles.breakdownValueBold, styles.deductionValue]}>
              -{formatCurrency(totalDeductions)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabelBold}>Net to your bank</Text>
            <Text style={[styles.breakdownValueBold, { color: Colors.success }]}>
              {formatCurrency(netEarnings)}
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
            <Text style={styles.infoText}>
              Service tax goes to government. Platform takes 10%, you get 90% of remaining amount.
            </Text>
          </View>
        </View>

        {/* Bank Transfers Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bank transfers</Text>

          {/* Upcoming Payouts */}
          {upcomingPayouts.length > 0 && (
            <View style={styles.payoutGroup}>
              {upcomingPayouts.map((payout) => (
                <TouchableOpacity
                  key={payout.id}
                  style={styles.payoutCard}
                  onPress={() => navigation.navigate('Payouts')}
                >
                  <View style={styles.payoutLeft}>
                    <Text style={styles.payoutAmount}>{formatCurrency(payout.amount)}</Text>
                    <Text style={styles.payoutDate}>
                      {formatDateOnly(payout.periodStart).split(' ')[0]} - {formatDateOnly(payout.periodEnd)}
                    </Text>
                  </View>
                  <View style={styles.payoutRight}>
                    <View style={[styles.statusBadge, styles.statusUpcoming]}>
                      <Text style={styles.statusUpcomingText}>Upcoming</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Processing Payouts */}
          {processingPayouts.length > 0 && (
            <View style={styles.payoutGroup}>
              {processingPayouts.map((payout) => (
                <TouchableOpacity
                  key={payout.id}
                  style={styles.payoutCard}
                  onPress={() => navigation.navigate('Payouts')}
                >
                  <View style={styles.payoutLeft}>
                    <Text style={styles.payoutAmount}>{formatCurrency(payout.amount)}</Text>
                    <Text style={styles.payoutDate}>
                      {formatDateOnly(payout.periodStart).split(' ')[0]} - {formatDateOnly(payout.periodEnd)}
                    </Text>
                  </View>
                  <View style={styles.payoutRight}>
                    <View style={[styles.statusBadge, styles.statusProcessing]}>
                      <Text style={styles.statusProcessingText}>In processing</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Paid Payouts (show only recent 3) */}
          {paidPayouts.length > 0 && (
            <View style={styles.payoutGroup}>
              {paidPayouts.slice(0, 3).map((payout) => (
                <TouchableOpacity
                  key={payout.id}
                  style={styles.payoutCard}
                  onPress={() => navigation.navigate('Payouts')}
                >
                  <View style={styles.payoutLeft}>
                    <Text style={styles.payoutAmount}>{formatCurrency(payout.amount)}</Text>
                    <Text style={styles.payoutDate}>
                      {formatDateOnly(payout.periodStart).split(' ')[0]} - {formatDateOnly(payout.periodEnd)}
                    </Text>
                  </View>
                  <View style={styles.payoutRight}>
                    <View style={[styles.statusBadge, styles.statusPaid]}>
                      <Text style={styles.statusPaidText}>Paid</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Empty State */}
          {payouts.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color={Colors.gray300} />
              <Text style={styles.emptyText}>No bank transfers yet</Text>
              <Text style={styles.emptySubtext}>Complete jobs to earn and receive payouts</Text>
            </View>
          )}

          {/* View All Link */}
          {payouts.length > 3 && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('Payouts')}
            >
              <Text style={styles.viewAllText}>View all transactions</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Summary Stats */}
        {summary && (
          <View style={styles.summarySection}>
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
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingBottom: 100,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  monthSelector: {
    marginBottom: Spacing.lg,
  },
  monthScrollContent: {
    paddingRight: Spacing.xl,
    gap: Spacing.sm,
  },
  monthChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
    borderWidth: 1.5,
    borderColor: Colors.gray100,
  },
  monthChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  monthChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  monthChipTextActive: {
    color: '#fff',
  },
  earningsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  earningsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  mainAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 4,
  },
  mainLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  netLabel: {
    fontSize: 14,
    color: Colors.success,
    fontWeight: '700',
    marginTop: 6,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
    gap: 4,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barWrapper: {
    width: '100%',
    height: 80,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '80%',
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    marginTop: 6,
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  payoutGroup: {
    gap: Spacing.md,
  },
  payoutCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  payoutLeft: {
    flex: 1,
  },
  payoutAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  payoutDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  payoutRight: {
    marginLeft: Spacing.md,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  statusUpcoming: {
    backgroundColor: Colors.gray100,
  },
  statusUpcomingText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  statusProcessing: {
    backgroundColor: '#FFF4E5',
  },
  statusProcessingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  statusPaid: {
    backgroundColor: Colors.successBg || '#D4EDDA',
  },
  statusPaidText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  summarySection: {
    marginBottom: Spacing.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  breakdownCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  breakdownLabelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breakdownLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  breakdownValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  deductionValue: {
    color: Colors.error,
  },
  breakdownLabelBold: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  breakdownValueBold: {
    fontSize: 16,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.primaryBg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: Colors.primary,
    lineHeight: 18,
  },
});
