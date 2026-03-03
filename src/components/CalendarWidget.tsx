import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { useAppSelector } from '../hooks/useAppSelector';

interface DayInfo {
  date: Date;
  dateString: string;
  dayName: string;
  dayNumber: number;
  month: string;
  isPaused: boolean;
}

export const CalendarWidget = () => {
  const navigation = useNavigation<any>();
  const { balance: creditBalance } = useAppSelector((s) => s.credit);
  const [days, setDays] = useState<DayInfo[]>([]);

  useEffect(() => {
    generateDays();
  }, [creditBalance]);

  const generateDays = () => {
    const today = new Date();
    const nextDays: DayInfo[] = [];

    // Generate next 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);

      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const dayNumber = date.getDate();
      const dateString = date.toISOString().split('T')[0];

      nextDays.push({
        date,
        dateString,
        dayName,
        dayNumber,
        month,
        isPaused: creditBalance === 0, // Jobs paused if no credits
      });
    }

    setDays(nextDays);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {days.map((day, index) => {
          const today = isToday(day.date);
          return (
            <TouchableOpacity
              key={day.dateString}
              style={[
                styles.dayCard,
                today && styles.todayCard,
                index === 0 && { marginLeft: 0 },
              ]}
              onPress={() => navigation.navigate('Calendar')}
              activeOpacity={0.7}
            >
              <View style={styles.dayHeader}>
                <Text style={[styles.dayName, today && styles.todayText]}>
                  {day.dayName}, {day.month} {day.dayNumber < 10 ? `0${day.dayNumber}` : day.dayNumber}
                </Text>
              </View>

              <View style={styles.statusRow}>
                {day.isPaused ? (
                  <>
                    <Ionicons name="pause-circle" size={16} color={Colors.error} />
                    <Text style={styles.statusText}>JOBS PAUSED</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                    <Text style={[styles.statusText, { color: Colors.success }]}>ACTIVE</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Calendar Icon */}
      <TouchableOpacity
        style={styles.calendarBtn}
        onPress={() => navigation.navigate('Calendar')}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={24} color={Colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  dayCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.divider,
    minWidth: 160,
  },
  todayCard: {
    backgroundColor: Colors.primaryBg,
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  dayHeader: {
    marginBottom: Spacing.sm,
  },
  dayName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  todayText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.error,
    letterSpacing: 0.5,
  },
  calendarBtn: {
    padding: Spacing.md,
    marginRight: Spacing.sm,
  },
});
