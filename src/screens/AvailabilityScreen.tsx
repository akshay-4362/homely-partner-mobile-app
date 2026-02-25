import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, StatusBar,
  Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { proApi } from '../api/proApi';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { Button } from '../components/common/Button';
import { Loader } from '../components/common/Loader';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 14 }, (_, i) => {
  const h = i + 7; // 7am to 8pm
  const fmt = (n: number) => `${n < 10 ? '0' : ''}${n}:00`;
  return { label: `${fmt(h)} - ${fmt(h + 1)}`, key: `${fmt(h)}-${fmt(h + 1)}` };
});

const WEEKEND = ['Sat', 'Sun'];
const WEEKDAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

interface DaySlot {
  day: string;
  active: boolean;
  start: string;
  end: string;
}

export const AvailabilityScreen = () => {
  const navigation = useNavigation();
  const [slots, setSlots] = useState<DaySlot[]>(
    DAYS.map((d) => ({
      day: d,
      active: !['Fri'].includes(d),
      start: WEEKEND.includes(d) ? '08:00' : '10:00',
      end: '17:00',
    }))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await proApi.fetchProfile();
        const profile = data?.data || data;
        if (profile?.availability?.length > 0) {
          const loaded = DAYS.map((d) => {
            const found = profile.availability.find((a: any) => a.day === d);
            return found
              ? { day: d, active: true, start: found.start, end: found.end }
              : { day: d, active: false, start: '10:00', end: '17:00' };
          });
          setSlots(loaded);
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const toggle = (day: string, active: boolean) =>
    setSlots((prev) => prev.map((s) => s.day === day ? { ...s, active } : s));

  const setTime = (day: string, key: 'start' | 'end', value: string) =>
    setSlots((prev) => prev.map((s) => s.day === day ? { ...s, [key]: value } : s));

  const save = async () => {
    setSaving(true);
    try {
      const availability = slots.filter((s) => s.active).map((s) => ({
        day: s.day, start: s.start, end: s.end,
      }));
      await proApi.updateAvailability({ availability });
      Alert.alert('Saved', 'Availability updated successfully');
    } catch {
      Alert.alert('Error', 'Failed to save availability');
    }
    setSaving(false);
  };

  if (loading) return <Loader text="Loading availability..." />;

  const totalHours = slots
    .filter((s) => s.active)
    .reduce((acc, s) => {
      const [sh] = s.start.split(':').map(Number);
      const [eh] = s.end.split(':').map(Number);
      return acc + Math.max(0, eh - sh);
    }, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Availability</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* Hours banner */}
      <View style={[styles.banner, totalHours >= 40 ? styles.bannerGood : styles.bannerWarn]}>
        <Ionicons
          name={totalHours >= 40 ? 'checkmark-circle' : 'alert-circle'}
          size={18}
          color={totalHours >= 40 ? Colors.success : Colors.warning}
        />
        <Text style={[styles.bannerText, { color: totalHours >= 40 ? Colors.success : Colors.warning }]}>
          {totalHours} hours marked available
          {totalHours < 40 ? ` • Mark at least 40 hours` : ' • Looking good!'}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Weekends */}
        <View style={styles.groupHeader}>
          <Text style={styles.groupTitle}>Weekends</Text>
          <View style={styles.demandBadge}>
            <Ionicons name="flash" size={12} color="#fff" />
            <Text style={styles.demandText}>HIGH DEMAND</Text>
          </View>
        </View>

        {slots.filter((s) => WEEKEND.includes(s.day)).map((s) => (
          <DayRow key={s.day} slot={s} expanded={expandedDay === s.day} onToggle={toggle}
            onExpand={() => setExpandedDay(expandedDay === s.day ? null : s.day)} onSetTime={setTime} />
        ))}

        <View style={styles.groupHeader}>
          <Text style={styles.groupTitle}>Weekdays</Text>
        </View>

        {slots.filter((s) => WEEKDAY.includes(s.day)).map((s) => (
          <DayRow key={s.day} slot={s} expanded={expandedDay === s.day} onToggle={toggle}
            onExpand={() => setExpandedDay(expandedDay === s.day ? null : s.day)} onSetTime={setTime} />
        ))}

        <Button label="Save Availability" onPress={save} loading={saving} fullWidth size="lg" style={styles.saveBtn} />
      </ScrollView>
    </SafeAreaView>
  );
};

const DayRow = ({
  slot, expanded, onToggle, onExpand, onSetTime,
}: {
  slot: DaySlot;
  expanded: boolean;
  onToggle: (d: string, a: boolean) => void;
  onExpand: () => void;
  onSetTime: (d: string, k: 'start' | 'end', v: string) => void;
}) => (
  <View style={styles.dayCard}>
    <TouchableOpacity style={styles.dayRow} onPress={onExpand} activeOpacity={0.7}>
      <View style={[styles.activeIcon, { backgroundColor: slot.active ? Colors.successBg : Colors.errorBg }]}>
        <Ionicons
          name={slot.active ? 'checkmark' : 'close'}
          size={14}
          color={slot.active ? Colors.success : Colors.error}
        />
      </View>
      <View style={styles.dayInfo}>
        <Text style={styles.dayName}>All {slot.day === 'Mon' ? 'Mondays' : slot.day === 'Tue' ? 'Tuesdays' : slot.day === 'Wed' ? 'Wednesdays' : slot.day === 'Thu' ? 'Thursdays' : slot.day === 'Fri' ? 'Fridays' : slot.day === 'Sat' ? 'Saturdays' : 'Sundays'}</Text>
        <Text style={styles.dayTime}>
          {slot.active ? `${slot.start} – ${slot.end}` : 'Unavailable'}
        </Text>
      </View>
      <Switch
        value={slot.active}
        onValueChange={(v) => onToggle(slot.day, v)}
        thumbColor={slot.active ? Colors.primary : Colors.gray400}
        trackColor={{ false: Colors.gray200, true: Colors.primaryLight }}
      />
      <Ionicons
        name={expanded ? 'chevron-up' : 'chevron-down'}
        size={16}
        color={Colors.textTertiary}
        style={{ marginLeft: 4 }}
      />
    </TouchableOpacity>

    {expanded && slot.active && (
      <View style={styles.hoursPanel}>
        <Text style={styles.hoursPanelTitle}>Update available hours</Text>
        {HOURS.map((h) => {
          const [start] = h.key.split('-');
          const isOn = slot.start <= start && start < slot.end;
          return (
            <TouchableOpacity
              key={h.key}
              style={styles.hourRow}
              onPress={() => {
                // Toggle individual hour
                const [sh] = h.key.split('-');
                if (!isOn) {
                  // Extend range
                  const newStart = sh < slot.start ? sh : slot.start;
                  const [, eh] = h.key.split('-');
                  const newEnd = eh > slot.end ? eh : slot.end;
                  onSetTime(slot.day, 'start', newStart);
                  onSetTime(slot.day, 'end', newEnd);
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.hourLabel}>{h.label}</Text>
              <Switch
                value={isOn}
                onValueChange={(v) => {
                  const [hStart, hEnd] = h.key.split('-');
                  if (v) {
                    const newStart = hStart < slot.start ? hStart : slot.start;
                    const newEnd = hEnd > slot.end ? hEnd : slot.end;
                    onSetTime(slot.day, 'start', newStart);
                    onSetTime(slot.day, 'end', newEnd);
                  }
                }}
                thumbColor={isOn ? Colors.primary : Colors.gray400}
                trackColor={{ false: Colors.gray200, true: Colors.primaryLight }}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.md,
  },
  backBtn: { padding: 4 },
  navTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing.xl, paddingVertical: 10, marginBottom: 4,
  },
  bannerGood: { backgroundColor: Colors.successBg },
  bannerWarn: { backgroundColor: Colors.warningBg },
  bannerText: { fontSize: 13, fontWeight: '500' },
  scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 100 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.xl, marginBottom: Spacing.md },
  groupTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  demandBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.textPrimary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  demandText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  dayCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, marginBottom: Spacing.sm,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  dayRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md },
  activeIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  dayInfo: { flex: 1 },
  dayName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  dayTime: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  hoursPanel: { backgroundColor: Colors.gray50, padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.divider },
  hoursPanelTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.md },
  hourRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  hourLabel: { fontSize: 14, color: Colors.textPrimary },
  saveBtn: { marginTop: Spacing.xl, borderRadius: BorderRadius.lg },
});
