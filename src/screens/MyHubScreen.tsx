import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { Card } from '../components/common/Card';
import { Loader } from '../components/common/Loader';
import { formatCurrency } from '../utils/format';
import apiClient from '../api/client';

interface HubStats {
  totalJobsDelivered: number;
  repeatCustomers: number;
  avgRating: number;
  totalReviews: number;
  serviceAreas: string[];
  activeCity: string;
  monthlyEarnings: number;
  thisWeekJobs: number;
  acceptanceRate: number;
  cancellationRate: number;
  completionRate: number;
  avgResponseTime: number; // minutes
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  jobs: number;
  rating: number;
  isMe?: boolean;
}

export const MyHubScreen = () => {
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<HubStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [statsRes, lbRes] = await Promise.all([
        apiClient.get('/professional/hub/stats'),
        apiClient.get('/professional/hub/leaderboard'),
      ]);
      setStats(statsRes.data?.data ?? DEMO_STATS);
      setLeaderboard(lbRes.data?.data ?? DEMO_LEADERBOARD);
    } catch {
      setStats(DEMO_STATS);
      setLeaderboard(DEMO_LEADERBOARD);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => { setRefreshing(true); load(true); };

  if (loading) return <Loader text="Loading My Hub..." />;

  const s = stats!;
  const ratingColor = s.avgRating >= 4.5 ? Colors.success : s.avgRating >= 4.0 ? Colors.warning : Colors.error;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Hub</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={styles.scroll}
      >
        {/* City & Service Area */}
        <Card style={styles.cityCard}>
          <View style={styles.cityHeader}>
            <View>
              <Text style={styles.cityLabel}>Active City</Text>
              <Text style={styles.cityName}>{s.activeCity}</Text>
            </View>
            <View style={styles.mapIconWrap}>
              <Ionicons name="location" size={28} color={Colors.primary} />
            </View>
          </View>
          {s.serviceAreas.length > 0 && (
            <View>
              <Text style={styles.areasLabel}>Service Areas</Text>
              <View style={styles.areasWrap}>
                {s.serviceAreas.map((area) => (
                  <View key={area} style={styles.areaChip}>
                    <Text style={styles.areaText}>{area}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Card>

        {/* Rating Card */}
        <Card style={styles.ratingCard}>
          <View style={styles.ratingRow}>
            <View style={styles.ratingLeft}>
              <Text style={[styles.ratingValue, { color: ratingColor }]}>{s.avgRating.toFixed(1)}</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Ionicons
                    key={i} name={i <= Math.round(s.avgRating) ? 'star' : 'star-outline'}
                    size={14} color={Colors.warning}
                  />
                ))}
              </View>
              <Text style={styles.ratingSubtitle}>{s.totalReviews} reviews</Text>
            </View>
            <View style={styles.ratingRight}>
              <PerformanceBar label="Completion Rate" value={s.completionRate} color={Colors.success} />
              <PerformanceBar label="Acceptance Rate" value={s.acceptanceRate} color={Colors.primary} />
              <PerformanceBar label="Cancellation" value={s.cancellationRate} color={Colors.error} isLower />
            </View>
          </View>
        </Card>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard icon="briefcase" label="Jobs Delivered" value={s.totalJobsDelivered.toString()} color={Colors.primary} />
          <StatCard icon="people" label="Repeat Customers" value={s.repeatCustomers.toString()} color="#8B5CF6" />
          <StatCard icon="trending-up" label="This Week" value={s.thisWeekJobs.toString() + ' jobs'} color={Colors.success} />
          <StatCard icon="timer-outline" label="Avg Response" value={`${s.avgResponseTime} min`} color={Colors.warning} />
        </View>

        {/* Monthly Earnings Highlight */}
        <Card style={styles.earningsCard}>
          <View style={styles.earningsRow}>
            <View>
              <Text style={styles.earningsLabel}>This Month's Earnings</Text>
              <Text style={styles.earningsValue}>{formatCurrency(s.monthlyEarnings)}</Text>
            </View>
            <View style={styles.earningsIcon}>
              <Ionicons name="wallet" size={28} color={Colors.primary} />
            </View>
          </View>
        </Card>

        {/* Leaderboard */}
        <Text style={styles.sectionTitle}>City Leaderboard</Text>
        <Card>
          {leaderboard.map((entry, idx) => (
            <View key={entry.rank} style={[styles.lbRow, idx > 0 && styles.lbBorder, entry.isMe && styles.lbRowMe]}>
              <View style={[styles.lbRank, entry.rank <= 3 && { backgroundColor: RANK_COLORS[entry.rank - 1] + '20' }]}>
                {entry.rank <= 3
                  ? <Text style={[styles.lbRankEmoji]}>{['🥇', '🥈', '🥉'][entry.rank - 1]}</Text>
                  : <Text style={styles.lbRankNum}>{entry.rank}</Text>
                }
              </View>
              <View style={styles.lbInfo}>
                <Text style={[styles.lbName, entry.isMe && { color: Colors.primary, fontWeight: '700' }]}>
                  {entry.name}{entry.isMe ? ' (You)' : ''}
                </Text>
                <Text style={styles.lbJobs}>{entry.jobs} jobs</Text>
              </View>
              <View style={styles.lbRatingWrap}>
                <Ionicons name="star" size={12} color={Colors.warning} />
                <Text style={styles.lbRating}>{entry.rating.toFixed(1)}</Text>
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
};

const StatCard = ({ icon, label, value, color }: { icon: any; label: string; value: string; color: string }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <Ionicons name={icon} size={22} color={color} style={{ marginBottom: 6 }} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const PerformanceBar = ({ label, value, color, isLower }: { label: string; value: number; color: string; isLower?: boolean }) => (
  <View style={styles.perfBarWrap}>
    <View style={styles.perfBarHeader}>
      <Text style={styles.perfBarLabel}>{label}</Text>
      <Text style={[styles.perfBarValue, { color: isLower ? (value < 10 ? Colors.success : Colors.error) : color }]}>
        {value}%
      </Text>
    </View>
    <View style={styles.perfBar}>
      <View style={[styles.perfBarFill, { width: `${Math.min(value, 100)}%` as any, backgroundColor: color }]} />
    </View>
  </View>
);

const RANK_COLORS = ['#F59E0B', '#9CA3AF', '#B45309'];

const DEMO_STATS: HubStats = {
  totalJobsDelivered: 248,
  repeatCustomers: 67,
  avgRating: 4.7,
  totalReviews: 183,
  serviceAreas: ['Bandra West', 'Khar', 'Santacruz', 'Vile Parle'],
  activeCity: 'Mumbai',
  monthlyEarnings: 42500,
  thisWeekJobs: 12,
  acceptanceRate: 91,
  cancellationRate: 4,
  completionRate: 97,
  avgResponseTime: 8,
};

const DEMO_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: 'Rajesh Kumar', jobs: 312, rating: 4.9 },
  { rank: 2, name: 'Sunil Sharma', jobs: 287, rating: 4.8 },
  { rank: 3, name: 'Priya Patel', jobs: 265, rating: 4.8 },
  { rank: 4, name: 'You', jobs: 248, rating: 4.7, isMe: true },
  { rank: 5, name: 'Ankit Mehta', jobs: 231, rating: 4.6 },
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
  scroll: { padding: Spacing.xl, paddingBottom: 100, gap: Spacing.md },
  cityCard: {},
  cityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  cityLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500', marginBottom: 2 },
  cityName: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  mapIconWrap: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  areasLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  areasWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  areaChip: {
    backgroundColor: Colors.primaryBg, borderRadius: BorderRadius.full,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.primaryLight,
  },
  areaText: { fontSize: 12, color: Colors.primary, fontWeight: '500' },
  ratingCard: {},
  ratingRow: { flexDirection: 'row', gap: Spacing.xl },
  ratingLeft: { alignItems: 'center', justifyContent: 'center', width: 80 },
  ratingValue: { fontSize: 40, fontWeight: '800', lineHeight: 44 },
  starsRow: { flexDirection: 'row', gap: 2, marginVertical: 4 },
  ratingSubtitle: { fontSize: 11, color: Colors.textTertiary },
  ratingRight: { flex: 1, justifyContent: 'center', gap: 10 },
  perfBarWrap: { gap: 4 },
  perfBarHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  perfBarLabel: { fontSize: 11, color: Colors.textSecondary },
  perfBarValue: { fontSize: 11, fontWeight: '700' },
  perfBar: { height: 6, backgroundColor: Colors.gray100, borderRadius: 3, overflow: 'hidden' },
  perfBarFill: { height: '100%', borderRadius: 3 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderLeftWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  statValue: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 2 },
  statLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  earningsCard: { backgroundColor: Colors.primary },
  earningsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  earningsLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  earningsValue: { fontSize: 28, fontWeight: '800', color: '#fff' },
  earningsIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginTop: Spacing.sm },
  lbRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: Spacing.md },
  lbBorder: { borderTopWidth: 1, borderTopColor: Colors.divider },
  lbRowMe: { backgroundColor: Colors.primaryBg, marginHorizontal: -Spacing.lg, paddingHorizontal: Spacing.lg, borderRadius: 0 },
  lbRank: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.gray100 },
  lbRankEmoji: { fontSize: 18 },
  lbRankNum: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  lbInfo: { flex: 1 },
  lbName: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  lbJobs: { fontSize: 12, color: Colors.textTertiary },
  lbRatingWrap: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  lbRating: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
});
