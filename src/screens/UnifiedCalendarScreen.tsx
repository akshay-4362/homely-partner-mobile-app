import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StatusBar,
  Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { proApi } from '../api/proApi';

interface DaySchedule {
  day: string;
  hours: boolean[]; // 24 hours
}

const DAYS_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export const UnifiedCalendarScreen = () => {
  const navigation = useNavigation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>(
    Array(7).fill(null).map((_, idx) => {
      // Create 24 hours array with only 8 AM to 8 PM (hours 8-20) set to true
      const hours = Array(24).fill(false);
      for (let h = 8; h <= 20; h++) {
        hours[h] = true; // 8 AM to 8 PM all available by default
      }
      return {
        day: DAYS_SHORT[idx].toLowerCase(),
        hours,
      };
    })
  );
  const [showHoursEditor, setShowHoursEditor] = useState(true);
  const [saving, setSaving] = useState(false);

  // Generate next 7 days for strip
  const weekDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, []);

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      const profile = await proApi.fetchProfile();
      if (profile.weeklySchedule && Array.isArray(profile.weeklySchedule)) {
        // Convert from backend format (13 hours) to full day (24 hours)
        const fullSchedule = profile.weeklySchedule.map((day: any) => {
          const fullHours = Array(24).fill(false);
          // Backend hours are 8 AM - 8 PM (indices 0-12 = hours 8-20)
          if (day.hours && Array.isArray(day.hours)) {
            day.hours.forEach((available: boolean, idx: number) => {
              if (idx < 13) {
                fullHours[8 + idx] = available; // Map to actual hour
              }
            });
          }
          return { ...day, hours: fullHours };
        });
        setWeeklySchedule(fullSchedule);
      }
    } catch (error) {
      console.error('Failed to load schedule:', error);
    }
  };

  const saveSchedule = async () => {
    try {
      setSaving(true);
      // Convert back to backend format (8 AM - 8 PM only)
      const backendSchedule = weeklySchedule.map(day => ({
        day: day.day,
        hours: day.hours.slice(8, 21), // Extract hours 8-20 (13 hours)
      }));
      await proApi.updateAvailability({ weeklySchedule: backendSchedule });
      Alert.alert('Success', 'Availability updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update availability');
    } finally {
      setSaving(false);
    }
  };

  // Get selected day's schedule
  const selectedDayIndex = selectedDate.getDay(); // 0 = Sunday
  const selectedDaySchedule = weeklySchedule[selectedDayIndex];

  // Count hours marked available for selected day
  const hoursAvailable = useMemo(() => {
    if (!selectedDaySchedule || !selectedDaySchedule.hours) return 0;
    return selectedDaySchedule.hours.filter(Boolean).length;
  }, [selectedDaySchedule]);

  // Check if date has any availability
  const hasAvailability = (date: Date) => {
    const dayIdx = date.getDay();
    const schedule = weeklySchedule[dayIdx];
    return schedule?.hours?.some(h => h) || false;
  };

  // Toggle hour
  const toggleHour = (hourIdx: number) => {
    setWeeklySchedule(prev => {
      const updated = [...prev];
      updated[selectedDayIndex] = {
        ...updated[selectedDayIndex],
        hours: [...updated[selectedDayIndex].hours],
      };
      updated[selectedDayIndex].hours[hourIdx] = !updated[selectedDayIndex].hours[hourIdx];
      return updated;
    });
  };

  // Format date for display
  const formatSelectedDate = () => {
    return selectedDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.changeRoutineBtn} onPress={saveSchedule}>
          <Text style={styles.changeRoutineText}>
            {saving ? 'Saving...' : 'Save routine'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Date Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateStrip}
        >
          {weekDates.map((date, idx) => {
            const isSelected =
              date.toDateString() === selectedDate.toDateString();
            const available = hasAvailability(date);
            const dayName = DAYS_SHORT[date.getDay()];

            return (
              <TouchableOpacity
                key={idx}
                style={[styles.dateChip, isSelected && styles.dateChipSelected]}
                onPress={() => setSelectedDate(date)}
              >
                <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>
                  {dayName}
                </Text>
                <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>
                  {date.getDate()}
                </Text>
                <Ionicons
                  name={available ? 'checkmark' : 'close'}
                  size={16}
                  color={available ? Colors.success : Colors.error}
                  style={styles.availIcon}
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Selected Date Info */}
        <View style={styles.dateInfo}>
          <Text style={styles.dateTitle}>{formatSelectedDate()}</Text>
          <Text style={styles.hoursText}>
            {hoursAvailable} hours marked available
          </Text>
        </View>

        {/* Available Status */}
        <View style={styles.statusCard}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
          <Text style={styles.statusText}>Available</Text>
          <Ionicons
            name="chevron-down"
            size={20}
            color={Colors.textSecondary}
            style={styles.chevronIcon}
          />
        </View>

        {/* Update Hours Section */}
        <TouchableOpacity
          style={styles.updateSection}
          onPress={() => setShowHoursEditor(!showHoursEditor)}
        >
          <View style={styles.updateHeader}>
            <Ionicons name="remove" size={20} color={Colors.textSecondary} />
            <Text style={styles.updateTitle}>Update your available hours</Text>
          </View>
          <Ionicons
            name={showHoursEditor ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>

        {/* Hourly Slots - 8 AM to 8 PM only */}
        {showHoursEditor && (
          <View style={styles.hoursContainer}>
            {Array.from({ length: 13 }, (_, idx) => {
              const hour = 8 + idx; // Start at 8 AM (8) to 8 PM (20)
              const nextHour = hour + 1;
              const formatHour = (h: number) => {
                const period = h < 12 ? 'AM' : 'PM';
                const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
                return `${displayHour.toString().padStart(2, '0')}:00 ${period}`;
              };

              const timeLabel = `${formatHour(hour)} - ${formatHour(nextHour)}`;
              const isAvailable = selectedDaySchedule?.hours?.[hour] || false;

              return (
                <View key={hour} style={styles.hourRow}>
                  <Text style={styles.hourLabel}>{timeLabel}</Text>
                  <Switch
                    value={isAvailable}
                    onValueChange={() => toggleHour(hour)}
                    trackColor={{ false: Colors.gray300, true: '#4CD964' }}
                    thumbColor="#fff"
                    ios_backgroundColor={Colors.gray300}
                  />
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    padding: 8,
  },
  changeRoutineBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#fff',
  },
  changeRoutineText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  dateStrip: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  dateChip: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: '#fff',
    minWidth: 60,
  },
  dateChipSelected: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayName: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  dayNameSelected: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  dayNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  dayNumberSelected: {
    color: Colors.textPrimary,
  },
  availIcon: {
    marginTop: 2,
  },
  dateInfo: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  dateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  hoursText: {
    fontSize: 14,
    color: Colors.success,
    fontWeight: '500',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  statusText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  chevronIcon: {
    marginLeft: 'auto',
  },
  updateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: '#F7F5FF',
  },
  updateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  updateTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  hoursContainer: {
    backgroundColor: '#F7F5FF',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  hourLabel: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
});
