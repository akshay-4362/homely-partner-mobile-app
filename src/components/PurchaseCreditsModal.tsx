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
  TextInput,
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
  { amount: 10000, label: '₹10,000', jobs: 33, popular: true, bonus: 'Starter' },
  { amount: 25000, label: '₹25,000', jobs: 83, bonus: 'Popular' },
  { amount: 50000, label: '₹50,000', jobs: 166, bonus: 'Value' },
  { amount: 100000, label: '₹1,00,000', jobs: 333, bonus: 'Best Value' },
];

const MINIMUM_AMOUNT = 10000;
const MAXIMUM_AMOUNT = 500000;

// Helper to calculate jobs from amount
const calculateJobs = (amount: number): number => {
  return Math.floor(amount / 300); // ₹300 per complete job (₹150 x 2)
};

export const PurchaseCreditsModal: React.FC<PurchaseCreditsModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [selectedAmount, setSelectedAmount] = useState<number>(10000);
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [customAmountText, setCustomAmountText] = useState<string>('');
  const [processing, setProcessing] = useState(false);

  React.useEffect(() => {
    console.log('🟢 PurchaseCreditsModal visible state changed:', visible);
  }, [visible]);

  const handlePackageSelect = (amount: number) => {
    setSelectedAmount(amount);
    setIsCustomAmount(false);
    setCustomAmountText('');
  };

  const handleCustomAmountChange = (text: string) => {
    // Remove non-numeric characters
    const numericText = text.replace(/[^0-9]/g, '');
    setCustomAmountText(numericText);

    const amount = parseInt(numericText) || 0;
    if (amount >= MINIMUM_AMOUNT && amount <= MAXIMUM_AMOUNT) {
      setSelectedAmount(amount);
    }
  };

  const handleCustomAmountSelect = () => {
    setIsCustomAmount(true);
    setCustomAmountText(selectedAmount.toString());
  };

  const getValidatedAmount = (): number | null => {
    if (isCustomAmount) {
      const amount = parseInt(customAmountText) || 0;
      if (amount < MINIMUM_AMOUNT) {
        Alert.alert('Invalid Amount', `Minimum purchase amount is ${formatCurrency(MINIMUM_AMOUNT)}`);
        return null;
      }
      if (amount > MAXIMUM_AMOUNT) {
        Alert.alert('Invalid Amount', `Maximum purchase amount is ${formatCurrency(MAXIMUM_AMOUNT)}`);
        return null;
      }
      return amount;
    }
    return selectedAmount;
  };

  const handlePurchase = async () => {
    const validAmount = getValidatedAmount();
    if (!validAmount) return;
    try {
      console.log('🟡 Purchase initiated, amount:', validAmount);
      setProcessing(true);

      if (Constants.appOwnership === 'expo') {
        throw new Error('Razorpay is not available in Expo Go. Please use a development build.');
      }

      // Step 1: Create Razorpay order on backend
      console.log('🟡 Creating Razorpay order...');
      const response = await creditApi.createPurchaseIntent(validAmount);
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
          validAmount
        );

        Alert.alert(
          'Success!',
          `${formatCurrency(validAmount)} credits added to your account`,
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

            {/* Package Options */}
            <Text style={styles.sectionTitle}>Choose Amount</Text>
            <View style={styles.packageContainer}>
              {CREDIT_PACKAGES.map((pkg) => (
                <TouchableOpacity
                  key={pkg.amount}
                  style={[
                    styles.packageCard,
                    !isCustomAmount && selectedAmount === pkg.amount && styles.packageCardSelected,
                  ]}
                  onPress={() => handlePackageSelect(pkg.amount)}
                  disabled={processing}
                >
                  {pkg.popular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularText}>POPULAR</Text>
                    </View>
                  )}
                  <View style={styles.packageHeader}>
                    <Text style={styles.packageAmount}>{pkg.label}</Text>
                    {!isCustomAmount && selectedAmount === pkg.amount && (
                      <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                    )}
                  </View>
                  <Text style={styles.packageJobs}>{pkg.jobs} complete jobs</Text>
                  {pkg.bonus && (
                    <View style={styles.bonusBadge}>
                      <Text style={styles.bonusText}>{pkg.bonus}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}

              {/* Custom Amount Option */}
              <TouchableOpacity
                style={[
                  styles.packageCard,
                  styles.customPackageCard,
                  isCustomAmount && styles.packageCardSelected,
                ]}
                onPress={handleCustomAmountSelect}
                disabled={processing}
              >
                <View style={styles.packageHeader}>
                  <Text style={styles.packageAmount}>Custom Amount</Text>
                  {isCustomAmount && (
                    <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                  )}
                </View>
                {isCustomAmount ? (
                  <View style={styles.customInputContainer}>
                    <Text style={styles.rupeeSymbol}>₹</Text>
                    <TextInput
                      style={styles.customInput}
                      value={customAmountText}
                      onChangeText={handleCustomAmountChange}
                      placeholder="Enter amount"
                      placeholderTextColor={Colors.textTertiary}
                      keyboardType="numeric"
                      maxLength={7}
                      autoFocus
                    />
                  </View>
                ) : (
                  <Text style={styles.packageJobs}>Min: ₹10,000</Text>
                )}
                {isCustomAmount && customAmountText && parseInt(customAmountText) >= MINIMUM_AMOUNT && (
                  <Text style={styles.packageJobs}>
                    {calculateJobs(parseInt(customAmountText))} complete jobs
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Pricing Info */}
            <View style={styles.pricingInfo}>
              <Ionicons name="calculator-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.pricingText}>
                ₹300 per complete job (₹150 on assignment + ₹150 on completion)
              </Text>
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
              label={
                processing
                  ? 'Processing...'
                  : `Pay ${formatCurrency(isCustomAmount && customAmountText ? parseInt(customAmountText) || 0 : selectedAmount)}`
              }
              onPress={handlePurchase}
              loading={processing}
              disabled={processing || (isCustomAmount && (!customAmountText || parseInt(customAmountText) < MINIMUM_AMOUNT))}
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
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  packageCard: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    position: 'relative',
  },
  packageCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  customPackageCard: {
    borderStyle: 'dashed',
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: Spacing.md,
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
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  packageJobs: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  rupeeSymbol: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginRight: 4,
  },
  customInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    padding: 0,
    margin: 0,
  },
  pricingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.gray50,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  pricingText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  bonusBadge: {
    backgroundColor: Colors.gray100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  bonusText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
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
