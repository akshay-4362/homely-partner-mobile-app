/**
 * Stage 1: Job Details (Before Job Start)
 * Display job info, location, and OTP entry to start job
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Linking,
  Platform,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../../../theme/colors';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { formatDate, formatDateOnly } from '../../../utils/format';
import { StageComponentProps } from '../types';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { updateProBookingStatus } from '../../../store/bookingSlice';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAPPLS_API_KEY = process.env.EXPO_PUBLIC_MAPPLS_API_KEY || '77982c1e7ce80c97d51014114a198fb2';

export const Stage1_JobDetails: React.FC<StageComponentProps> = ({
  booking,
  onStageComplete,
  onError,
}) => {
  const dispatch = useAppDispatch();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpHelpVisible, setOtpHelpVisible] = useState(false);

  /**
   * Open location in maps app
   */
  const openMapsApp = () => {
    if (!booking.lat || !booking.lng) {
      const url = `https://maps.google.com/?q=${encodeURIComponent(booking.addressFull || '')}`;
      Linking.openURL(url);
      return;
    }

    const scheme = Platform.select({ ios: 'maps:', android: 'geo:' });
    const url = Platform.select({
      ios: `${scheme}${booking.lat},${booking.lng}`,
      android: `${scheme}${booking.lat},${booking.lng}?q=${booking.lat},${booking.lng}`,
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        // Fallback to browser maps
        const fallbackUrl = `https://maps.google.com/?q=${booking.lat},${booking.lng}`;
        Linking.openURL(fallbackUrl);
      });
    }
  };

  /**
   * Call customer
   */
  const callCustomer = () => {
    Linking.openURL(`tel:${booking.customerPhone}`);
  };

  /**
   * Start job with OTP verification
   */
  const handleStartJob = async () => {
    const trimmedOtp = otp.trim();

    // Validation
    if (!trimmedOtp) {
      setError('Please enter the start OTP from customer');
      return;
    }

    if (trimmedOtp.length !== 6) {
      setError('OTP must be 6 digits');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await dispatch(
        updateProBookingStatus({
          bookingId: booking.id,
          status: 'in_progress',
          otp: trimmedOtp,
        })
      );

      setLoading(false);

      if (res.meta.requestStatus === 'fulfilled') {
        // Success - move to stage 2
        Alert.alert(
          'Job Started! ✓',
          'You can now upload before photos/videos and add charges.',
          [
            {
              text: 'Continue',
              onPress: () => onStageComplete(2),
            },
          ]
        );
      } else {
        // Error from API
        const errorMsg = (res.payload as string) || 'Failed to start job';
        setError(errorMsg);
        onError(errorMsg);
      }
    } catch (err) {
      setLoading(false);
      const errorMsg = err instanceof Error ? err.message : 'Failed to start job';
      setError(errorMsg);
      onError(errorMsg);
    }
  };

  return (
    <View style={styles.container}>
      {/* Job Header Card */}
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bookingNumber}>#{booking.bookingNumber}</Text>
            <Text style={styles.serviceName} numberOfLines={2}>
              {booking.serviceName}
            </Text>
          </View>
          <Badge status={booking.status} label="Confirmed" />
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.infoText}>{booking.customerName}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.infoText}>{formatDate(booking.scheduledAt)}</Text>
        </View>

        {booking.addressLine && (
          <TouchableOpacity style={styles.infoRow} onPress={openMapsApp}>
            <Ionicons name="location-outline" size={16} color={Colors.primary} />
            <Text style={[styles.infoText, styles.linkText]} numberOfLines={2}>
              {booking.addressLine}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </Card>

      {/* Location Card */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Job Location</Text>

        {/* Map Preview */}
        {booking.lat && booking.lng && (
          <TouchableOpacity onPress={openMapsApp} activeOpacity={0.8}>
            <Image
              source={{
                uri: `https://apis.mapmyindia.com/advancedmaps/v1/${MAPPLS_API_KEY}/still_image?center=${booking.lat},${booking.lng}&zoom=15&size=${Math.round(SCREEN_WIDTH - 80)}x200&markers=${booking.lat},${booking.lng}`,
              }}
              style={styles.mapPreview}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}

        {/* Full Address */}
        <View style={styles.addressRow}>
          <Ionicons name="location" size={20} color={Colors.primary} />
          <Text style={styles.addressText}>{booking.addressFull || booking.addressLine}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionBtn} onPress={openMapsApp}>
            <Ionicons name="map" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Open in Maps</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={callCustomer}>
            <Ionicons name="call" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Call Customer</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* OTP Card */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Start Job</Text>
        <Text style={styles.hint}>
          Enter the 6-digit start OTP from customer to begin the job
        </Text>

        <TextInput
          style={styles.otpInput}
          placeholder="Enter 6-digit OTP from customer"
          keyboardType="number-pad"
          maxLength={6}
          value={otp}
          onChangeText={(text) => {
            setOtp(text);
            setError(''); // Clear error on input
          }}
          placeholderTextColor={Colors.textTertiary}
          autoCapitalize="none"
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          label="Start Job"
          icon="play-circle"
          onPress={handleStartJob}
          loading={loading}
          disabled={otp.length !== 6}
          fullWidth
          style={{ marginTop: Spacing.md }}
        />

        <TouchableOpacity
          style={styles.otpHelpBtn}
          onPress={() => setOtpHelpVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.otpHelpText}>Problem in getting OTP?</Text>
        </TouchableOpacity>
      </Card>

      {/* OTP Help Modal */}
      <Modal
        visible={otpHelpVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOtpHelpVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setOtpHelpVisible(false)}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="help-circle" size={26} color={Colors.primary} />
              <Text style={styles.modalTitle}>Can't get the OTP?</Text>
            </View>

            <Text style={styles.modalBody}>
              Ask the customer for their registered mobile number.
            </Text>

            <View style={styles.modalStep}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNum}>1</Text>
              </View>
              <Text style={styles.stepText}>
                Ask the customer: <Text style={styles.stepBold}>"What is your registered mobile number?"</Text>
              </Text>
            </View>

            <View style={styles.modalStep}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNum}>2</Text>
              </View>
              <Text style={styles.stepText}>
                Take the <Text style={styles.stepBold}>last 6 digits</Text> of their mobile number.
              </Text>
            </View>

            <View style={styles.modalStep}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNum}>3</Text>
              </View>
              <Text style={styles.stepText}>
                Enter those 6 digits as the OTP to start the job.
              </Text>
            </View>

            <View style={styles.modalExample}>
              <Text style={styles.exampleLabel}>Example</Text>
              <Text style={styles.exampleText}>
                Mobile: 98765{' '}
                <Text style={styles.exampleHighlight}>4 3 2 1 0 9</Text>
                {'  →  OTP: '}
                <Text style={styles.exampleHighlight}>4 3 2 1 0 9</Text>
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setOtpHelpVisible(false)}
            >
              <Text style={styles.modalCloseBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  card: {
    marginBottom: Spacing.md,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },

  bookingNumber: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginBottom: 2,
  },

  serviceName: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },

  infoText: {
    ...Typography.body,
    color: Colors.textSecondary,
    flex: 1,
  },

  linkText: {
    color: Colors.primary,
  },

  sectionTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },

  mapPreview: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.md,
    marginVertical: Spacing.md,
    backgroundColor: Colors.gray100,
  },

  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },

  addressText: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
    lineHeight: 20,
  },

  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },

  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },

  actionBtnText: {
    ...Typography.body,
    fontWeight: '600',
    color: '#fff',
  },

  hint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: Spacing.md,
  },

  otpInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '600',
  },

  errorText: {
    ...Typography.caption,
    color: Colors.error,
    marginTop: 4,
  },

  otpHelpBtn: {
    alignSelf: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
  },

  otpHelpText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },

  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  modalBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },

  modalStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },

  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },

  stepNum: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },

  stepText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  stepBold: {
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  modalExample: {
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },

  exampleLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  exampleText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  exampleHighlight: {
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 3,
  },

  modalCloseBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },

  modalCloseBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
