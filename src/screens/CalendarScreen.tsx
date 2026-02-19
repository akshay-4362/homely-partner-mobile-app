import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import { proApi } from '../api/proApi';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { Button } from '../components/common/Button';
import { Loader } from '../components/common/Loader';
import { useAppSelector } from '../hooks/useAppSelector';

const HOURS = Array.from({ length: 12 }, (_, i) => {
  const h = i + 8; // 8am to 7pm
  const fmt = (n: number) => `${n < 10 ? '0' : ''}${n}:00`;
  return { label: `${fmt(h)} – ${fmt(h + 1)}`, start: fmt(h), end: fmt(h + 1) };
});

export const CalendarScreen = () => {
  const navigation = useNavigation();
  const { items: bookings } = useAppSelector((s) => s.bookings);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [allSlots, setAllSlots] = useState<any[]>([]);
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [selectedDateHours, setSelectedDateHours] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Booking dates for dots
  const bookingDates = bookings.reduce((acc, b) => {
    const d = b.scheduledAt.split('T')[0];
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await proApi.fetchProfile();
        const profile = data?.data || data;
        const slots = profile?.availability || [];
        setAllSlots(slots);
        const dateDates = new Set<string>(
          slots
            .filter((s: any) => /^\d{4}-\d{2}-\d{2}$/.test(s.day))
            .map((s: any) => s.day)
        );
        setAvailableDates(dateDates);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const today = new Date().toISOString().split('T')[0];

  const onDayPress = (day: { dateString: string }) => {
    const d = day.dateString;
    setSelectedDate(d);

    // Load existing hours for this date
    const existing = allSlots.find((s) => s.day === d);
    if (existing) {
      // Expand into hour slots
      const hours = new Set<string>();
      HOURS.forEach((h) => {
        if (h.start >= existing.start && h.start < existing.end) {
          hours.add(h.start);
        }
      });
      setSelectedDateHours(hours);
    } else {
      setSelectedDateHours(new Set());
    }
  };

  const toggleHour = (start: string) => {
    setSelectedDateHours((prev) => {
      const next = new Set(prev);
      if (next.has(start)) next.delete(start);
      else next.add(start);
      return next;
    });
  };

  const saveDate = async () => {
    if (!selectedDate) return;
    setSaving(true);
    try {
      const hours = Array.from(selectedDateHours).sort();
      const isAvailable = hours.length > 0;

      let newSlots = allSlots.filter((s) => s.day !== selectedDate);
      if (isAvailable) {
        const startHour = hours[0];
        const lastHour = hours[hours.length - 1];
        const endH = parseInt(lastHour.split(':')[0]) + 1;
        const endHour = `${endH < 10 ? '0' : ''}${endH}:00`;
        newSlots = [...newSlots, { day: selectedDate, start: startHour, end: endHour }];
      }

      await proApi.updateAvailability({ availability: newSlots });
      setAllSlots(newSlots);

      if (isAvailable) {
        setAvailableDates((prev) => new Set([...prev, selectedDate]));
      } else {
        setAvailableDates((prev) => { const n = new Set(prev); n.delete(selectedDate); return n; });
      }

      Alert.alert('Saved', `Availability for ${selectedDate} updated`);
    } catch {
      Alert.alert('Error', 'Failed to save');
    }
    setSaving(false);
  };

  // Build marked dates for calendar
  const markedDates: Record<string, any> = {};
  availableDates.forEach((d) => {
    markedDates[d] = { marked: true, dotColor: Colors.success, selected: d === selectedDate, selectedColor: Colors.primaryBg };
  });
  Object.keys(bookingDates).forEach((d) => {
    markedDates[d] = {
      ...markedDates[d],
      marked: true,
      dotColor: Colors.primary,
    };
  });
  if (selectedDate) {
    markedDates[selectedDate] = {
      ...markedDates[selectedDate],
      selected: true,
      selectedColor: Colors.primary,
      selectedTextColor: '#fff',
    };
  }

  if (loading) return <Loader text="Loading calendar..." />;

  const selectedSlot = selectedDate ? allSlots.find((s) => s.day === selectedDate) : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Calendar</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Legend */}
        <View style={styles.legend}>
          <LegendDot color={Colors.primary} label="Bookings" />
          <LegendDot color={Colors.success} label="Available" />
          <LegendDot color={Colors.primaryBg} label="Selected" filled />
        </View>

        {/* Calendar */}
        <Calendar
          current={today}
          minDate={today}
          onDayPress={onDayPress}
          markedDates={markedDates}
          theme={{
            backgroundColor: Colors.background,
            calendarBackground: Colors.surface,
            textSectionTitleColor: Colors.textSecondary,
            selectedDayBackgroundColor: Colors.primary,
            selectedDayTextColor: '#ffffff',
            todayTextColor: Colors.primary,
            dayTextColor: Colors.textPrimary,
            textDisabledColor: Colors.gray300,
            dotColor: Colors.primary,
            selectedDotColor: '#ffffff',
            arrowColor: Colors.primary,
            monthTextColor: Colors.textPrimary,
            indicatorColor: Colors.primary,
            textDayFontWeight: '500',
            textMonthFontWeight: '700',
            textDayHeaderFontSize: 12,
          }}
          style={styles.cal}
        />

        {/* Selected date panel */}
        {selectedDate && (
          <View style={styles.datePanel}>
            <Text style={styles.datePanelTitle}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            {bookingDates[selectedDate] && (
              <View style={styles.bookingDot}>
                <Ionicons name="briefcase" size={14} color={Colors.primary} />
                <Text style={styles.bookingDotText}>{bookingDates[selectedDate]} booking(s) scheduled</Text>
              </View>
            )}

            <Text style={styles.hoursTitle}>Mark Available Hours</Text>
            <View style={styles.hoursGrid}>
              {HOURS.map((h) => {
                const isOn = selectedDateHours.has(h.start);
                return (
                  <TouchableOpacity
                    key={h.start}
                    style={[styles.hourChip, isOn && styles.hourChipOn]}
                    onPress={() => toggleHour(h.start)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.hourChipText, isOn && styles.hourChipTextOn]}>{h.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Button
              label={`Save ${selectedDate}`}
              onPress={saveDate}
              loading={saving}
              fullWidth
              style={styles.saveBtn}
            />
          </View>
        )}

        {!selectedDate && (
          <View style={styles.tapHint}>
            <Ionicons name="hand-left-outline" size={28} color={Colors.gray300} />
            <Text style={styles.tapHintText}>Tap a date to mark your availability</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const LegendDot = ({ color, label, filled }: { color: string; label: string; filled?: boolean }) => (
  <View style={styles.legendItem}>
    <View style={[styles.dot, { backgroundColor: color, borderWidth: filled ? 0 : 1, borderColor: color }]} />
    <Text style={styles.legendLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingTop: 56, paddingBottom: Spacing.md,
  },
  backBtn: { padding: 4 },
  navTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  legend: { flexDirection: 'row', gap: Spacing.xl, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12, color: Colors.textSecondary },
  cal: { borderRadius: BorderRadius.xl, marginHorizontal: Spacing.xl, overflow: 'hidden', marginBottom: Spacing.md },
  datePanel: {
    margin: Spacing.xl, backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl, padding: Spacing.xl,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  datePanelTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  bookingDot: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.md },
  bookingDotText: { fontSize: 13, color: Colors.primary },
  hoursTitle: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.md },
  hoursGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.xl },
  hourChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: BorderRadius.md, backgroundColor: Colors.gray100,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  hourChipOn: { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
  hourChipText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  hourChipTextOn: { color: Colors.primary, fontWeight: '700' },
  saveBtn: { borderRadius: BorderRadius.lg },
  tapHint: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  tapHintText: { fontSize: 14, color: Colors.textTertiary },
});
