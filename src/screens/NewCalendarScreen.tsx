import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { proApi } from '../api/proApi';
import { WeeklyRoutineModal } from '../components/calendar/WeeklyRoutineModal';
import { DayPatternEditor } from '../components/calendar/DayPatternEditor';
import { SpecificDateEditor } from '../components/calendar/SpecificDateEditor';

interface DaySchedule {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  slots: { hour: number; available: boolean }[];
}

interface DateOverride {
  date: string;
  slots: { hour: number; available: boolean }[];
}

export const NewCalendarScreen = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>([]);
  const [dateOverrides, setDateOverrides] = useState<DateOverride[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showWeeklyRoutine, setShowWeeklyRoutine] = useState(false);
  const [showDayPatternEditor, setShowDayPatternEditor] = useState(false);
  const [showDateEditor, setShowDateEditor] = useState(false);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      console.log('Loading schedule...');
      const profile = await proApi.fetchProfile();
      console.log('Schedule loaded:', {
        weeklyScheduleDays: profile.weeklySchedule?.length,
        dateOverridesCount: profile.dateOverrides?.length,
      });
      setWeeklySchedule(profile.weeklySchedule || []);
      setDateOverrides(profile.dateOverrides || []);
    } catch (error) {
      console.error('Failed to load schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableHoursForDate = (dateString: string): number => {
    const date = new Date(dateString);
    const dayOfWeek = date.getDay();

    // Check for date override first
    const override = dateOverrides.find((o) => o.date === dateString);
    if (override) {
      return override.slots.filter((s) => s.available).length;
    }

    // Fall back to weekly schedule
    const daySchedule = weeklySchedule.find((d) => d.dayOfWeek === dayOfWeek);
    if (daySchedule) {
      return daySchedule.slots.filter((s) => s.available).length;
    }

    return 0;
  };

  const getDateStatus = (dateString: string): 'full' | 'partial' | 'none' | 'past' => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date < today) {
      return 'past';
    }

    const hours = getAvailableHoursForDate(dateString);
    if (hours === 12) return 'full'; // All 12 hours available
    if (hours > 0) return 'partial';
    return 'none';
  };

  const getMarkedDates = () => {
    const marked: any = {};
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateString = date.toISOString().split('T')[0];
      const status = getDateStatus(dateString);

      marked[dateString] = {
        customStyles: {
          container: {
            backgroundColor: date.toDateString() === new Date().toDateString() ? '#F0F0F0' : 'transparent',
            borderRadius: 8,
          },
          text: {
            color: Colors.textPrimary,
            fontWeight: date.toDateString() === new Date().toDateString() ? '700' : '400',
          },
        },
      };
    }

    return marked;
  };

  const renderDayComponent = ({ date }: any) => {
    if (!date) return null;

    const dateString = date.dateString;
    const status = getDateStatus(dateString);
    const isToday = new Date(dateString).toDateString() === new Date().toDateString();

    let icon = null;
    if (status === 'full') {
      icon = <Ionicons name="checkmark" size={16} color={Colors.success} />;
    } else if (status === 'partial') {
      icon = <Ionicons name="close" size={16} color="#FFA500" />;
    } else if (status === 'past' || status === 'none') {
      icon = <Ionicons name="close-circle" size={16} color={Colors.error} />;
    }

    return (
      <TouchableOpacity
        style={[styles.dayContainer, isToday && styles.todayContainer]}
        onPress={() => {
          setSelectedDate(dateString);
          setShowDateEditor(true);
        }}
      >
        <Text style={[styles.dayText, isToday && styles.todayText]}>{date.day}</Text>
        {icon}
      </TouchableOpacity>
    );
  };

  const getAvailableDaysInMonth = (): number => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let availableDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateString = date.toISOString().split('T')[0];
      const status = getDateStatus(dateString);
      if (status === 'full' || status === 'partial') {
        availableDays++;
      }
    }

    return availableDays;
  };

  const goToToday = () => {
    setSelectedMonth(new Date());
  };

  const goToPrevMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1));
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

  const monthName = selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.todayBtn} onPress={goToToday}>
          <Text style={styles.todayBtnText}>Today</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Month Navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={goToPrevMonth} style={styles.monthNavBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{monthName}</Text>
          <TouchableOpacity onPress={goToNextMonth} style={styles.monthNavBtn}>
            <Ionicons name="chevron-forward" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Calendar */}
        <Calendar
          current={selectedMonth.toISOString().split('T')[0]}
          markedDates={getMarkedDates()}
          dayComponent={renderDayComponent}
          hideExtraDays={true}
          disableMonthChange={true}
          enableSwipeMonths={false}
          theme={{
            calendarBackground: 'transparent',
            textSectionTitleColor: Colors.textSecondary,
            selectedDayBackgroundColor: Colors.primary,
            todayTextColor: Colors.primary,
            dayTextColor: Colors.textPrimary,
            textDisabledColor: Colors.textSecondary,
            monthTextColor: Colors.textPrimary,
            textDayFontWeight: '400',
            textMonthFontWeight: '700',
            textDayHeaderFontWeight: '600',
            textDayFontSize: 16,
            textMonthFontSize: 20,
            textDayHeaderFontSize: 14,
          }}
        />

        {/* Summary */}
        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            You are available for {getAvailableDaysInMonth()} days this month
          </Text>
        </View>

        {/* View Weekly Routine */}
        <TouchableOpacity
          style={styles.routineLink}
          onPress={() => setShowWeeklyRoutine(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.routineLinkText}>View my weekly routine</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
      </ScrollView>

      {/* Modals */}
      <WeeklyRoutineModal
        visible={showWeeklyRoutine}
        onClose={() => setShowWeeklyRoutine(false)}
        weeklySchedule={weeklySchedule}
        onEditDay={(dayOfWeek) => {
          setSelectedDayOfWeek(dayOfWeek);
          setShowWeeklyRoutine(false);
          setShowDayPatternEditor(true);
        }}
        onRefresh={loadSchedule}
      />

      <DayPatternEditor
        visible={showDayPatternEditor}
        onClose={() => {
          setShowDayPatternEditor(false);
          // Reload schedule when modal closes to ensure fresh data
          loadSchedule();
        }}
        dayOfWeek={selectedDayOfWeek}
        weeklySchedule={weeklySchedule}
        onSave={async () => {
          console.log('DayPatternEditor onSave called');
          await loadSchedule();
        }}
      />

      <SpecificDateEditor
        visible={showDateEditor}
        onClose={() => {
          setShowDateEditor(false);
          // Reload schedule when modal closes to ensure fresh data
          loadSchedule();
        }}
        date={selectedDate}
        weeklySchedule={weeklySchedule}
        dateOverrides={dateOverrides}
        onSave={async () => {
          console.log('SpecificDateEditor onSave called');
          await loadSchedule();
        }}
        onChangeRoutine={() => {
          setShowDateEditor(false);
          setShowWeeklyRoutine(true);
        }}
      />
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
  },
  backBtn: {
    padding: 4,
  },
  todayBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  todayBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  scroll: {
    padding: Spacing.lg,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  monthNavBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  monthTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  dayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  todayContainer: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
  },
  dayText: {
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  todayText: {
    fontWeight: '700',
  },
  summary: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  summaryText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  routineLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  routineLinkText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
});
