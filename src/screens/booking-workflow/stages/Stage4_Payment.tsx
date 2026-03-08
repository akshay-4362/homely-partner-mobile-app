/**
 * Stage 4: Payment Collection
 * Partner collects payment via cash or QR code
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, Typography } from '../../../theme/colors';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { formatCurrency } from '../../../utils/format';
import { StageComponentProps } from '../types';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { useAppSelector } from '../../../hooks/useAppSelector';
import {
  selectPaymentMethod,
  setPaymentMethod,
  selectCloseJobMode,
  selectCloseJobReason,
  clearCloseJobMode,
} from '../../../store/booking-workflow/bookingWorkflowSlice';
import { updateProBookingStatus } from '../../../store/bookingSlice';

export const Stage4_Payment: React.FC<StageComponentProps> = ({
  booking,
  charges,
  onStageComplete,
  onError,
}) => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const selectedPaymentMethod = useAppSelector(selectPaymentMethod);
  const closeJobMode = useAppSelector(selectCloseJobMode);
  const closeJobReason = useAppSelector(selectCloseJobReason);
  const [loading, setLoading] = useState(false);

  // Calculate totals
  const baseCharge = booking.total;
  const approvedChargesTotal = charges.approved.reduce((sum, c) => sum + c.amount, 0);
  const subtotal = baseCharge + approvedChargesTotal;
  const totalAmount = booking.finalTotal || subtotal;
  const platformFee = booking.creditDeducted || 0;

  /**
   * Handle payment method selection
   */
  const handlePaymentMethodSelect = (method: 'cash' | 'online') => {
    dispatch(setPaymentMethod(method));
  };

  /**
   * Handle cash payment confirmation
   */
  const handleCashPayment = () => {
    const confirmMsg = closeJobMode
      ? `Did you receive ₹${totalAmount} visit fee in cash from the customer?`
      : `Did you receive ₹${totalAmount} in cash from the customer?`;

    Alert.alert('Confirm Cash Payment', confirmMsg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes, Received',
        onPress: async () => {
          setLoading(true);
          try {
            if (closeJobMode && closeJobReason) {
              // Close job flow: collect visit fee and mark as completed
              const res = await dispatch(
                updateProBookingStatus({
                  bookingId: booking.id,
                  status: 'completed',
                  cashPayment: true,
                  reason: closeJobReason,
                })
              );
              dispatch(clearCloseJobMode());
              setLoading(false);
              if (res.meta.requestStatus === 'fulfilled') {
                Alert.alert(
                  'Job Closed',
                  'Visit fee collected. The job has been closed.',
                  [{ text: 'OK', onPress: () => onStageComplete(5) }]
                );
              } else {
                const errorMsg = (res.payload as string) || 'Failed to close job';
                Alert.alert('Error', errorMsg);
                onError(errorMsg);
              }
            } else {
              // Normal completion
              const res = await dispatch(
                updateProBookingStatus({
                  bookingId: booking.id,
                  status: 'completed',
                  cashPayment: true,
                })
              );
              setLoading(false);
              if (res.meta.requestStatus === 'fulfilled') {
                Alert.alert(
                  'Job Completed! ✓',
                  'Cash payment received. Invoice has been generated.',
                  [{ text: 'Continue', onPress: () => onStageComplete(5) }]
                );
              } else {
                const errorMsg = (res.payload as string) || 'Failed to complete job';
                Alert.alert('Error', errorMsg);
                onError(errorMsg);
              }
            }
          } catch (error) {
            setLoading(false);
            const errorMsg = error instanceof Error ? error.message : 'Failed to process';
            Alert.alert('Error', errorMsg);
            onError(errorMsg);
          }
        },
      },
    ]);
  };

  /**
   * Handle online payment (QR code)
   */
  const handleOnlinePayment = () => {
    // Navigate to PaymentQR screen (existing component)
    navigation.navigate('PaymentQR', {
      booking,
      fromWorkflow: true, // Flag to return to workflow after payment
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Close Job Banner */}
      {closeJobMode && (
        <View style={styles.closeJobBanner}>
          <Ionicons name="information-circle" size={20} color={Colors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={styles.closeJobBannerTitle}>Closing Job — Collect Visit Fee</Text>
            <Text style={styles.closeJobBannerReason}>Reason: {closeJobReason}</Text>
          </View>
        </View>
      )}

      {/* Job Summary Card */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Job Summary</Text>

        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Base Charge</Text>
            <Text style={styles.summaryValue}>{formatCurrency(baseCharge)}</Text>
          </View>

          {approvedChargesTotal > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Approved Extra Charges</Text>
              <Text style={[styles.summaryValue, { color: Colors.success }]}>
                +{formatCurrency(approvedChargesTotal)}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>{formatCurrency(totalAmount)}</Text>
          </View>
        </View>

        {platformFee > 0 && (
          <View style={styles.feeNote}>
            <Ionicons name="information-circle-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.feeText}>
              Platform fee (₹{platformFee}) already deducted from your credits
            </Text>
          </View>
        )}
      </Card>

      {/* Payment Method Selection */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>How did customer pay?</Text>

        <View style={styles.paymentOptions}>
          {/* Cash Option */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              selectedPaymentMethod === 'cash' && styles.paymentOptionSelected,
            ]}
            onPress={() => handlePaymentMethodSelect('cash')}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.radio,
                selectedPaymentMethod === 'cash' && styles.radioSelected,
              ]}
            >
              {selectedPaymentMethod === 'cash' && <View style={styles.radioDot} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.paymentMethodTitle}>Cash</Text>
              <Text style={styles.paymentMethodSubtitle}>
                I received ₹{totalAmount} in cash
              </Text>
            </View>
            <Ionicons name="cash" size={24} color={Colors.success} />
          </TouchableOpacity>

          {/* Online Option */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              selectedPaymentMethod === 'online' && styles.paymentOptionSelected,
            ]}
            onPress={() => handlePaymentMethodSelect('online')}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.radio,
                selectedPaymentMethod === 'online' && styles.radioSelected,
              ]}
            >
              {selectedPaymentMethod === 'online' && <View style={styles.radioDot} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.paymentMethodTitle}>Online Payment</Text>
              <Text style={styles.paymentMethodSubtitle}>
                Customer paid via UPI/QR
              </Text>
            </View>
            <Ionicons name="qr-code" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </Card>

      {/* Payment Action Buttons */}
      <View style={styles.actionContainer}>
        {selectedPaymentMethod === 'cash' && (
          <>
            <Button
              label="Confirm Cash Received"
              icon="cash"
              onPress={handleCashPayment}
              loading={loading}
              fullWidth
              size="lg"
            />
            <Button
              label="Back to After Photos"
              icon="arrow-back"
              onPress={() => onStageComplete(3)}
              variant="ghost"
              fullWidth
              style={{ marginTop: Spacing.md }}
            />
          </>
        )}

        {selectedPaymentMethod === 'online' && (
          <>
            <Button
              label="Show Payment QR Code"
              icon="qr-code"
              onPress={handleOnlinePayment}
              fullWidth
              size="lg"
              variant="secondary"
            />
            <View style={styles.qrNote}>
              <Ionicons name="information-circle-outline" size={14} color={Colors.primary} />
              <Text style={styles.qrNoteText}>
                Generate QR code for customer to scan and pay via UPI
              </Text>
            </View>
            <Button
              label="Back to After Photos"
              icon="arrow-back"
              onPress={() => onStageComplete(3)}
              variant="ghost"
              fullWidth
              style={{ marginTop: Spacing.md }}
            />
          </>
        )}

        {!selectedPaymentMethod && (
          <>
            <View style={styles.emptyState}>
              <Ionicons name="hand-left-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyStateText}>
                Select payment method to continue
              </Text>
            </View>
            <Button
              label="Back to After Photos"
              icon="arrow-back"
              onPress={() => onStageComplete(3)}
              variant="ghost"
              fullWidth
              style={{ marginTop: Spacing.md }}
            />
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  card: {
    marginBottom: Spacing.md,
  },

  closeJobBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.warningBg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },

  closeJobBannerTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  closeJobBannerReason: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  sectionTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },

  summaryBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },

  summaryLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
  },

  summaryValue: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.sm,
  },

  totalRow: {
    paddingTop: Spacing.sm,
  },

  totalLabel: {
    ...Typography.h4,
    color: Colors.textPrimary,
  },

  totalValue: {
    ...Typography.h3,
    color: Colors.primary,
  },

  feeNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },

  feeText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    flex: 1,
  },

  paymentOptions: {
    gap: Spacing.md,
  },

  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },

  paymentOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioSelected: {
    borderColor: Colors.primary,
  },

  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },

  paymentMethodTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  paymentMethodSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  actionContainer: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xxl,
  },

  qrNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.sm,
  },

  qrNoteText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    flex: 1,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },

  emptyStateText: {
    ...Typography.body,
    color: Colors.textTertiary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
});
