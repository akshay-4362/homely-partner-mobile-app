import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, RefreshControl, Switch,
  Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Loader } from '../components/common/Loader';
import { availabilityApi, DaySchedule, HourlySlot, AvailabilityStats } from '../api/availabilityApi';

const DAYS_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Generate next 7 days starting from today
const getNext7Days = () => {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    days.push(date);
  }
  return days;
};

export const EnhancedCalendarScreen = () => {
  const navigation = useNavigation<any>();
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>([]);
  const [stats, setStats] = useState<AvailabilityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedHours, setExpandedHours] = useState(true);
  const [availableDates] = useState(getNext7Days());

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
    } finally {
      setLoading(false);
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
                    await availabilityApi.batchUpdateDay(day, 8, 20, false);
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
    return `${displayHour}:00 ${period}`;
  };

  const formatHourRange = (hour: number) => {
    const startPeriod = hour >= 12 ? 'PM' : 'AM';
    const startHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const endHour = hour + 1;
    const endPeriod = endHour >= 12 ? 'PM' : 'AM';
    const endDisplayHour = endHour > 12 ? endHour - 12 : endHour === 0 ? 12 : endHour;
    return `${String(startHour).padStart(2, '0')}:00 ${startPeriod} - ${String(endDisplayHour).padStart(2, '0')}:00 ${endPeriod}`;
  };

  const isWeekend = (dayOfWeek: number) => dayOfWeek === 0 || dayOfWeek === 6;

  const getSelectedDaySchedule = () => {
    const dayOfWeek = selectedDate.getDay();
    return weeklySchedule.find((d) => d.dayOfWeek === dayOfWeek);
  };

  const getAvailableHoursCount = () => {
    const daySchedule = getSelectedDaySchedule();
    if (!daySchedule) return 0;
    return daySchedule.slots.filter(s => s.available).length;
  };

  const isDayAvailable = (date: Date) => {
    const dayOfWeek = date.getDay();
    const daySchedule = weeklySchedule.find((d) => d.dayOfWeek === dayOfWeek);
    if (!daySchedule) return false;
    return daySchedule.slots.some(s => s.available);
  };

  const formatDateForHeader = (date: Date) => {
    const dayName = DAYS_FULL[date.getDay()];
    const monthName = MONTHS[date.getMonth()];
    const day = date.getDate();
    const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
    return `${dayName}, ${monthName} ${day}${suffix}`;
  };

  if (loading) {
    return <Loader text="Loading schedule..." />;
  }

  const daySchedule = getSelectedDaySchedule();
  const availableHours = getAvailableHoursCount();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={styles.changeRoutineBtn}
          onPress={() => {
            Alert.alert(
              'Change Routine',
              'Choose a quick setup option',
              [
                {
                  text: 'Weekdays 9-5',
                  onPress: () => quickAction('weekdays_9to5')
                },
                {
                  text: 'Weekends 8-8',
                  onPress: () => quickAction('weekends')
                },
                {
                  text: 'Clear All',
                  onPress: () => quickAction('clear_all'),
                  style: 'destructive'
                },
                {
                  text: 'Cancel',
                  style: 'cancel'
                }
              ]
            );
          }}
        >
          <Text style={styles.changeRoutineBtnText}>Change routine</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {/* Date Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateSelector}
        >
          {availableDates.map((date, index) => {
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const isAvailable = isDayAvailable(date);
            const dayOfWeek = date.getDay();

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dateCard,
                  isSelected && styles.dateCardSelected
                ]}
                onPress={() => setSelectedDate(date)}
              >
                <Text style={[
                  styles.dateCardDay,
                  isSelected && styles.dateCardDaySelected
                ]}>
                  {DAYS_SHORT[dayOfWeek]}
                </Text>
                <Text style={[
                  styles.dateCardDate,
                  isSelected && styles.dateCardDateSelected
                ]}>
                  {date.getDate()}
                </Text>
                {isAvailable ? (
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color={isSelected ? '#fff' : Colors.success}
                  />
                ) : (
                  <Ionicons
                    name="close"
                    size={16}
                    color={isSelected ? '#fff' : Colors.error}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Selected Date Info */}
        <View style={styles.dateInfo}>
          <Text style={styles.dateInfoTitle}>{formatDateForHeader(selectedDate)}</Text>
          <Text style={styles.dateInfoSubtitle}>
            {availableHours} {availableHours === 1 ? 'hour' : 'hours'} marked available
          </Text>
        </View>

        {/* Available Status Card */}
        <TouchableOpacity
          style={styles.statusCard}
          onPress={() => setExpandedHours(!expandedHours)}
        >
          <View style={styles.statusCardLeft}>
            <View style={styles.statusCheckmark}>
              <Ionicons name="checkmark" size={18} color={Colors.success} />
            </View>
            <Text style={styles.statusCardText}>Available</Text>
          </View>
          <Ionicons
            name={expandedHours ? "chevron-up" : "chevron-down"}
            size={24}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>

        {/* Update Hours Section */}
        <View style={[styles.updateHoursCard, expandedHours && styles.updateHoursCardExpanded]}>
          <TouchableOpacity
            style={styles.updateHoursHeader}
            onPress={() => setExpandedHours(!expandedHours)}
          >
            <View style={styles.updateHoursHeaderLeft}>
              <Ionicons name="remove" size={20} color={Colors.textPrimary} />
              <Text style={styles.updateHoursHeaderText}>Update your available hours</Text>
            </View>
            <Ionicons
              name={expandedHours ? "chevron-up" : "chevron-down"}
              size={24}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>

          {expandedHours && daySchedule && (
            <View style={styles.hoursList}>
              {Array.from({ length: 16 }, (_, i) => i + 8).map((hour) => {
                const slot = daySchedule.slots.find((s) => s.hour === hour);
                const available = slot?.available || false;

                return (
                  <View key={hour} style={styles.hourRow}>
                    <Text style={styles.hourRowText}>{formatHourRange(hour)}</Text>
                    <Switch
                      value={available}
                      onValueChange={() => toggleSlot(selectedDate.getDay(), hour)}
                      trackColor={{ false: '#d1d5db', true: Colors.success }}
                      thumbColor={'#fff'}
                      ios_backgroundColor="#d1d5db"
                    />
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: '#fff',
  },
  backBtn: {
    padding: 4
  },
  changeRoutineBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  changeRoutineBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  dateSelector: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  dateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    minWidth: 70,
    gap: 4,
  },
  dateCardSelected: {
    backgroundColor: Colors.textPrimary,
  },
  dateCardDay: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  dateCardDaySelected: {
    color: '#fff',
  },
  dateCardDate: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  dateCardDateSelected: {
    color: '#fff',
  },
  dateInfo: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  dateInfoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  dateInfoSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.success,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    padding: Spacing.lg,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statusCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusCheckmark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCardText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  updateHoursCard: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    overflow: 'hidden',
  },
  updateHoursCardExpanded: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  updateHoursHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  updateHoursHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  updateHoursHeaderText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
    flex: 1,
  },
  hoursList: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  hourRowText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
});
