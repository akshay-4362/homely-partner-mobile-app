import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../theme/colors';

interface HourlySlot {
  hour: number;
  available: boolean;
}

interface DaySchedule {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  slots: HourlySlot[];
}

interface Props {
  visible: boolean;
  onClose: () => void;
  weeklySchedule: DaySchedule[];
  onEditDay: (dayOfWeek: number) => void;
  onRefresh: () => void;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const WeeklyRoutineModal: React.FC<Props> = ({
  visible,
  onClose,
  weeklySchedule,
  onEditDay,
  onRefresh,
}) => {
  // Calculate total weekly hours
  const totalWeeklyHours = useMemo(() => {
    let total = 0;
    for (const day of weeklySchedule) {
      total += day.slots.filter((s) => s.available).length;
    }
    return total;
  }, [weeklySchedule]);

  const monthlyHours = Math.round(totalWeeklyHours * 4.33);
  const isLowHours = monthlyHours < 270;

  // Get time range for a specific day
  const getTimeRangeForDay = (dayOfWeek: number): string => {
    const daySchedule = weeklySchedule.find((d) => d.dayOfWeek === dayOfWeek);
    if (!daySchedule || daySchedule.slots.length === 0) {
      return 'Not set';
    }

    const availableSlots = daySchedule.slots.filter((s) => s.available);
    if (availableSlots.length === 0) {
      return 'Unavailable';
    }

    // Find first and last available hours
    const hours = availableSlots.map((s) => s.hour).sort((a, b) => a - b);
    const firstHour = hours[0];
    const lastHour = hours[hours.length - 1] + 1; // +1 because slot is start of hour

    const formatHour = (hour: number) => {
      const period = hour >= 12 ? 'pm' : 'am';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:00 ${period}`;
    };

    return `${formatHour(firstHour)} - ${formatHour(lastHour)}`;
  };

  // Check if day is fully available (all slots)
  const isDayFullyAvailable = (dayOfWeek: number): boolean => {
    const daySchedule = weeklySchedule.find((d) => d.dayOfWeek === dayOfWeek);
    if (!daySchedule || daySchedule.slots.length === 0) return false;
    return daySchedule.slots.every((s) => s.available);
  };

  // Weekend days (Saturday=6, Sunday=0)
  const weekendDays = [6, 0]; // Saturday, Sunday
  const weekdayDays = [1, 2, 3, 4, 5]; // Monday to Friday

  const renderDayRow = (dayOfWeek: number, dayName: string) => {
    const timeRange = getTimeRangeForDay(dayOfWeek);
    const isAvailable = timeRange !== 'Unavailable' && timeRange !== 'Not set';

    return (
      <TouchableOpacity
        key={dayOfWeek}
        style={styles.dayRow}
        onPress={() => onEditDay(dayOfWeek)}
        activeOpacity={0.7}
      >
        <View style={styles.dayRowLeft}>
          {isAvailable && (
            <View style={styles.checkmark}>
              <Ionicons name="checkmark" size={16} color="#fff" />
            </View>
          )}
          <View style={styles.dayRowText}>
            <Text style={styles.dayName}>All {dayName}s</Text>
            <Text style={styles.timeRange}>{timeRange}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.learnMoreBtn} onPress={() => {}}>
            <Text style={styles.learnMoreText}>Learn more</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Warning Banner */}
          {isLowHours && (
            <View style={styles.warningBanner}>
              <View style={styles.warningIcon}>
                <Ionicons name="alert-circle" size={32} color="#F57C00" />
              </View>
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Routine doesn't look good</Text>
                <Text style={styles.warningText}>
                  Only {monthlyHours} hours marked available. Mark at least 270 hours available.
                </Text>
              </View>
            </View>
          )}

          {/* Weekends Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Weekends</Text>
              <View style={styles.demandBadge}>
                <Ionicons name="flash" size={14} color="#fff" />
                <Text style={styles.demandBadgeText}>HIGH DEMAND</Text>
              </View>
            </View>
            {weekendDays.map((dayOfWeek) => renderDayRow(dayOfWeek, DAY_NAMES[dayOfWeek]))}
          </View>

          {/* Weekdays Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weekdays</Text>
            {weekdayDays.map((dayOfWeek) => renderDayRow(dayOfWeek, DAY_NAMES[dayOfWeek]))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  closeBtn: {
    padding: 4,
  },
  learnMoreBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  learnMoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  warningIcon: {
    marginTop: 4,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  warningText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  demandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.textPrimary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  demandBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  dayRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayRowText: {
    flex: 1,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  timeRange: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
