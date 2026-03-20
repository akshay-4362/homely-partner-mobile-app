/**
 * Booking Workflow Screen (Orchestrator)
 * Manages the sequential job execution workflow
 * Determines current stage and renders appropriate component
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, Typography } from '../../theme/colors';
import { ProBooking, AdditionalCharge } from '../../types';
import { WorkflowStage, ChargesData } from './types';
import { getCurrentStage } from './utils/stageUtils';
import { ProgressIndicator } from './components/ProgressIndicator';
import { Stage1_JobDetails } from './stages/Stage1_JobDetails';
import { Stage2_BeforeMedia } from './stages/Stage2_BeforeMedia';
import { Stage3_AfterMedia } from './stages/Stage3_AfterMedia';
import { Stage4_Payment } from './stages/Stage4_Payment';
import { Stage5_Summary } from './stages/Stage5_Summary';
import { bookingApi } from '../../api/bookingApi';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import {
  setCurrentStage,
  resetWorkflow,
  selectCurrentStage,
} from '../../store/booking-workflow/bookingWorkflowSlice';

// Normalize raw backend booking data
const normalizeBooking = (b: any): ProBooking => ({
  id: b._id || b.id || b.bookingId,
  bookingNumber: b.bookingNumber,
  serviceName: b.service?.name || b.serviceName || 'Service',
  customerName: b.customer
    ? `${b.customer.firstName} ${b.customer.lastName}`
    : b.customerName || 'Customer',
  customerPhone: b.customer?.phone || b.customerPhone,
  scheduledAt: b.scheduledAt,
  status: b.status,
  city: b.address?.city || b.addressSnapshot?.city || b.city,
  paymentMethod: b.paymentMethod,
  paymentStatus: b.payment?.status || b.paymentStatus,
  paidAt: b.payment?.paidAt || b.paidAt,
  paymentAmount: b.payment?.amount || b.paymentAmount,
  paymentIntentId: b.payment?.stripePaymentIntentId || b.paymentIntentId,
  addressLine: b.address
    ? [b.address.line1, b.address.city].filter(Boolean).join(', ')
    : b.addressSnapshot
      ? [b.addressSnapshot.line1, b.addressSnapshot.city].filter(Boolean).join(', ')
      : b.addressLine,
  addressFull: b.address
    ? [b.address.line1, b.address.line2, b.address.city, b.address.state, b.address.pincode]
      .filter(Boolean)
      .join(', ')
    : b.addressSnapshot
      ? [b.addressSnapshot.line1, b.addressSnapshot.line2, b.addressSnapshot.city, b.addressSnapshot.state, b.addressSnapshot.pincode]
        .filter(Boolean)
        .join(', ')
      : b.addressFull,
  lat: b.address?.lat || b.addressSnapshot?.lat || b.lat,
  lng: b.address?.lng || b.addressSnapshot?.lng || b.lng,
  total: b.total ?? b.pricing?.total ?? b.earnings ?? 0,
  additionalChargesTotal: b.additionalChargesTotal ?? 0,
  finalTotal: b.finalTotal ?? b.total ?? b.earnings ?? 0,
  creditDeducted: b.creditDeducted ?? b.pricing?.creditDeducted,
  beforeMedia: b.beforeMedia || [],
  afterMedia: b.afterMedia || [],
  warrantyExpiresAt: b.warrantyExpiresAt,
  warrantyClaimed: b.warrantyClaimed,
  warrantyClaimReason: b.warrantyClaimReason,
  startOtp: b.startOtp,
  completionOtp: b.completionOtp,
});

export const BookingWorkflowScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();

  const fromScreen = route.params?.fromScreen;

  // Derive the booking ID from params — supports both full booking object and bookingId-only navigation
  const paramBookingId: string =
    route.params?.booking?.id ||
    route.params?.booking?._id ||
    route.params?.bookingId;

  // Local state — seeded from route params so there is *something* to show immediately
  const [booking, setBooking] = useState<ProBooking>(() =>
    normalizeBooking(route.params?.booking ?? { _id: paramBookingId })
  );
  const [charges, setCharges] = useState<ChargesData>({
    pending: [],
    approved: [],
    total: 0,
  });
  const [loading, setLoading] = useState(false);

  // Track which booking ID we last loaded so we can detect navigation to a different job
  const loadedBookingIdRef = useRef<string | null>(null);

  // Redux state
  const currentStage = useAppSelector(selectCurrentStage);

  // Calculate actual stage from booking data
  const actualStage = getCurrentStage(booking, charges);

  // Sync Redux stage with actual stage
  useEffect(() => {
    if (actualStage !== currentStage) {
      dispatch(setCurrentStage(actualStage));
    }
  }, [actualStage]);

  // Load full booking data from backend.
  // showLoading=true shows a spinner (first open); false = silent background refresh.
  const loadBookingData = useCallback(async (id: string, showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [bookingData, chargesData] = await Promise.all([
        bookingApi.getBookingById(id),
        bookingApi.getCharges(id).catch(() => ({ pending: [], approved: [], total: 0 })),
      ]);

      setBooking(normalizeBooking(bookingData));
      setCharges(chargesData?.data || chargesData);
    } catch (error) {
      console.error('Failed to load booking data:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // When the screen comes into focus, check if this is a NEW booking (different from last load).
  // If so, reset state and load fresh. If returning to the same booking, silently refresh.
  useFocusEffect(
    useCallback(() => {
      if (!paramBookingId) return;

      const isNewBooking = loadedBookingIdRef.current !== paramBookingId;

      if (isNewBooking) {
        // Reset to the newly selected booking immediately so stale data is never shown
        setBooking(normalizeBooking(route.params?.booking ?? { _id: paramBookingId }));
        setCharges({ pending: [], approved: [], total: 0 });
        loadedBookingIdRef.current = paramBookingId;
        loadBookingData(paramBookingId, true);
      } else {
        // Same booking — silent background refresh (no spinner, no unmount of stage components)
        loadBookingData(paramBookingId, false);
      }
    }, [paramBookingId, loadBookingData])
  );

  // Reset workflow on unmount
  useEffect(() => {
    return () => {
      dispatch(resetWorkflow());
    };
  }, []);

  /**
   * Handle stage completion.
   * Advance stage immediately for instant UI transition, then refresh data
   * silently in the background — no freeze, no loading screen between stages.
   */
  const handleStageComplete = (nextStage: WorkflowStage) => {
    dispatch(setCurrentStage(nextStage));
    loadBookingData(paramBookingId, false); // background refresh, no await
  };

  /**
   * Handle errors
   */
  const handleError = (error: string) => {
    console.error('Workflow error:', error);
    // Errors are already shown via Alert in stage components
  };

  /**
   * Navigate back
   */
  const goBack = () => {
    if (fromScreen) {
      navigation.navigate('MainTabs', { screen: fromScreen });
    } else {
      navigation.goBack();
    }
  };

  /**
   * Open chat
   */
  const openChat = () => {
    if (booking.status === 'confirmed' || booking.status === 'in_progress') {
      navigation.navigate('Chat', { booking });
    }
  };

  /**
   * Render appropriate stage component
   */
  const renderStage = () => {
    const stageProps = {
      booking,
      charges,
      onStageComplete: handleStageComplete,
      onError: handleError,
    };

    switch (currentStage) {
      case 1:
        return <Stage1_JobDetails {...stageProps} />;

      case 2:
        return <Stage2_BeforeMedia {...stageProps} />;

      case 3:
        return <Stage3_AfterMedia {...stageProps} />;

      case 4:
        return <Stage4_Payment {...stageProps} />;

      case 5:
        return <Stage5_Summary {...stageProps} />;

      default:
        return (
          <View style={styles.placeholder}>
            <Text style={Typography.h4}>Unknown Stage</Text>
            <Text style={Typography.body}>Please contact support</Text>
          </View>
        );
    }
  };

  // Show completed view for completed jobs (no workflow)
  const isCompleted = booking.status === 'completed';
  const showProgressIndicator = currentStage > 1 && !isCompleted;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Detail</Text>
        {(booking.status === 'confirmed' || booking.status === 'in_progress') && (
          <TouchableOpacity onPress={openChat} style={styles.chatBtn}>
            <Ionicons name="chatbubble-outline" size={24} color={Colors.primary} />
          </TouchableOpacity>
        )}
        {(booking.status === 'completed' || booking.status === 'cancelled') && (
          <View style={{ width: 24 }} />
        )}
      </View>

      {/* Progress Indicator (stages 2-5) */}
      {showProgressIndicator && <ProgressIndicator currentStage={currentStage} />}

      {/* Stage Content */}
      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderStage()}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  backBtn: {
    padding: 4,
  },

  headerTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },

  chatBtn: {
    padding: 4,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: Spacing.xl,
    paddingBottom: 100,
  },

  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },

  loadingOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
