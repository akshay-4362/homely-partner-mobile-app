import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, RefreshControl, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { availabilityApi, DaySchedule, HourlySlot, AvailabilityStats } from '../api/availabilityApi';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 8); // 8 AM to 11 PM

export const EnhancedCalendarScreen = () => {
  const navigation = useNavigation<any>();
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>([]);
  const [stats, setStats] = useState<AvailabilityStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const statsData = await availabilityApi.getStats();
      setStats(statsData);

      // Initialize schedule if needed
      if (statsData.weeklyHours === 0) {
        const initData = await availabilityApi.initializeSchedule();
        setWeeklySchedule(initData.weeklySchedule || []);
      } else {
        // Load from profile (you might need to add endpoint to get full profile)
        // For now, initialize with default
        const initData = await availabilityApi.initializeSchedule();
        setWeeklySchedule(initData.weeklySchedule || []);
      }
    } catch (error) {
      console.error('Error loading availability:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const toggleSlot = async (dayOfWeek: number, hour: number) => {
    const daySchedule = weeklySchedule.find((d) => d.dayOfWeek === dayOfWeek);
    if (!daySchedule) return;

    const slot = daySchedule.slots.find((s) => s.hour === hour);
    if (!slot) return;

    // Optimistic update
    const newSchedule = weeklySchedule.map((day) => {
      if (day.dayOfWeek === dayOfWeek) {
        return {
          ...day,
          slots: day.slots.map((s) =>
            s.hour === hour ? { ...s, available: !s.available } : s
          ),
        };
      }
      return day;
    });

    setWeeklySchedule(newSchedule);

    try {
      await availabilityApi.updateWeeklySchedule(newSchedule);
      await loadData(); // Refresh stats
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update availability');
      setWeeklySchedule(weeklySchedule); // Revert on error
    }
  };

  const handleBatchUpdate = (dayOfWeek: number, startHour: number, endHour: number, available: boolean) => {
    Alert.alert(
      'Batch Update',
      `Mark ${DAYS[dayOfWeek]} from ${formatHour(startHour)} to ${formatHour(endHour)} as ${available ? 'available' : 'unavailable'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await availabilityApi.batchUpdateDay(dayOfWeek, startHour, endHour, available);
              setWeeklySchedule(result.weeklySchedule || []);
              await loadData();
              Alert.alert('Success', 'Availability updated');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to update');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const quickAction = (type: string) => {
    switch (type) {
      case 'weekdays_9to5':
        // Monday to Friday, 9 AM to 5 PM
        Alert.alert(
          'Set Weekdays 9-5',
          'Mark Monday to Friday, 9 AM to 5 PM as available?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Confirm',
              onPress: async () => {
                setLoading(true);
                try {
                  for (let day = 1; day <= 5; day++) {
                    await availabilityApi.batchUpdateDay(day, 9, 17, true);
                  }
                  await loadData();
                  Alert.alert('Success', 'Weekdays 9-5 marked available');
                } catch (error: any) {
                  Alert.alert('Error', 'Failed to update');
                } finally {
                  setLoading(false);
                }
              },
            },
          ]
        );
        break;
      case 'weekends':
        // Saturday and Sunday, 8 AM to 8 PM
        Alert.alert(
          'Set Weekends',
          'Mark Saturday and Sunday, 8 AM to 8 PM as available?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Confirm',
              onPress: async () => {
                setLoading(true);
                try {
                  await availabilityApi.batchUpdateDay(0, 8, 20, true);
                  await availabilityApi.batchUpdateDay(6, 8, 20, true);
                  await loadData();
                  Alert.alert('Success', 'Weekends marked available');
                } catch (error: any) {
                  Alert.alert('Error', 'Failed to update');
                } finally {
                  setLoading(false);
                }
              },
            },
          ]
        );
        break;
      case 'clear_all':
        Alert.alert(
          'Clear All',
          'Mark all hours as unavailable?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Clear',
              style: 'destructive',
              onPress: async () => {
                setLoading(true);
                try {
                  for (let day = 0; day <= 6; day++) {
                    await availabilityApi.batchUpdateDay(day, 8, 23, false);
                  }
                  await loadData();
                  Alert.alert('Success', 'All hours cleared');
                } catch (error: any) {
                  Alert.alert('Error', 'Failed to clear');
                } finally {
                  setLoading(false);
                }
              },
            },
          ]
        );
        break;
    }
  };

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}${period}`;
  };

  const isWeekend = (dayOfWeek: number) => dayOfWeek === 0 || dayOfWeek === 6;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Availability</Text>
        <TouchableOpacity
          style={styles.moreBtn}
          onPress={() => setBatchModalVisible(true)}
        >
          <Ionicons name="options" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        contentContainerStyle={styles.scroll}
      >
        {/* Statistics */}
        {stats && (
          <Card style={[styles.statsCard, stats.needsUpdate && styles.statsCardWarning]}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.weeklyHours}h</Text>
                <Text style={styles.statLabel}>This Week</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.monthlyHours}h</Text>
                <Text style={styles.statLabel}>Monthly</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, stats.needsUpdate && { color: Colors.error }]}>
                  {stats.percentageOfMinimum}%
                </Text>
                <Text style={styles.statLabel}>of Goal</Text>
              </View>
            </View>
            {stats.needsUpdate && (
              <View style={styles.warningBanner}>
                <Ionicons name="alert-circle" size={16} color={Colors.error} />
                <Text style={styles.warningText}>
                  You need {stats.minimumRequired - stats.monthlyHours} more hours to meet minimum (270h/month)
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => quickAction('weekdays_9to5')}
              activeOpacity={0.7}
            >
              <Ionicons name="briefcase-outline" size={20} color={Colors.primary} />
              <Text style={styles.quickBtnText}>Weekdays 9-5</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => quickAction('weekends')}
              activeOpacity={0.7}
            >
              <Ionicons name="sunny-outline" size={20} color={Colors.warning} />
              <Text style={styles.quickBtnText}>Weekends 8-8</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickBtn, styles.quickBtnDanger]}
              onPress={() => quickAction('clear_all')}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle-outline" size={20} color={Colors.error} />
              <Text style={[styles.quickBtnText, { color: Colors.error }]}>Clear All</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Week Schedule Grid */}
        <Card>
          <View style={styles.gridHeader}>
            <Text style={styles.sectionTitle}>Weekly Schedule</Text>
            <Text style={styles.gridHint}>Tap to toggle</Text>
          </View>

          {/* Hour Labels */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {/* Header Row */}
              <View style={styles.gridRow}>
                <View style={[styles.dayLabel, styles.dayLabelHeader]} />
                {HOURS.map((hour) => (
                  <View key={hour} style={styles.hourLabel}>
                    <Text style={styles.hourText}>{formatHour(hour)}</Text>
                  </View>
                ))}
              </View>

              {/* Day Rows */}
              {weeklySchedule.map((day) => {
                const weekend = isWeekend(day.dayOfWeek);
                return (
                  <View key={day.dayOfWeek} style={styles.gridRow}>
                    <View style={[styles.dayLabel, weekend && styles.dayLabelWeekend]}>
                      <Text style={[styles.dayText, weekend && styles.dayTextWeekend]}>
                        {DAYS[day.dayOfWeek]}
                      </Text>
                      {weekend && (
                        <View style={styles.highDemandBadge}>
                          <Text style={styles.highDemandText}>High Demand</Text>
                        </View>
                      )}
                    </View>
                    {HOURS.map((hour) => {
                      const slot = day.slots.find((s) => s.hour === hour);
                      const available = slot?.available || false;
                      return (
                        <TouchableOpacity
                          key={hour}
                          style={[
                            styles.slotCell,
                            available && styles.slotCellAvailable,
                            weekend && available && styles.slotCellWeekend,
                          ]}
                          onPress={() => toggleSlot(day.dayOfWeek, hour)}
                          activeOpacity={0.7}
                        >
                          {available && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </Card>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, styles.legendAvailable]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, styles.legendUnavailable]} />
            <Text style={styles.legendText}>Unavailable</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, styles.legendWeekend]} />
            <Text style={styles.legendText}>Weekend (High Demand)</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: 56,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  moreBtn: { padding: 4 },
  scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 24, gap: Spacing.md },
  statsCard: { borderLeftWidth: 3, borderLeftColor: Colors.primary },
  statsCardWarning: { borderLeftColor: Colors.error },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.md },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.sm,
    backgroundColor: Colors.errorBg,
    borderRadius: BorderRadius.sm,
  },
  warningText: { fontSize: 12, color: Colors.error, flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  quickActions: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  quickBtnDanger: { backgroundColor: Colors.errorBg, borderColor: Colors.error },
  quickBtnText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  gridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  gridHint: { fontSize: 11, color: Colors.textTertiary, fontStyle: 'italic' },
  gridRow: { flexDirection: 'row', marginBottom: 2 },
  dayLabel: {
    width: 60,
    padding: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
  },
  dayLabelHeader: { backgroundColor: 'transparent' },
  dayLabelWeekend: { backgroundColor: Colors.warningBg },
  dayText: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  dayTextWeekend: { color: Colors.warning },
  highDemandBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    backgroundColor: Colors.warning,
    borderRadius: 3,
    marginTop: 2,
  },
  highDemandText: { fontSize: 8, fontWeight: '700', color: '#fff' },
  hourLabel: {
    width: 48,
    padding: 4,
    alignItems: 'center',
  },
  hourText: { fontSize: 9, color: Colors.textSecondary, fontWeight: '600' },
  slotCell: {
    width: 48,
    height: 36,
    backgroundColor: Colors.gray100,
    marginHorizontal: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotCellAvailable: { backgroundColor: Colors.primary },
  slotCellWeekend: { backgroundColor: Colors.warning },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.md,
    flexWrap: 'wrap',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendBox: { width: 16, height: 16, borderRadius: 3 },
  legendAvailable: { backgroundColor: Colors.primary },
  legendUnavailable: { backgroundColor: Colors.gray100 },
  legendWeekend: { backgroundColor: Colors.warning },
  legendText: { fontSize: 11, color: Colors.textSecondary },
});
