import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../theme/colors';
import client from '../../api/client';

interface HourlySlot {
  hour: number;
  available: boolean;
}

interface DaySchedule {
  dayOfWeek: number;
  slots: HourlySlot[];
}

interface DateOverride {
  date: string;
  slots: HourlySlot[];
}

interface Props {
  visible: boolean;
  onClose: () => void;
  date: string | null;
  weeklySchedule: DaySchedule[];
  dateOverrides: DateOverride[];
  onSave: () => Promise<void>;
  onChangeRoutine: () => void;
}

const formatHour = (hour: number): string => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour.toString().padStart(2, '0')}:00 ${period}`;
};

const formatHourRange = (hour: number): string => {
  const nextHour = hour + 1;
  return `${formatHour(hour)} - ${formatHour(nextHour)}`;
};

export const SpecificDateEditor: React.FC<Props> = ({
  visible,
  onClose,
  date,
  weeklySchedule,
  dateOverrides,
  onSave,
  onChangeRoutine,
}) => {
  const [slots, setSlots] = useState<HourlySlot[]>([]);
  const [saving, setSaving] = useState(false);
  const [showHourEditor, setShowHourEditor] = useState(false);
  const [nearbyDates, setNearbyDates] = useState<Date[]>([]);

  useEffect(() => {
    if (date && visible) {
      loadSlotsForDate(date);
      generateNearbyDates(date);
    }
  }, [date, visible, weeklySchedule, dateOverrides]);

  const loadSlotsForDate = (dateString: string) => {
    const dateObj = new Date(dateString);
    const dayOfWeek = dateObj.getDay();

    // Check for date override first
    const override = dateOverrides.find((o) => o.date === dateString);
    if (override) {
      setSlots([...override.slots]);
      return;
    }

    // Fall back to weekly schedule
    const daySchedule = weeklySchedule.find((d) => d.dayOfWeek === dayOfWeek);
    if (daySchedule) {
      setSlots([...daySchedule.slots]);
    } else {
      // Default: all available
      const defaultSlots: HourlySlot[] = [];
      for (let hour = 8; hour < 20; hour++) {
        defaultSlots.push({ hour, available: true });
      }
      setSlots(defaultSlots);
    }
  };

  const generateNearbyDates = (dateString: string) => {
    const centerDate = new Date(dateString);
    const dates: Date[] = [];

    // Get 2 days before and 2 days after
    for (let i = -2; i <= 2; i++) {
      const date = new Date(centerDate);
      date.setDate(centerDate.getDate() + i);
      dates.push(date);
    }

    setNearbyDates(dates);
  };

  const availableHours = useMemo(() => {
    return slots.filter((s) => s.available).length;
  }, [slots]);

  const toggleSlot = (hour: number) => {
    setSlots((prev) =>
      prev.map((s) => (s.hour === hour ? { ...s, available: !s.available } : s))
    );
  };

  const markAllUnavailable = async () => {
    try {
      setSaving(true);

      // Set all slots to unavailable
      const unavailableSlots = slots.map((s) => ({ ...s, available: false }));

      await client.post('/availability/date-override', {
        date,
        slots: unavailableSlots,
      });

      console.log('Date marked as unavailable successfully');

      // Wait for save to complete, then refresh and close
      await onSave();
      onClose();
    } catch (error) {
      console.error('Failed to mark unavailable:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const markAllAvailable = async () => {
    try {
      setSaving(true);

      // Set all slots to available
      const availableSlots = slots.map((s) => ({ ...s, available: true }));

      await client.post('/availability/date-override', {
        date,
        slots: availableSlots,
      });

      console.log('Date marked as available successfully');

      // Wait for save to complete, then refresh and close
      await onSave();
      onClose();
    } catch (error) {
      console.error('Failed to mark available:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      await client.post('/availability/date-override', {
        date,
        slots,
      });

      console.log('Date override saved successfully');

      // Wait for save to complete, then refresh and close
      await onSave();
      onClose();
    } catch (error) {
      console.error('Failed to save date override:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (newDate: Date) => {
    const dateString = newDate.toISOString().split('T')[0];
    loadSlotsForDate(dateString);
    generateNearbyDates(dateString);
  };

  if (!date) return null;

  const dateObj = new Date(date);
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const formattedDate = `${dayName}, ${monthDay}`;

  const getDayStatus = (checkDate: Date): 'full' | 'partial' | 'none' => {
    const dateString = checkDate.toISOString().split('T')[0];
    const dayOfWeek = checkDate.getDay();

    // Check override
    const override = dateOverrides.find((o) => o.date === dateString);
    if (override) {
      const available = override.slots.filter((s) => s.available).length;
      if (available === 12) return 'full';
      if (available > 0) return 'partial';
      return 'none';
    }

    // Check weekly schedule
    const daySchedule = weeklySchedule.find((d) => d.dayOfWeek === dayOfWeek);
    if (daySchedule) {
      const available = daySchedule.slots.filter((s) => s.available).length;
      if (available === 12) return 'full';
      if (available > 0) return 'partial';
    }

    return 'none';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'full') return <Ionicons name="checkmark" size={16} color={Colors.success} />;
    if (status === 'partial') return <Ionicons name="close" size={16} color="#FFA500" />;
    return <Ionicons name="close" size={16} color={Colors.error} />;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.changeRoutineBtn} onPress={onChangeRoutine}>
            <Text style={styles.changeRoutineBtnText}>Change routine</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Date Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateSelector}
          >
            {nearbyDates.map((d, index) => {
              const isSelected = d.toDateString() === dateObj.toDateString();
              const status = getDayStatus(d);
              const dayNum = d.getDate();
              const dayAbbr = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();

              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.dateCard, isSelected && styles.dateCardSelected]}
                  onPress={() => handleDateChange(d)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dateDayName, isSelected && styles.dateTextSelected]}>
                    {dayAbbr}
                  </Text>
                  <Text style={[styles.dateDayNum, isSelected && styles.dateTextSelected]}>
                    {dayNum}
                  </Text>
                  {getStatusIcon(status)}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Date Title */}
          <Text style={styles.dateTitle}>{formattedDate}</Text>
          <Text style={styles.hoursCount}>{availableHours} hours marked available</Text>

          {/* Available Section */}
          <TouchableOpacity
            style={styles.section}
            onPress={() => setShowHourEditor(!showHourEditor)}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="remove" size={20} color={Colors.textSecondary} />
                <Text style={styles.sectionTitle}>Available</Text>
              </View>
              <Ionicons
                name={showHourEditor ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={Colors.textSecondary}
              />
            </View>

            {!showHourEditor && (
              availableHours === 0 ? (
                // Show "Mark as available" when day is unavailable
                <TouchableOpacity
                  style={[styles.quickActionBtn, styles.availableBtn]}
                  onPress={markAllAvailable}
                  disabled={saving}
                  activeOpacity={0.7}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={Colors.success} />
                  ) : (
                    <Text style={styles.availableBtnText}>Mark as available</Text>
                  )}
                </TouchableOpacity>
              ) : (
                // Show "Mark as unavailable" when day is available
                <TouchableOpacity
                  style={[styles.quickActionBtn, styles.unavailableBtn]}
                  onPress={markAllUnavailable}
                  disabled={saving}
                  activeOpacity={0.7}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={Colors.error} />
                  ) : (
                    <Text style={styles.unavailableBtnText}>Mark as unavailable</Text>
                  )}
                </TouchableOpacity>
              )
            )}
          </TouchableOpacity>

          {/* Hours Summary (Collapsed) */}
          {!showHourEditor && (
            <TouchableOpacity
              style={styles.collapsedSummary}
              onPress={() => setShowHourEditor(true)}
              activeOpacity={0.7}
            >
              <View style={styles.collapsedSummaryLeft}>
                <View style={styles.checkmark}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </View>
                <Text style={styles.collapsedSummaryText}>{availableHours} hours marked available</Text>
              </View>
              <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}

          {/* Update Hours (Expanded) */}
          {showHourEditor && (
            <View style={styles.hoursEditor}>
              <View style={styles.hoursEditorHeader}>
                <View style={styles.hoursEditorHeaderLeft}>
                  <Ionicons name="remove" size={20} color={Colors.textSecondary} />
                  <Text style={styles.hoursEditorTitle}>Update your available hours</Text>
                </View>
                <TouchableOpacity onPress={() => setShowHourEditor(false)}>
                  <Ionicons name="chevron-up" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Hour Toggles */}
              {slots.map((slot) => (
                <View key={slot.hour} style={styles.hourRow}>
                  <Text style={styles.hourText}>{formatHourRange(slot.hour)}</Text>
                  <Switch
                    value={slot.available}
                    onValueChange={() => toggleSlot(slot.hour)}
                    trackColor={{ false: '#E0E0E0', true: Colors.success }}
                    thumbColor="#fff"
                  />
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Save Button (when editing) */}
        {showHourEditor && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
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
  },
  backBtn: {
    padding: 4,
  },
  changeRoutineBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  changeRoutineBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  scroll: {
    paddingBottom: 150,
  },
  dateSelector: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  dateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.divider,
    minWidth: 80,
  },
  dateCardSelected: {
    backgroundColor: '#F0F0F0',
    borderColor: Colors.textPrimary,
  },
  dateDayName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  dateDayNum: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  dateTextSelected: {
    color: Colors.textPrimary,
  },
  dateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  hoursCount: {
    fontSize: 16,
    color: Colors.success,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  quickActionBtn: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  availableBtn: {
    backgroundColor: Colors.successBg,
    borderColor: Colors.success,
  },
  availableBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
  },
  unavailableBtn: {
    backgroundColor: Colors.errorBg,
    borderColor: Colors.error,
  },
  unavailableBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.error,
  },
  collapsedSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  collapsedSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsedSummaryText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  hoursEditor: {
    backgroundColor: '#fff',
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  hoursEditorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  hoursEditorHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  hoursEditorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  hourText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
