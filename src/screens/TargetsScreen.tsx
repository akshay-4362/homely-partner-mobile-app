import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { Card } from '../components/common/Card';
import { proApi } from '../api/proApi';
import { creditApi } from '../api/creditApi';

// Metrics feature
interface MetricCard {
  id: string;
  title: string;
  subtitle: string;
  currentValue: number;
  targetValue: number;
  unit?: string;
  status: 'good' | 'warning' | 'bad';
  comparison: 'higher' | 'lower'; // higher is better or lower is better
}

export const TargetsScreen = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nextReviewDate, setNextReviewDate] = useState('16 Mar');
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [subscription, setSubscription] = useState({
    status: 'ACTIVE',
    jobsReceived: 8,
    jobsLimit: 10,
  });

  useEffect(() => {
    loadData();
  }, []);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch credit stats for job subscription
      const creditStatsResponse = await creditApi.getCreditStats();
      const creditStats = creditStatsResponse.data || creditStatsResponse;

      // Fetch profile for metrics
      const profile = await proApi.fetchProfile();

      // Fetch weekend unavailable hours
      let weekendHours = 0;
      try {
        const weekendData = await proApi.fetchWeekendUnavailableHours();
        weekendHours = weekendData.totalUnavailableHours || 0;
      } catch (error) {
        console.error('Failed to fetch weekend hours:', error);
        weekendHours = 0;
      }

      // Get rating and review count directly from profile
      const rating = profile.rating || 5.0;
      const reviewCount = profile.reviewCount || 0;
      const hasReviews = reviewCount > 0;

      console.log('Professional Profile Data:', {
        rating,
        reviewCount,
        hasReviews,
      });

      const metricsData: MetricCard[] = [
        {
          id: 'rating',
          title: 'Rating',
          subtitle: hasReviews ? 'Keep 4.55 or above' : 'No ratings yet',
          currentValue: hasReviews ? parseFloat(rating.toFixed(2)) : 0,
          targetValue: 4.55,
          status: hasReviews ? (rating >= 4.55 ? 'good' : rating >= 4.0 ? 'warning' : 'bad') : 'warning',
          comparison: 'higher',
        },
        {
          id: 'weekend_hours',
          title: 'Weekend unavailable hours',
          subtitle: 'Keep 31 or below',
          currentValue: weekendHours,
          targetValue: 31,
          status: weekendHours <= 20 ? 'good' : weekendHours <= 31 ? 'warning' : 'bad',
          comparison: 'lower',
        },
      ];

      setMetrics(metricsData);

      // Calculate subscription based on credit balance
      // Each job costs ₹300 (₹150 on assignment + ₹150 on completion)
      const creditPerJob = creditStats.creditPerJob || 150;
      const totalPurchased = creditStats.totalPurchased || 0;
      const jobsAssigned = creditStats.jobsAssigned || 0;

      const totalJobs = Math.floor(totalPurchased / (creditPerJob * 2));
      const jobsRemaining = totalJobs - jobsAssigned;

      setSubscription({
        status: jobsRemaining > 0 ? 'ACTIVE' : 'EXPIRED',
        jobsReceived: jobsAssigned,
        jobsLimit: totalJobs,
      });
    } catch (error) {
      console.error('Failed to load target data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getStatusIcon = (status: 'good' | 'warning' | 'bad') => {
    switch (status) {
      case 'good':
        return <Ionicons name="checkmark-circle" size={24} color={Colors.success} />;
      case 'warning':
        return <Ionicons name="alert-circle" size={24} color="#FFA500" />;
      case 'bad':
        return <Ionicons name="close-circle" size={24} color={Colors.error} />;
    }
  };

  const getStatusColor = (status: 'good' | 'warning' | 'bad') => {
    switch (status) {
      case 'good':
        return Colors.success;
      case 'warning':
        return '#FFA500';
      case 'bad':
        return Colors.error;
    }
  };

  const renderMetricCard = (metric: MetricCard) => {
    const isClickable = metric.id === 'rating' || metric.id === 'weekend_hours';

    const CardContent = (
      <>
        <Text style={styles.metricTitle}>{metric.title}</Text>
        <Text style={styles.metricSubtitle}>{metric.subtitle}</Text>
        <View style={styles.metricValueRow}>
          {metric.currentValue === 0 && metric.id === 'rating' ? (
            <>
              <Ionicons name="star-outline" size={24} color={Colors.textSecondary} />
              <Text style={[styles.metricValue, { color: Colors.textSecondary }]}>
                New
              </Text>
            </>
          ) : (
            <>
              {getStatusIcon(metric.status)}
              <Text style={[styles.metricValue, { color: getStatusColor(metric.status) }]}>
                {metric.currentValue}
              </Text>
            </>
          )}
        </View>
      </>
    );

    if (isClickable) {
      const getNavigationTarget = () => {
        if (metric.id === 'rating') return 'RatingsDetail';
        if (metric.id === 'weekend_hours') return 'WeekendUnavailableHours';
        return 'Targets';
      };

      return (
        <TouchableOpacity
          key={metric.id}
          style={styles.metricCard}
          onPress={() => navigation.navigate(getNavigationTarget())}
          activeOpacity={0.7}
        >
          {CardContent}
        </TouchableOpacity>
      );
    }

    return (
      <View key={metric.id} style={styles.metricCard}>
        {CardContent}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.toggleDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Target</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* FUTURE USE: Low Performance Banner */}
        {/* {performanceStatus === 'low' && (
          <Card style={styles.warningBanner}>
            <Text style={styles.warningTitle}>Low performance</Text>
            <TouchableOpacity onPress={() => {}}>
              <Text style={styles.warningLink}>Learn about strikes</Text>
            </TouchableOpacity>
          </Card>
        )} */}

        {/* FUTURE USE: Training Result Pending */}
        {/* {trainingPending && (
          <TouchableOpacity
            style={styles.trainingCard}
            onPress={() => navigation.navigate('Training')}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={24} color={Colors.textSecondary} />
            <Text style={styles.trainingText}>Training result pending</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )} */}

        {/* Metrics Section - Rating and Weekend Hours Only */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Metrics</Text>
          <Text style={styles.reviewDate}>Next performance review on {nextReviewDate}</Text>
          <View style={styles.metricsGrid}>
            {metrics.map(renderMetricCard)}
          </View>
        </View>

        {/* FUTURE USE: Action Links (How ranks work, View rewards, View previous ranks) */}
        {/* <View style={styles.linksSection}>
          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => {}}
            activeOpacity={0.7}
          >
            <View style={styles.linkLeft}>
              <Ionicons name="information-circle-outline" size={24} color={Colors.textPrimary} />
              <Text style={styles.linkText}>How ranks work?</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => {}}
            activeOpacity={0.7}
          >
            <View style={styles.linkLeft}>
              <Ionicons name="trophy-outline" size={24} color={Colors.textPrimary} />
              <Text style={styles.linkText}>View rewards</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => {}}
            activeOpacity={0.7}
          >
            <View style={styles.linkLeft}>
              <Ionicons name="time-outline" size={24} color={Colors.textPrimary} />
              <Text style={styles.linkText}>View previous ranks</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View> */}

        {/* Job Subscription Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Subscription</Text>

          <Card style={styles.subscriptionCard}>
            <View style={styles.subscriptionHeader}>
              <View>
                <View style={[
                  styles.statusBadge,
                  subscription.status === 'EXPIRED' && styles.expiredBadge
                ]}>
                  <Text style={styles.statusText}>{subscription.status}</Text>
                </View>
                <Text style={styles.subscriptionTitle}>
                  You got {subscription.jobsReceived}/{subscription.jobsLimit} jobs
                </Text>
              </View>
              <Ionicons
                name={subscription.status === 'EXPIRED' ? 'alert-circle' : 'checkmark-circle'}
                size={32}
                color={subscription.status === 'EXPIRED' ? Colors.error : Colors.success}
              />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.detailsBtn, { flex: 1, marginRight: 8 }]}
                onPress={() => navigation.navigate('Credits')}
                activeOpacity={0.7}
              >
                <Text style={styles.detailsBtnText}>See details</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.detailsBtn, styles.historyBtn, { flex: 1 }]}
                onPress={() => navigation.navigate('Credits', { initialTab: 'recharges' })}
                activeOpacity={0.7}
              >
                <Ionicons name="receipt-outline" size={16} color={Colors.primary} />
                <Text style={[styles.detailsBtnText, { color: Colors.primary, marginLeft: 4 }]}>
                  Credit History
                </Text>
              </TouchableOpacity>
            </View>
          </Card>

          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => {/* Navigate to previous subscriptions */ }}
            activeOpacity={0.7}
          >
            <View style={styles.linkLeft}>
              <Ionicons name="time-outline" size={24} color={Colors.textPrimary} />
              <Text style={styles.linkText}>View previous</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Help Button */}
        <TouchableOpacity
          style={styles.helpButton}
          onPress={() => navigation.navigate('HelpCenter')}
          activeOpacity={0.7}
        >
          <Ionicons name="help-circle" size={24} color="#fff" />
          <Text style={styles.helpText}>Help</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  menuBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  // FUTURE USE: Metrics & action links styles
  // warningBanner: {
  //   backgroundColor: '#FFF3CD',
  //   borderLeftWidth: 4,
  //   borderLeftColor: '#FFA500',
  //   marginBottom: Spacing.md,
  // },
  // warningTitle: {
  //   fontSize: 20,
  //   fontWeight: '700',
  //   color: Colors.textPrimary,
  //   marginBottom: Spacing.xs,
  // },
  // warningLink: {
  //   fontSize: 14,
  //   fontWeight: '600',
  //   color: Colors.textPrimary,
  //   textDecorationLine: 'underline',
  // },
  // trainingCard: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   backgroundColor: Colors.surface,
  //   padding: Spacing.lg,
  //   borderRadius: BorderRadius.md,
  //   marginBottom: Spacing.md,
  //   gap: Spacing.md,
  //   borderWidth: 1,
  //   borderColor: Colors.divider,
  // },
  // trainingText: {
  //   flex: 1,
  //   fontSize: 16,
  //   fontWeight: '500',
  //   color: Colors.textPrimary,
  // },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  reviewDate: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  metricCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    width: '48%',
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  metricTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  metricSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  // linksSection: {
  //   backgroundColor: Colors.surface,
  //   borderRadius: BorderRadius.md,
  //   marginBottom: Spacing.xl,
  //   borderWidth: 1,
  //   borderColor: Colors.divider,
  // },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  // divider: {
  //   height: 1,
  //   backgroundColor: Colors.divider,
  //   marginHorizontal: Spacing.lg,
  // },
  subscriptionCard: {
    marginBottom: Spacing.md,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  expiredBadge: {
    backgroundColor: Colors.error,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  detailsBtn: {
    borderWidth: 1.5,
    borderColor: Colors.textPrimary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBtn: {
    flexDirection: 'row',
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  detailsBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  helpButton: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.xl,
    backgroundColor: Colors.textPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  helpText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
