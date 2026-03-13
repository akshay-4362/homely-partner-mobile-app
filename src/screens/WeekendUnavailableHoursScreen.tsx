import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { Card } from '../components/common/Card';
import { proApi } from '../api/proApi';
import { formatDateIST } from '../utils/dateTime';

interface WeekendDay {
  date: string;
  dayName: string;
  unavailableHours: number;
}

interface WeekendHoursData {
  totalUnavailableHours: number;
  startDate: string;
  endDate: string;
  weekendDays: WeekendDay[];
}

export const WeekendUnavailableHoursScreen = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WeekendHoursData | null>(null);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const weekendData = await proApi.fetchWeekendUnavailableHours();
      console.log('Weekend Hours Data:', weekendData);
      setData(weekendData);
    } catch (error) {
      console.error('Failed to load weekend hours data:', error);
      // Set mock data for testing
      setData(generateMockData());
    } finally {
      setLoading(false);
    }
  };

  const generateMockData = (): WeekendHoursData => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const weekendDays: WeekendDay[] = [];
    let totalHours = 0;

    // Generate weekend days for the range
    const current = new Date(startDate);
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        // Sunday or Saturday
        const unavailableHours = Math.floor(Math.random() * 13); // 0-12 hours
        weekendDays.push({
          date: current.toISOString(),
          dayName: dayOfWeek === 0 ? 'Sunday' : 'Saturday',
          unavailableHours,
        });
        totalHours += unavailableHours;
      }
      current.setDate(current.getDate() + 1);
    }

    return {
      totalUnavailableHours: totalHours,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      weekendDays: weekendDays.slice(-8), // Last 8 weekend days
    };
  };

  const formatDate = (dateStr: string) => {
    return formatDateIST(dateStr, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateShort = (dateStr: string) => {
    return formatDateIST(dateStr, {
      day: 'numeric',
      month: 'long',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loader}>
          <Text style={styles.errorText}>Failed to load weekend hours data</Text>
        </View>
      </SafeAreaView>
    );
  }

  const exceedsBronze = data.totalUnavailableHours > 31;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weekend Unavailable Hours</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Total Hours */}
        <View style={styles.totalSection}>
          <Text style={styles.totalHours}>{data.totalUnavailableHours} weekend unavailable hours</Text>
          <Text style={styles.dateRange}>
            {formatDateShort(data.startDate)} - {formatDateShort(data.endDate)}
          </Text>

          {exceedsBronze && (
            <Card style={styles.warningCard}>
              <Ionicons name="alert-circle" size={24} color="#fff" />
              <Text style={styles.warningText}>Unavailable hours are higher than bronze rank limit</Text>
            </Card>
          )}
        </View>

        {/* Weekend Days List */}
        <View style={styles.section}>
          {data.weekendDays.filter((day) => day.unavailableHours > 0).map((day, index) => (
            <View key={index} style={styles.dayRow}>
              <Text style={styles.dayText}>
                {formatDateShort(day.date)}, {day.dayName}
              </Text>
              <Text style={styles.hoursText}>{day.unavailableHours} hours</Text>
            </View>
          ))}
        </View>

        {/* Learn More Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Learn more</Text>

          <TouchableOpacity
            style={styles.faqItem}
            onPress={() => setExpandedFAQ(expandedFAQ === 'calculation' ? null : 'calculation')}
            activeOpacity={0.7}
          >
            <View style={styles.faqHeader}>
              <Text style={styles.faqQuestion}>How is your weekend unavailable hours calculated?</Text>
              <Ionicons
                name={expandedFAQ === 'calculation' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={Colors.textSecondary}
              />
            </View>
            {expandedFAQ === 'calculation' && (
              <Text style={styles.faqAnswer}>
                This is the total hours marked unavailable by you on Saturday and Sunday in the current rank
                period. It counts all hours when you've set yourself as unavailable during weekends.
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.faqItem}
            onPress={() => setExpandedFAQ(expandedFAQ === 'impact' ? null : 'impact')}
            activeOpacity={0.7}
          >
            <View style={styles.faqHeader}>
              <Text style={styles.faqQuestion}>Why do weekend hours matter?</Text>
              <Ionicons
                name={expandedFAQ === 'impact' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={Colors.textSecondary}
              />
            </View>
            {expandedFAQ === 'impact' && (
              <Text style={styles.faqAnswer}>
                Weekends are the busiest time for service requests. Being available during weekends helps you:
                {'\n\n'}• Get more job opportunities
                {'\n'}• Earn higher income
                {'\n'}• Maintain a better rank
                {'\n'}• Meet customer demand when it's highest
                {'\n\n'}
                Professionals with lower weekend unavailability get priority for job assignments.
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.faqItem}
            onPress={() => setExpandedFAQ(expandedFAQ === 'improve' ? null : 'improve')}
            activeOpacity={0.7}
          >
            <View style={styles.faqHeader}>
              <Text style={styles.faqQuestion}>How can I improve my weekend availability?</Text>
              <Ionicons
                name={expandedFAQ === 'improve' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={Colors.textSecondary}
              />
            </View>
            {expandedFAQ === 'improve' && (
              <Text style={styles.faqAnswer}>
                To reduce your weekend unavailable hours:
                {'\n\n'}1. Review your calendar and identify weekends where you can be available
                {'\n'}2. Update your availability settings to mark more weekend hours as available
                {'\n'}3. Plan your personal time during weekdays when demand is lower
                {'\n'}4. Consider being available for at least half-day on weekends
                {'\n'}5. Use the Calendar screen to manage your weekly schedule
                {'\n\n'}
                Tip: Even being available for 4-6 hours on weekends can significantly improve your performance!
              </Text>
            )}
          </TouchableOpacity>
        </View>
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
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
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
  backBtn: {
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
  totalSection: {
    marginBottom: Spacing.xl,
  },
  totalHours: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  dateRange: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.error,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  dayText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  hoursText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  faqItem: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginRight: Spacing.md,
  },
  faqAnswer: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginTop: Spacing.md,
  },
});
