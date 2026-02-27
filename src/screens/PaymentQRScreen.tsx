import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { Colors, Spacing, BorderRadius, Typography } from '../theme/colors';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { formatCurrency, formatDate } from '../utils/format';
import { paymentApi } from '../api/paymentApi';
import { ProBooking } from '../types';

const { width } = Dimensions.get('window');
const QR_SIZE = width * 0.7; // 70% of screen width

export const PaymentQRScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const booking: ProBooking = route.params?.booking;

  const [loading, setLoading] = useState(true);
  const [qrData, setQrData] = useState<any>(null);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'completed' | 'expired'>('pending');
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    generateQRCode();
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  useEffect(() => {
    if (qrData) {
      // Animate QR code appearance
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Start countdown timer
      const expiresAt = new Date(qrData.expiresAt).getTime();
      const updateTimer = () => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
        setTimeLeft(remaining);

        if (remaining === 0) {
          setPaymentStatus('expired');
          if (pollInterval) clearInterval(pollInterval);
        }
      };

      updateTimer();
      const timerInterval = setInterval(updateTimer, 1000);

      // Poll for payment status every 3 seconds
      const statusPollInterval = setInterval(checkPaymentStatus, 3000);
      setPollInterval(statusPollInterval);

      return () => {
        clearInterval(timerInterval);
        clearInterval(statusPollInterval);
      };
    }
  }, [qrData]);

  const generateQRCode = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await paymentApi.generateUPIQR(booking.id);
      const data = response.data;

      setQrData({
        qrCodeUrl: data.qrCodeUrl,
        paymentUrl: data.paymentUrl,
        qrCodeId: data.qrCodeId,
        amount: data.amount,
        expiresAt: data.expiresAt,
        paymentId: data.payment._id,
      });
    } catch (err: any) {
      console.error('Failed to generate QR code:', err);
      setError(err.response?.data?.message || 'Failed to generate QR code');
      Alert.alert('Error', 'Failed to generate payment QR code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (!qrData?.paymentId) return;

    try {
      const response = await paymentApi.getPaymentStatus(qrData.paymentId);
      const status = response.data.status;

      if (status === 'succeeded') {
        setPaymentStatus('completed');
        if (pollInterval) clearInterval(pollInterval);
        showSuccessAnimation();
      } else if (status === 'processing') {
        setPaymentStatus('processing');
      }
    } catch (err) {
      console.error('Failed to check payment status:', err);
    }
  };

  const showSuccessAnimation = () => {
    Animated.sequence([
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
    ]).start(() => {
      Alert.alert(
        'Payment Received! ✅',
        'Customer has successfully paid via UPI.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRegenerateQR = () => {
    Alert.alert(
      'Regenerate QR Code',
      'Generate a new QR code for this payment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          onPress: () => {
            setQrData(null);
            generateQRCode();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Generating QR Code...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !qrData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={Colors.error} />
          <Text style={styles.errorTitle}>Failed to Generate QR Code</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Button
            label="Try Again"
            onPress={generateQRCode}
            icon="refresh"
            style={styles.retryButton}
          />
          <Button
            label="Go Back"
            onPress={() => navigation.goBack()}
            variant="secondary"
            style={styles.retryButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment QR Code</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Success Overlay */}
        {paymentStatus === 'completed' && (
          <Animated.View
            style={[
              styles.successOverlay,
              {
                opacity: successAnim,
                transform: [
                  {
                    scale: successAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.successCard}>
              <Ionicons name="checkmark-circle" size={80} color={Colors.success} />
              <Text style={styles.successTitle}>Payment Received!</Text>
              <Text style={styles.successMessage}>
                Customer paid ₹{formatCurrency(qrData?.amount || 0)} via UPI
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Status Banner */}
        {paymentStatus === 'processing' && (
          <Card style={styles.statusBanner}>
            <View style={styles.statusBannerContent}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.statusBannerText}>Payment in progress...</Text>
            </View>
          </Card>
        )}

        {paymentStatus === 'expired' && (
          <Card style={[styles.statusBanner, styles.expiredBanner]}>
            <View style={styles.statusBannerContent}>
              <Ionicons name="time-outline" size={20} color={Colors.error} />
              <Text style={[styles.statusBannerText, { color: Colors.error }]}>
                QR Code Expired
              </Text>
            </View>
          </Card>
        )}

        {/* Booking Info */}
        <Card style={styles.bookingCard}>
          <View style={styles.bookingHeader}>
            <Text style={styles.bookingNumber}>Booking #{booking.bookingNumber}</Text>
            <Text style={styles.customerName}>{booking.customer?.name}</Text>
          </View>
          <View style={styles.bookingDetails}>
            <Text style={styles.serviceName}>{booking.service?.name}</Text>
            <Text style={styles.bookingDate}>{formatDate(booking.scheduledFor)}</Text>
          </View>
        </Card>

        {/* QR Code */}
        <Animated.View
          style={[
            styles.qrContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Card style={styles.qrCard}>
            <Text style={styles.qrTitle}>Ask customer to scan this QR code</Text>
            <Text style={styles.qrSubtitle}>
              Using any UPI app (GPay, PhonePe, Paytm)
            </Text>

            <View style={styles.qrCodeWrapper}>
              {qrData?.paymentUrl && (
                <QRCode
                  value={qrData.paymentUrl}
                  size={QR_SIZE}
                  backgroundColor="white"
                  color={Colors.text}
                  logo={require('../../assets/icon.png')}
                  logoSize={QR_SIZE * 0.2}
                  logoBackgroundColor="white"
                  logoBorderRadius={8}
                />
              )}
            </View>

            {/* Amount */}
            <View style={styles.amountContainer}>
              <Text style={styles.amountLabel}>Amount to Pay</Text>
              <Text style={styles.amountValue}>
                ₹{formatCurrency(qrData?.amount || 0)}
              </Text>
            </View>

            {/* Timer */}
            {paymentStatus === 'pending' && timeLeft > 0 && (
              <View style={styles.timerContainer}>
                <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.timerText}>
                  Valid for {formatTime(timeLeft)}
                </Text>
              </View>
            )}
          </Card>
        </Animated.View>

        {/* Instructions */}
        <Card style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>How it works</Text>
          <View style={styles.instructionsList}>
            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>1</Text>
              </View>
              <Text style={styles.instructionText}>
                Customer opens any UPI app (GPay, PhonePe, Paytm)
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>2</Text>
              </View>
              <Text style={styles.instructionText}>
                Customer scans the QR code above
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>3</Text>
              </View>
              <Text style={styles.instructionText}>
                Customer confirms payment in their app
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>4</Text>
              </View>
              <Text style={styles.instructionText}>
                You'll see confirmation instantly!
              </Text>
            </View>
          </View>
        </Card>

        {/* Actions */}
        {paymentStatus === 'expired' && (
          <Button
            label="Generate New QR Code"
            onPress={handleRegenerateQR}
            icon="refresh"
            fullWidth
            style={styles.actionButton}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl * 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorTitle: {
    ...Typography.h2,
    color: Colors.text,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  errorMessage: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.lg,
    minWidth: 200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.text,
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  successCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl * 2,
    alignItems: 'center',
    margin: Spacing.xl,
  },
  successTitle: {
    ...Typography.h1,
    color: Colors.success,
    marginTop: Spacing.lg,
  },
  successMessage: {
    ...Typography.body,
    color: Colors.text,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  statusBanner: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.primaryLight,
  },
  expiredBanner: {
    backgroundColor: '#FFEBEE',
  },
  statusBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusBannerText: {
    ...Typography.bodyBold,
    color: Colors.primary,
  },
  bookingCard: {
    marginBottom: Spacing.lg,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  bookingNumber: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  customerName: {
    ...Typography.bodyBold,
    color: Colors.text,
  },
  bookingDetails: {
    marginTop: Spacing.xs,
  },
  serviceName: {
    ...Typography.body,
    color: Colors.text,
  },
  bookingDate: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  qrContainer: {
    marginBottom: Spacing.lg,
  },
  qrCard: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  qrTitle: {
    ...Typography.h3,
    color: Colors.text,
    textAlign: 'center',
  },
  qrSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  qrCodeWrapper: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  amountContainer: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  amountLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  amountValue: {
    ...Typography.h1,
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: Colors.backgroundAlt,
    borderRadius: BorderRadius.sm,
  },
  timerText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  instructionsCard: {
    marginBottom: Spacing.lg,
  },
  instructionsTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  instructionsList: {
    gap: Spacing.md,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionNumberText: {
    ...Typography.caption,
    color: Colors.surface,
    fontWeight: 'bold',
  },
  instructionText: {
    ...Typography.body,
    color: Colors.text,
    flex: 1,
  },
  actionButton: {
    marginTop: Spacing.md,
  },
});
