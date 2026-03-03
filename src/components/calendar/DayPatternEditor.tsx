import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
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

interface Props {
  visible: boolean;
  onClose: () => void;
  dayOfWeek: number | null;
  weeklySchedule: DaySchedule[];
  onSave: () => Promise<void>;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Generate hour options (8 AM to 8 PM)
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8-20

const formatHour = (hour: number): string => {
  const period = hour >= 12 ? 'pm' : 'am';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:00 ${period}`;
};

export const DayPatternEditor: React.FC<Props> = ({
  visible,
  onClose,
  dayOfWeek,
  weeklySchedule,
  onSave,
}) => {
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(17); // 5 PM
  const [saving, setSaving] = useState(false);
  const [markAllUnavailable, setMarkAllUnavailable] = useState(false);

  useEffect(() => {
    if (dayOfWeek !== null && visible) {
      // Load current schedule for this day
      const daySchedule = weeklySchedule.find((d) => d.dayOfWeek === dayOfWeek);
      if (daySchedule && daySchedule.slots.length > 0) {
        const availableSlots = daySchedule.slots.filter((s) => s.available);
        if (availableSlots.length > 0) {
          const hours = availableSlots.map((s) => s.hour).sort((a, b) => a - b);
          setStartHour(hours[0]);
          setEndHour(hours[hours.length - 1] + 1); // +1 because it's the end of the range
          setMarkAllUnavailable(false);
        } else {
          setMarkAllUnavailable(true);
        }
      }
    }
  }, [dayOfWeek, weeklySchedule, visible]);

  if (dayOfWeek === null) return null;

  const dayName = DAY_NAMES[dayOfWeek];
  const availableHours = markAllUnavailable ? 0 : Math.max(0, endHour - startHour);
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const recommendedMinHours = isWeekend ? 8 : 7;
  const isTooLow = availableHours < recommendedMinHours;

  const handleSave = async () => {
    try {
      setSaving(true);

      // Create updated slots for this day
      const newSlots: HourlySlot[] = [];
      for (let hour = 8; hour < 20; hour++) {
        if (markAllUnavailable) {
          newSlots.push({ hour, available: false });
        } else {
          newSlots.push({ hour, available: hour >= startHour && hour < endHour });
        }
      }

      // Update via API
      await client.post('/availability/batch-update-day', {
        dayOfWeek,
        startHour: markAllUnavailable ? 8 : startHour,
        endHour: markAllUnavailable ? 8 : endHour - 1, // API expects inclusive end
        available: !markAllUnavailable,
      });

      console.log('Day pattern saved successfully');

      // Wait for save to complete, then refresh and close
      await onSave();
      onClose();
    } catch (error) {
      console.error('Failed to save day pattern:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Title */}
          <Text style={styles.subtitle}>Set a routine for</Text>
          <Text style={styles.title}>All {dayName}s</Text>

          {/* Mark Unavailability Link */}
          <TouchableOpacity
            style={styles.unavailableLink}
            onPress={() => setMarkAllUnavailable(!markAllUnavailable)}
            activeOpacity={0.7}
          >
            <Text style={styles.unavailableLinkText}>
              {markAllUnavailable ? 'Mark availability on' : 'Mark unavailability on'} all {dayName}s
            </Text>
          </TouchableOpacity>

          {!markAllUnavailable && (
            <>
              {/* Time Pickers */}
              <View style={styles.timePickersRow}>
                <View style={styles.timePickerContainer}>
                  <Text style={styles.timePickerLabel}>Start Time</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={startHour}
                      onValueChange={(value) => setStartHour(value)}
                      style={styles.picker}
                    >
                      {HOURS.filter((h) => h < endHour).map((hour) => (
                        <Picker.Item key={hour} label={formatHour(hour)} value={hour} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.timePickerContainer}>
                  <Text style={styles.timePickerLabel}>End Time</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={endHour}
                      onValueChange={(value) => setEndHour(value)}
                      style={styles.picker}
                    >
                      {HOURS.filter((h) => h > startHour).map((hour) => (
                        <Picker.Item key={hour} label={formatHour(hour)} value={hour} />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>

              {/* Warning */}
              {isTooLow && (
                <View style={styles.warningBanner}>
                  <View style={styles.warningIcon}>
                    <Ionicons name="alert-circle" size={28} color="#F57C00" />
                  </View>
                  <View style={styles.warningContent}>
                    <Text style={styles.warningTitle}>Too low</Text>
                    <Text style={styles.warningText}>
                      Only {availableHours} hours available. You should mark more hours.
                    </Text>
                  </View>
                </View>
              )}

              {/* Add Break (Placeholder) */}
              <TouchableOpacity style={styles.addBreakBtn} onPress={() => {}} activeOpacity={0.7}>
                <Ionicons name="add" size={20} color={Colors.textSecondary} />
                <Text style={styles.addBreakText}>Add a break</Text>
              </TouchableOpacity>
            </>
          )}

          {markAllUnavailable && (
            <View style={styles.unavailableInfo}>
              <Ionicons name="information-circle" size={24} color={Colors.textSecondary} />
              <Text style={styles.unavailableInfoText}>
                All {dayName}s will be marked as unavailable
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Confirm Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.confirmBtn, saving && styles.confirmBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmBtnText}>
                Confirm routine for all {dayName}s
              </Text>
            )}
          </TouchableOpacity>
        </View>
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
  closeBtn: {
    padding: 4,
  },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: 150,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  unavailableLink: {
    paddingVertical: Spacing.md,
    marginBottom: Spacing.xl,
  },
  unavailableLinkText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    textDecorationLine: 'underline',
  },
  timePickersRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  timePickerContainer: {
    flex: 1,
  },
  timePickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  pickerWrapper: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  warningIcon: {
    marginTop: 2,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: '#F57C00',
    lineHeight: 20,
  },
  addBreakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  addBreakText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  unavailableInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  unavailableInfoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
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
  confirmBtn: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
