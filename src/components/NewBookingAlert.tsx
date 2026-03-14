import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { playBookingAlert, stopBookingAlert } from '../utils/soundPlayer';

const ALERT_DURATION = 15; // seconds

export interface BookingAlertData {
  title: string;
  message: string;
  bookingId?: string;
  serviceName?: string;
  scheduledAt?: string;
}

interface Props {
  visible: boolean;
  data: BookingAlertData | null;
  onViewBooking: (bookingId: string) => void;
  onDismiss: () => void;
}

export const NewBookingAlert: React.FC<Props> = ({
  visible,
  data,
  onViewBooking,
  onDismiss,
}) => {
  const [countdown, setCountdown] = useState(ALERT_DURATION);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start alert when visible
  useEffect(() => {
    if (visible) {
      setCountdown(ALERT_DURATION);
      playBookingAlert();
      startVibration();
      startPulse();
      slideIn();
      startCountdown();
    } else {
      cleanup();
    }

    return () => cleanup();
  }, [visible]);

  const cleanup = () => {
    stopBookingAlert();
    Vibration.cancel();
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  const startVibration = () => {
    // Vibrate pattern: 500ms on, 500ms off, repeat — matches the audio urgency
    Vibration.vibrate([500, 500, 500, 500, 500, 500], true);
  };

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const slideIn = () => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 60,
      friction: 9,
      useNativeDriver: true,
    }).start();
  };

  const startCountdown = () => {
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleDismiss = () => {
    cleanup();
    slideAnim.setValue(300);
    pulseAnim.setValue(1);
    onDismiss();
  };

  const handleViewBooking = () => {
    cleanup();
    slideAnim.setValue(300);
    pulseAnim.setValue(1);
    if (data?.bookingId) {
      onViewBooking(data.bookingId);
    } else {
      onDismiss();
    }
  };

  if (!data) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Pulsing Icon */}
          <Animated.View
            style={[styles.iconWrapper, { transform: [{ scale: pulseAnim }] }]}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="briefcase" size={36} color="#fff" />
            </View>
          </Animated.View>

          {/* Badge */}
          <View style={styles.badge}>
            <Ionicons name="flash" size={12} color="#fff" />
            <Text style={styles.badgeText}>NEW JOB ASSIGNED</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{data.title}</Text>

          {/* Message */}
          <Text style={styles.message}>{data.message}</Text>

          {/* Countdown bar */}
          <View style={styles.countdownRow}>
            <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.countdownText}>
              Auto-dismiss in {countdown}s
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={handleDismiss}
              activeOpacity={0.7}
            >
              <Text style={styles.dismissText}>Dismiss</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.viewBtn}
              onPress={handleViewBooking}
              activeOpacity={0.7}
            >
              <Ionicons name="eye-outline" size={18} color="#fff" />
              <Text style={styles.viewText}>View Booking</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: Spacing.xl,
  },
  container: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl || 20,
    padding: Spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
    borderTopWidth: 4,
    borderTopColor: Colors.primary,
  },
  iconWrapper: {
    marginBottom: Spacing.md,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginBottom: Spacing.md,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.xl,
  },
  countdownText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  dismissBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.divider,
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  viewBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  viewText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
