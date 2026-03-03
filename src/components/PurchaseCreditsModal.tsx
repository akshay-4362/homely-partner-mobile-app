import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  NativeModules,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import RazorpayCheckout from 'react-native-razorpay';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { Button } from './common/Button';
import { formatCurrency } from '../utils/format';
import { creditApi } from '../api/creditApi';

interface PurchaseCreditsModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CreditPackage {
  amount: number;
  label: string;
  jobs: number;
  popular?: boolean;
  bonus?: string;
}

const CREDIT_PACKAGES: CreditPackage[] = [
  { amount: 50000, label: '₹50,000', jobs: 166, popular: true, bonus: 'Standard Package' },
];

export const PurchaseCreditsModal: React.FC<PurchaseCreditsModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [selectedAmount, setSelectedAmount] = useState<number>(50000);
  const [processing, setProcessing] = useState(false);

  React.useEffect(() => {
    console.log('🟢 PurchaseCreditsModal visible state changed:', visible);
  }, [visible]);

  const handlePurchase = async () => {
    try {
      console.log('🟡 Purchase initiated, amount:', selectedAmount);
      setProcessing(true);

      if (Constants.appOwnership === 'expo') {
        throw new Error('Razorpay is not available in Expo Go. Please use a development build.');
      }

      // Step 1: Create Razorpay order on backend
      console.log('🟡 Creating Razorpay order...');
      const response = await creditApi.createPurchaseIntent(selectedAmount);
      console.log('🟡 Full response:', JSON.stringify(response, null, 2));

      const { data } = response;
      console.log('🟡 Razorpay order data:', JSON.stringify(data, null, 2));

      const { orderId, amount, keyId, creditsReceived } = data;

      if (!orderId || !keyId || !amount) {
        throw new Error('Invalid response from server: missing orderId, keyId, or amount');
      }

      console.log('🟡 Extracted values:', { orderId, amount, keyId, creditsReceived });

      // Step 2: Prepare Razorpay options
      const options = {
        description: 'Credit Purchase',
        image: 'https://your-logo-url.com/logo.png', // Optional: Add your logo
        currency: 'INR',
        key: keyId,
        amount: amount, // Amount in paise
        name: 'Homelyo Professional',
        order_id: orderId,
        prefill: {
          name: 'Professional Partner',
        },
        theme: {
          color: Colors.primary,
        },
      };

      // Step 3: Open Razorpay checkout
      console.log('🟡 Opening Razorpay with options:', JSON.stringify(options, null, 2));

      const hasCheckoutMethod = !!RazorpayCheckout?.open;
      const nativeRazorpayModule =
        (NativeModules as any)?.RNRazorpayCheckout ||
        (NativeModules as any)?.RazorpayCheckout;
      const hasNativeOpen = !!nativeRazorpayModule?.open;

      if (!hasCheckoutMethod || !hasNativeOpen) {
        throw new Error('Razorpay is not available. Please use a development build instead of Expo Go.');
      }

      const paymentData = await RazorpayCheckout.open(options);
      console.log('🟢 Payment successful:', JSON.stringify(paymentData, null, 2));

      // Step 4: Payment successful - confirm on backend
      try {
        await creditApi.confirmPurchase(
          paymentData.razorpay_payment_id,
          paymentData.razorpay_order_id,
          selectedAmount
        );

        Alert.alert(
          'Success!',
          `${formatCurrency(selectedAmount)} credits added to your account`,
          [
            {
              text: 'OK',
              onPress: () => {
                onSuccess();
                onClose();
              },
            },
          ]
        );
      } catch (confirmError: any) {
        Alert.alert(
          'Payment successful but confirmation failed',
          'Your payment was processed but there was an error updating your balance. Please contact support.',
          [{ text: 'OK', onPress: () => onClose() }]
        );
      }
    } catch (error: any) {
      console.error('🔴 Purchase error:', error);
      console.error('🔴 Error status:', error?.response?.status);
      console.error('🔴 Error data:', JSON.stringify(error?.response?.data, null, 2));

      // Handle user cancelled payment (Razorpay native cancel)
      const paymentCancelledCode = RazorpayCheckout?.PAYMENT_CANCELLED;
      if (paymentCancelledCode != null && error?.code === paymentCancelledCode) {
        console.log('🟡 User cancelled payment');
        setProcessing(false);
        return;
      }

      // Extract the most meaningful error message
      const apiMessage = error?.response?.data?.message || error?.response?.data?.error;
      const errorMessage =
        apiMessage ||
        error.description ||
        error.message ||
        'Failed to process payment. Please try again.';

      // Check if it's a network error
      if (error.message?.includes('Network') || error.code === 'ERR_NETWORK') {
        Alert.alert(
          'Network Error',
          'Unable to connect to server. Please check your internet connection and try again.'
        );
      } else if (errorMessage.includes('development build')) {
        Alert.alert(
          'Setup Required',
          'Razorpay requires a custom development build (or release build). Expo Go does not support this native module.'
        );
      } else {
        Alert.alert('Purchase failed', errorMessage);
      }
    } finally {
      setProcessing(false);
    }
  };

  if (!visible) {
    return null;
  }

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
            <Text style={styles.title}>Add Credits</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              disabled={processing}
            >
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            {/* Info */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={20} color={Colors.primary} />
              <Text style={styles.infoText}>
                Credits are deducted twice per job: ₹150 on assignment + ₹150 on completion (₹300 total/job)
              </Text>
            </View>

            {/* Package Info */}
            <Text style={styles.sectionTitle}>Credit Package</Text>
            <View style={styles.packageContainer}>
              <View style={styles.singlePackage}>
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>MINIMUM PACKAGE</Text>
                </View>
                <Text style={styles.packageAmount}>₹50,000</Text>
                <Text style={styles.packageJobs}>166 complete jobs</Text>

                {/* No Expiry Badge */}
                <View style={styles.noExpiryBadge}>
                  <Ionicons name="infinite" size={16} color={Colors.success} />
                  <Text style={styles.noExpiryText}>No Expiry</Text>
                </View>

                <View style={styles.bonusBadge}>
                  <Ionicons name="star-outline" size={12} color={Colors.primary} />
                  <Text style={styles.bonusText}>₹300/job (₹150 × 2)</Text>
                </View>
                <Text style={styles.packageNote}>
                  ₹150 deducted on assignment + ₹150 on completion
                </Text>
              </View>
            </View>

            {/* Payment Details */}
            <View style={styles.details}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount</Text>
                <Text style={styles.detailValue}>{formatCurrency(selectedAmount)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment Method</Text>
                <View style={styles.paymentMethod}>
                  <Ionicons name="card-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.paymentText}>Card / UPI</Text>
                </View>
              </View>
            </View>

            {/* Terms */}
            <Text style={styles.terms}>
              By purchasing credits, you agree to our terms. Credits are non-refundable except in case of platform errors.
            </Text>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Button
              label={processing ? 'Processing...' : `Pay ${formatCurrency(selectedAmount)}`}
              onPress={handlePurchase}
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
    maxHeight: '90%',
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
    paddingBottom: Spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryBg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  packageContainer: {
    marginBottom: Spacing.xl,
  },
  singlePackage: {
    backgroundColor: Colors.primaryBg,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    position: 'relative',
  },
  packageNote: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: Colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  popularText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  packageAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  packageJobs: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  noExpiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  noExpiryText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.success,
  },
  bonusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  bonusText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.success,
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  details: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
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
  terms: {
    fontSize: 11,
    color: Colors.textTertiary,
    lineHeight: 16,
    textAlign: 'center',
  },
  footer: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
