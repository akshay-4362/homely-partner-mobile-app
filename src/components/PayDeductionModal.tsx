import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Alert,
  NativeModules,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import RazorpayCheckout from 'react-native-razorpay';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { Button } from './common/Button';
import { formatCurrency } from '../utils/format';
import { creditApi } from '../api/creditApi';

interface PayDeductionModalProps {
  visible: boolean;
  amount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const PayDeductionModal: React.FC<PayDeductionModalProps> = ({
  visible,
  amount,
  onClose,
  onSuccess,
}) => {
  const [processing, setProcessing] = useState(false);

  const handlePay = async () => {
    try {
      setProcessing(true);

      if (Constants.appOwnership === 'expo') {
        throw new Error('Razorpay is not available in Expo Go. Please use a development build.');
      }

      // Create Razorpay order for the exact deduction amount
      const response = await creditApi.createPurchaseIntent(amount);
      const { orderId, amount: orderAmount, keyId } = response.data;

      if (!orderId || !keyId || !orderAmount) {
        throw new Error('Invalid response from server');
      }

      const hasCheckoutMethod = !!RazorpayCheckout?.open;
      const nativeRazorpayModule =
        (NativeModules as any)?.RNRazorpayCheckout ||
        (NativeModules as any)?.RazorpayCheckout;
      const hasNativeOpen = !!nativeRazorpayModule?.open;

      if (!hasCheckoutMethod || !hasNativeOpen) {
        throw new Error('Razorpay is not available. Please use a development build.');
      }

      const paymentData = await RazorpayCheckout.open({
        description: 'Pending Deduction Payment',
        currency: 'INR',
        key: keyId,
        amount: orderAmount,
        name: 'Homelyo Professional',
        order_id: orderId,
        prefill: { name: 'Professional Partner' },
        theme: { color: Colors.primary },
      });

      // Confirm on backend
      try {
        await creditApi.confirmPurchase(
          paymentData.razorpay_payment_id,
          paymentData.razorpay_order_id,
          amount
        );
        Alert.alert(
          'Payment Successful',
          `₹${amount.toFixed(2)} deduction has been cleared.`,
          [{ text: 'OK', onPress: () => { onSuccess(); onClose(); } }]
        );
      } catch {
        Alert.alert(
          'Payment received',
          'Payment processed but confirmation pending. Please contact support if balance is not updated.',
          [{ text: 'OK', onPress: onClose }]
        );
      }
    } catch (error: any) {
      const paymentCancelledCode = RazorpayCheckout?.PAYMENT_CANCELLED;
      if (paymentCancelledCode != null && error?.code === paymentCancelledCode) {
        setProcessing(false);
        return;
      }

      const msg =
        error?.response?.data?.message ||
        error.description ||
        error.message ||
        'Failed to process payment. Please try again.';

      if (msg.includes('development build')) {
        Alert.alert('Setup Required', 'Razorpay requires a custom development build.');
      } else {
        Alert.alert('Payment failed', msg);
      }
    } finally {
      setProcessing(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.handle} />
            <Text style={styles.title}>Pay Pending Deduction</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              disabled={processing}
            >
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.amountCard}>
              <View style={styles.amountIconBg}>
                <Ionicons name="timer-outline" size={28} color={Colors.warning} />
              </View>
              <Text style={styles.amountLabel}>Amount Due</Text>
              <Text style={styles.amountValue}>{formatCurrency(amount)}</Text>
              <Text style={styles.amountNote}>
                This amount is owed to Homelyo from your completed jobs.
              </Text>
            </View>

            <View style={styles.details}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Pending deduction</Text>
                <Text style={styles.detailValue}>{formatCurrency(amount)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment method</Text>
                <View style={styles.paymentMethod}>
                  <Ionicons name="card-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.paymentText}>Card / UPI</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Button
              label={processing ? 'Processing...' : `Pay ${formatCurrency(amount)}`}
              onPress={handlePay}
              loading={processing}
              disabled={processing}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.gray300,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: Spacing.xl,
    top: Spacing.md + 4,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  amountCard: {
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  amountIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  amountLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  amountNote: {
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  details: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  footer: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
