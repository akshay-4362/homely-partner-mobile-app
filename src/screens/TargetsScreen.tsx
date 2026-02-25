import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { useAppSelector } from '../hooks/useAppSelector';
import { proApi } from '../api/proApi';
import { formatDate } from '../utils/format';

interface TargetMetric {
  name: string;
  target: string;
  actual: number;
  unit: string;
  met: boolean;
}

export const TargetsScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<TargetMetric[]>([]);
  const [jobPackInfo, setJobPackInfo] = useState({
    startDate: new Date(),
    endDate: new Date(),
    jobsSent: 0,
    jobsTarget: 10,
  });
  const [allTargetsMet, setAllTargetsMet] = useState(false);

  useEffect(() => {
    loadTargets();
  }, []);

  const loadTargets = async () => {
    try {
      setLoading(true);

      // Fetch hub stats for metrics
      const profile = await proApi.fetchProfile();
      const hubStats = profile.hubStats || {};

      // Calculate metrics
      const leaveHours = 0; // Would need availability tracking
      const leaveTarget = 31;

      const revisitPercent = hubStats.repeatCustomers || 0;
      const revisitTarget = 7;

      const acceptanceRate = hubStats.acceptanceRate || 100;

      const metricsData: TargetMetric[] = [
        {
          name: 'Leave hours',
          target: `Keep ${leaveTarget}`,
          actual: leaveHours,
          unit: 'hrs',
          met: leaveHours <= leaveTarget,
        },
        {
          name: 'Revisit %',
          target: `Keep ${revisitTarget}`,
          actual: revisitPercent,
          unit: '%',
          met: revisitPercent <= revisitTarget,
        },
        {
          name: 'Acceptance',
          target: '-',
          actual: acceptanceRate,
          unit: '%',
          met: true, // Auto-assignment means always met
        },
      ];

      setMetrics(metricsData);
      setAllTargetsMet(metricsData.every(m => m.met));

      // Mock job pack data - would need backend endpoint
      const now = new Date();
      const packStart = new Date(now);
      packStart.setDate(now.getDate() - 1);
      const packEnd = new Date(now);
      packEnd.setDate(now.getDate() + 1);

      setJobPackInfo({
        startDate: packStart,
        endDate: packEnd,
        jobsSent: hubStats.thisWeekJobs || 0,
        jobsTarget: 10,
      });
    } catch (error) {
      console.error('Failed to load targets:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTargets();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.scroll}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Performance Targets</Text>
        </View>

        {/* Promise Fulfilled Badge */}
        {allTargetsMet && (
          <View style={styles.badgeCard}>
            <Ionicons name="checkmark-circle" size={32} color={Colors.success} />
            <Text style={styles.badgeText}>Promise Fulfilled</Text>
            <Text style={styles.badgeSubtext}>All targets met this period</Text>
          </View>
        )}

        {/* Current Job Pack */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current Job Pack</Text>
          <View style={styles.jobPackInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.infoText}>
                {formatDate(jobPackInfo.startDate)} - {formatDate(jobPackInfo.endDate)}
              </Text>
            </View>
            <View style={styles.jobPackProgress}>
              <Text style={styles.jobPackText}>
                {jobPackInfo.jobsSent} of {jobPackInfo.jobsTarget} jobs sent
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(
                        (jobPackInfo.jobsSent / jobPackInfo.jobsTarget) * 100,
                        100
                      )}%`,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Metrics Table */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Performance Metrics</Text>
          <View style={styles.metricsTable}>
            {/* Header Row */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.metricCol]}>Metric</Text>
              <Text style={[styles.tableHeaderText, styles.targetCol]}>Target</Text>
              <Text style={[styles.tableHeaderText, styles.actualCol]}>You</Text>
            </View>

            {/* Data Rows */}
            {metrics.map((metric, index) => (
              <View
                key={index}
                style={[
                  styles.tableRow,
                  index === metrics.length - 1 && styles.tableRowLast,
                ]}
              >
                <Text style={[styles.tableCell, styles.metricCol]}>{metric.name}</Text>
                <Text style={[styles.tableCell, styles.targetCol]}>{metric.target}</Text>
                <View style={[styles.actualCell, styles.actualCol]}>
                  <Text
                    style={[
                      styles.actualValue,
                      metric.met ? styles.actualMet : styles.actualNotMet,
                    ]}
                  >
                    {metric.actual}{metric.unit}
                  </Text>
                  {metric.met && (
                    <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Previous Job Packs */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Previous Job Packs</Text>
          <View style={styles.historyList}>
            <View style={styles.historyItem}>
              <View style={styles.historyIcon}>
                <Ionicons name="checkmark" size={16} color={Colors.success} />
              </View>
              <View style={styles.historyContent}>
                <Text style={styles.historyDate}>13-14 Feb</Text>
                <Text style={styles.historyResult}>10/10 ✓</Text>
              </View>
            </View>

            <View style={styles.historyItem}>
              <View style={styles.historyIcon}>
                <Ionicons name="checkmark" size={16} color={Colors.success} />
              </View>
              <View style={styles.historyContent}>
                <Text style={styles.historyDate}>03-06 Feb</Text>
                <Text style={styles.historyResult}>10/10 ✓</Text>
              </View>
            </View>

            <View style={styles.historyItem}>
              <View style={styles.historyIcon}>
                <Ionicons name="checkmark" size={16} color={Colors.success} />
              </View>
              <View style={styles.historyContent}>
                <Text style={styles.historyDate}>01-02 Feb</Text>
                <Text style={styles.historyResult}>10/10 ✓</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  badgeCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.success,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  badgeText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.success,
  },
  badgeSubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  jobPackInfo: {
    gap: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  infoText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  jobPackProgress: {
    gap: Spacing.sm,
  },
  jobPackText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.gray200,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  metricsTable: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.gray100,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: 'center',
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCell: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  metricCol: {
    flex: 2,
  },
  targetCol: {
    flex: 1.5,
    textAlign: 'center',
  },
  actualCol: {
    flex: 1.5,
  },
  actualCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.xs,
  },
  actualValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  actualMet: {
    color: Colors.success,
  },
  actualNotMet: {
    color: Colors.error,
  },
  historyList: {
    gap: Spacing.md,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  historyResult: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
  },
});
