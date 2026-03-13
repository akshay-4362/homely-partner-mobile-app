import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { formatCurrency } from '../utils/format';
import { formatDateIST } from '../utils/dateTime';
import { bookingApi } from '../api/bookingApi';

export const MonthJobsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { month, monthTitle, customerPaid, netEarnings, jobCount } = route.params || {};

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const result = await bookingApi.fetchCompletedByMonth(month);
        setJobs(result);
      } catch {
        setJobs([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [month]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{monthTitle}</Text>
          <Text style={styles.headerSub}>
            {jobCount} job{jobCount !== 1 ? 's' : ''} completed
          </Text>
        </View>
      </View>

      {/* Summary pills */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryPill}>
          <Text style={styles.summaryLabel}>Customer paid</Text>
          <Text style={styles.summaryVal}>{formatCurrency(customerPaid)}</Text>
        </View>
        <View style={styles.summaryPill}>
          <Text style={styles.summaryLabel}>Net to you</Text>
          <Text style={[styles.summaryVal, { color: Colors.success }]}>
            {formatCurrency(netEarnings)}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : jobs.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="briefcase-outline" size={48} color={Colors.gray300} />
          <Text style={styles.emptyText}>No completed jobs this month</Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item._id || item.id || item.bookingId}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const earnings = item.finalTotal ?? item.total ?? item.earnings ?? 0;
            const serviceName = item.service?.name || item.serviceName || 'Service';
            const customerName = item.customer
              ? `${item.customer.firstName || ''} ${item.customer.lastName || ''}`.trim()
              : item.customerName || 'Customer';
            const date = item.scheduledAt
              ? formatDateIST(item.scheduledAt, { day: 'numeric', month: 'short' })
              : '';
            return (
              <View style={styles.jobItem}>
                <View style={styles.jobIconBg}>
                  <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
                </View>
                <View style={styles.jobInfo}>
                  <Text style={styles.jobName} numberOfLines={1}>{serviceName}</Text>
                  <Text style={styles.jobMeta}>
                    {customerName}{date ? `  ·  ${date}` : ''}
                  </Text>
                </View>
                <Text style={styles.jobAmt}>{formatCurrency(earnings)}</Text>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  summaryPill: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  summaryVal: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  list: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  jobItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  jobIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobInfo: {
    flex: 1,
  },
  jobName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  jobMeta: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  jobAmt: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});
