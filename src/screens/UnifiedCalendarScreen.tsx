import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { useAppSelector } from '../hooks/useAppSelector';
import { proApi } from '../api/proApi';
import { formatTime, formatDateOnly } from '../utils/format';

interface DaySchedule {
  day: string; // 'monday', 'tuesday', etc.
  hours: boolean[]; // 16 hours: 8 AM to 11 PM (index 0 = 8 AM, 15 = 11 PM)
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 16 }, (_, i) => 8 + i); // 8 AM to 11 PM

export const UnifiedCalendarScreen = () => {
  const { items: bookings } = useAppSelector((s) => s.bookings);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'routine-edit'>('calendar');
  const [selectedDayIndex, setSelectedDayIndex] = useState(0); // For routine editor
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>(
    DAYS.map((day) => ({
      day: day.toLowerCase(),
      hours: Array(16).fill(true), // Default all available
    }))
  );
  const [saving, setSaving] = useState(false);

  // Generate week dates for strip (current week + 2 weeks forward)
  const weekDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 21; i++) {
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
      setLoading(true);
      const profile = await proApi.fetchProfile();
      // If profile has weeklySchedule, load it
      if (profile.weeklySchedule) {
        setWeeklySchedule(profile.weeklySchedule);
      }
    } catch (error) {
      console.error('Failed to load schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSchedule = async () => {
    try {
      setSaving(true);
      await proApi.updateAvailability({ weeklySchedule });
      Alert.alert('Success', 'Availability updated successfully');
      setViewMode('calendar');
    } catch (error) {
      Alert.alert('Error', 'Failed to update availability');
    } finally {
      setSaving(false);
    }
  };

  // Calculate total hours
  const totalHours = useMemo(() => {
    return weeklySchedule.reduce((sum, day) => {
      return sum + day.hours.filter(Boolean).length;
    }, 0);
  }, [weeklySchedule]);

  const monthlyHours = totalHours * 4; // Approximate monthly hours

  // Get bookings for selected date
  const dayBookings = useMemo(() => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    return bookings.filter((b) => {
      const bookingDate = new Date(b.scheduledAt).toISOString().split('T')[0];
      return bookingDate === dateStr && b.status !== 'cancelled';
    });
  }, [selectedDate, bookings]);

  // Check if a date has availability
  const hasAvailability = (date: Date) => {
    const dayIndex = date.getDay(); // 0 = Sunday, 6 = Saturday
    const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1; // Convert to Monday = 0
    const daySchedule = weeklySchedule[adjustedIndex];
    return daySchedule?.hours.some((h) => h) || false;
  };

  // Toggle hour availability
  const toggleHour = (dayIndex: number, hourIndex: number) => {
    setWeeklySchedule((prev) => {
      const updated = [...prev];
      updated[dayIndex] = {
        ...updated[dayIndex],
        hours: [...updated[dayIndex].hours],
      };
      updated[dayIndex].hours[hourIndex] = !updated[dayIndex].hours[hourIndex];
      return updated;
    });
  };

  // Quick actions
  const applyWeekdays9to5 = () => {
    setWeeklySchedule((prev) => {
      return prev.map((day, idx) => {
        if (idx < 5) {
          // Monday-Friday
          const hours = Array(16).fill(false);
          // 9 AM to 5 PM (hours[1] to hours[9])
          for (let i = 1; i <= 9; i++) {
            hours[i] = true;
          }
          return { ...day, hours };
        }
        return day;
      });
    });
  };

  const applyWeekends8to8 = () => {
    setWeeklySchedule((prev) => {
      return prev.map((day, idx) => {
        if (idx >= 5) {
          // Saturday-Sunday
          const hours = Array(16).fill(false);
          // 8 AM to 8 PM (hours[0] to hours[12])
          for (let i = 0; i <= 12; i++) {
            hours[i] = true;
          }
          return { ...day, hours };
        }
        return day;
      });
    });
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

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calendar & Routine</Text>
        <View style={styles.hoursBadge}>
          <Ionicons name="flash" size={16} color={Colors.primary} />
          <Text style={styles.hoursBadgeText}>{totalHours}h</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Weekly Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekStrip}
        >
          {weekDates.map((date, idx) => {
            const isSelected =
              date.toISOString().split('T')[0] ===
              selectedDate.toISOString().split('T')[0];
            const isToday =
              date.toISOString().split('T')[0] ===
              new Date().toISOString().split('T')[0];
            const available = hasAvailability(date);

            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.dateChip,
                  isSelected && styles.dateChipSelected,
                  isToday && styles.dateChipToday,
                ]}
                onPress={() => setSelectedDate(date)}
              >
                <Text
                  style={[
                    styles.dateDayName,
                    isSelected && styles.dateTextSelected,
                  ]}
                >
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </Text>
                <Text
                  style={[
                    styles.dateDayNumber,
                    isSelected && styles.dateTextSelected,
                  ]}
                >
                  {date.getDate()}
                </Text>
                <View
                  style={[
                    styles.availabilityDot,
                    { backgroundColor: available ? Colors.success : Colors.gray300 },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {viewMode === 'calendar' ? (
          <>
            {/* Selected Date Schedule */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>

              {dayBookings.length > 0 ? (
                <View style={styles.bookingsList}>
                  {dayBookings.map((booking) => (
                    <View key={booking.id} style={styles.bookingCard}>
                      <View style={styles.bookingTime}>
                        <Ionicons name="time-outline" size={16} color={Colors.primary} />
                        <Text style={styles.bookingTimeText}>
                          {formatTime(booking.scheduledAt)}
                        </Text>
                      </View>
                      <Text style={styles.bookingCustomer}>{booking.customerName}</Text>
                      <Text style={styles.bookingService}>{booking.serviceName}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={32} color={Colors.gray300} />
                  <Text style={styles.emptyStateText}>No bookings scheduled</Text>
                </View>
              )}
            </View>

            {/* Change Routine Button */}
            <TouchableOpacity
              style={styles.changeRoutineBtn}
              onPress={() => setViewMode('routine-edit')}
            >
              <Ionicons name="settings-outline" size={20} color={Colors.primary} />
              <Text style={styles.changeRoutineBtnText}>Change Routine</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Routine Editor */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Edit Weekly Routine</Text>

              {/* Day Selector Tabs */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dayTabs}
              >
                {DAYS.map((day, idx) => {
                  const isWeekend = idx >= 5;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.dayTab,
                        selectedDayIndex === idx && styles.dayTabActive,
                        isWeekend && styles.dayTabWeekend,
                      ]}
                      onPress={() => setSelectedDayIndex(idx)}
                    >
                      <Text
                        style={[
                          styles.dayTabText,
                          selectedDayIndex === idx && styles.dayTabTextActive,
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Hourly Grid */}
              <View style={styles.hourlyGrid}>
                {HOURS.map((hour, idx) => {
                  const isAvailable = weeklySchedule[selectedDayIndex].hours[idx];
                  const timeStr = hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;

                  return (
                    <View key={idx} style={styles.hourRow}>
                      <Text style={styles.hourLabel}>{timeStr}</Text>
                      <Switch
                        value={isAvailable}
                        onValueChange={() => toggleHour(selectedDayIndex, idx)}
                        trackColor={{ false: Colors.gray300, true: Colors.primaryBg }}
                        thumbColor={isAvailable ? Colors.primary : Colors.gray400}
                      />
                    </View>
                  );
                })}
              </View>

              {/* Quick Actions */}
              <View style={styles.quickActions}>
                <TouchableOpacity
                  style={styles.quickActionBtn}
                  onPress={applyWeekdays9to5}
                >
                  <Text style={styles.quickActionText}>9-5 Weekdays</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickActionBtn}
                  onPress={applyWeekends8to8}
                >
                  <Text style={styles.quickActionText}>8-8 Weekends</Text>
                </TouchableOpacity>
              </View>

              {/* Hours Summary */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryText}>
                  {totalHours} hours selected per week ({monthlyHours}h/month)
                </Text>
                {monthlyHours < 270 && (
                  <View style={styles.warningBanner}>
                    <Ionicons name="warning" size={16} color={Colors.error} />
                    <Text style={styles.warningText}>
                      Mark at least 270 hours available per month
                    </Text>
                  </View>
                )}
              </View>

              {/* Save Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setViewMode('calendar')}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={saveSchedule}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Routine</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: 16,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  hoursBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
  },
  hoursBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  weekStrip: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  dateChip: {
    width: 60,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dateChipToday: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  dateDayName: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  dateDayNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  dateTextSelected: {
    color: '#fff',
  },
  availabilityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  section: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  bookingsList: {
    gap: Spacing.md,
  },
  bookingCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  bookingTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  bookingTimeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  bookingCustomer: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  bookingService: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: Spacing.sm,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  changeRoutineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  changeRoutineBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  dayTabs: {
    gap: Spacing.sm,
  },
  dayTab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayTabWeekend: {
    backgroundColor: '#FFF5E6',
  },
  dayTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  dayTabTextActive: {
    color: '#fff',
  },
  hourlyGrid: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  hourLabel: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  quickActionBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  summaryCard: {
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.errorBg,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  warningText: {
    fontSize: 12,
    color: Colors.error,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
