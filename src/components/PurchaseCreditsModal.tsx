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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
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
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [selectedAmount, setSelectedAmount] = useState<number>(50000);
  const [processing, setProcessing] = useState(false);

  const handlePurchase = async () => {
    try {
      setProcessing(true);

      // Step 1: Create payment intent on backend
      const { data } = await creditApi.createPurchaseIntent(selectedAmount);
      const { clientSecret, paymentIntentId } = data;

      // Step 2: Initialize payment sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Homelyo Professional',
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: {
          name: 'Professional Partner',
        },
        appearance: {
          colors: {
            primary: Colors.primary,
          },
        },
      });

      if (initError) {
        Alert.alert('Error', initError.message);
        setProcessing(false);
        return;
      }

      // Step 3: Present payment sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code !== 'Canceled') {
          Alert.alert('Payment failed', presentError.message);
        }
        setProcessing(false);
        return;
      }

      // Step 4: Confirm purchase on backend
      try {
        await creditApi.confirmPurchase(paymentIntentId, selectedAmount);

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
      console.error('Purchase error:', error);
      Alert.alert(
        'Purchase failed',
        error.response?.data?.message || 'Failed to process payment. Please try again.'
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
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
