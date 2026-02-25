import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  Platform, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing } from '../theme/colors';
import { Card } from '../components/common/Card';
import { Loader } from '../components/common/Loader';
import { formatCurrency } from '../utils/format';
import apiClient from '../api/client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// MapMyIndia (Mappls) API Key
const MAPPLS_API_KEY = process.env.EXPO_PUBLIC_MAPPLS_API_KEY || '77982c1e7ce80c97d51014114a198fb2';

// Bangalore coordinates
const BANGALORE_LAT = 12.9716;
const BANGALORE_LNG = 77.5946;

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
  last30DaysJobs?: number;
  last30DaysRepeatCustomers?: number;
}

export const MyHubScreen = () => {
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<HubStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const statsRes = await apiClient.get('/professional/hub/stats');
      setStats(statsRes.data?.data ?? DEMO_STATS);
    } catch {
      setStats(DEMO_STATS);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => { setRefreshing(true); load(true); };

  if (loading) return <Loader text="Loading My Hub..." />;

  const s = stats!;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
        {/* Hub Name */}
        <Text style={styles.hubName}>{s.activeCity}</Text>

        {/* Map Section */}
        <Card style={styles.mapCard}>
          <Image
            source={{
              uri: `https://apis.mapmyindia.com/advancedmaps/v1/${MAPPLS_API_KEY}/still_image?center=${BANGALORE_LAT},${BANGALORE_LNG}&zoom=11&size=${Math.round(SCREEN_WIDTH - 40)}x400&markers=${BANGALORE_LAT},${BANGALORE_LNG}`
            }}
            style={styles.mapImage}
            resizeMode="cover"
          />
          <View style={styles.mapOverlay}>
            <Text style={styles.mapCityName}>Bengaluru</Text>
            <Text style={styles.mapCityNameKannada}>ಬೆಂಗಳೂರು</Text>
          </View>
        </Card>

        {/* Stats Section */}
        <Card style={styles.statsCard}>
          <View style={styles.statRow}>
            <Ionicons name="briefcase" size={20} color={Colors.textSecondary} />
            <Text style={styles.statText}>
              {s.last30DaysJobs || s.totalJobsDelivered} jobs delivered within hub in last 30 days
            </Text>
          </View>
          <View style={styles.statRow}>
            <Ionicons name="repeat" size={20} color={Colors.textSecondary} />
            <Text style={styles.statText}>
              {s.last30DaysRepeatCustomers || s.repeatCustomers} of {s.last30DaysJobs || s.totalJobsDelivered} jobs were of repeat customers
            </Text>
          </View>
        </Card>

        {/* Need Help Section */}
        <Text style={styles.sectionTitle}>Need help?</Text>

        <Card>
          <TouchableOpacity
            style={styles.helpItem}
            onPress={() => {/* Navigate to hub info */}}
          >
            <Text style={styles.helpItemText}>What is a Hub?</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.helpDivider} />

          <TouchableOpacity
            style={styles.helpItem}
            onPress={() => {/* Navigate to rebooking info */}}
          >
            <Text style={styles.helpItemText}>Getting rebooking leads outside hub</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};


const DEMO_STATS: HubStats = {
  totalJobsDelivered: 248,
  repeatCustomers: 67,
  avgRating: 4.7,
  totalReviews: 183,
  serviceAreas: ['Bangalore'],
  activeCity: 'Bangalore',
  monthlyEarnings: 42500,
  thisWeekJobs: 12,
  acceptanceRate: 91,
  cancellationRate: 4,
  completionRate: 97,
  avgResponseTime: 8,
  last30DaysJobs: 81,
  last30DaysRepeatCustomers: 2,
};


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Spacing.lg, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  scroll: { padding: Spacing.xl, paddingBottom: 100, gap: Spacing.lg },

  // Hub Name
  hubName: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },

  // Map Card
  mapCard: {
    padding: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  mapImage: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.gray100,
  },
  mapOverlay: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
  },
  mapCityName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  mapCityNameKannada: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginTop: 2,
  },

  // Stats Card
  statsCard: {
    gap: Spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  statText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textPrimary,
    fontWeight: '500',
  },

  // Need Help Section
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  helpItemText: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  helpDivider: {
    height: 1,
    backgroundColor: Colors.divider,
  },
});
