import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, FlatList, Image, Linking, Platform, Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// MapMyIndia (Mappls) API Key
const MAPPLS_API_KEY = process.env.EXPO_PUBLIC_MAPPLS_API_KEY || '77982c1e7ce80c97d51014114a198fb2';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { updateProBookingStatus } from '../store/bookingSlice';
import { bookingApi } from '../api/bookingApi';
import { Colors, Spacing, BorderRadius, Typography } from '../theme/colors';
import { formatCurrency, formatDate, formatDateOnly } from '../utils/format';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { ProBooking, AdditionalCharge, MediaItem } from '../types';
import { FaceVerificationModal } from '../components/FaceVerificationModal';
import { RateCustomerModal } from '../components/RateCustomerModal';
import { useSocket } from '../hooks/useSocket';

const CHARGE_CATEGORIES = ['materials', 'extra_work', 'transport', 'other'];

// Normalize raw backend booking data to match ProBooking shape
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

export const BookingDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const initialBooking: ProBooking = normalizeBooking(route.params?.booking);
  const fromScreen = route.params?.fromScreen; // Track where user came from

  // Use local state for booking to allow updates
  const [booking, setBooking] = useState<ProBooking>(initialBooking);

  // Reset booking state when navigating to a different job
  useEffect(() => {
    setBooking(normalizeBooking(route.params?.booking));
    setOtp('');
    setError('');
    setCharges(null);
    setBeforeMedia([]);
    setAfterMedia([]);
  }, [route.params?.booking]);

  // When returning from PaymentQRScreen after a successful online/UPI payment,
  // auto-show the rate-customer modal so the professional can rate the customer.
  useEffect(() => {
    if (route.params?.paymentComplete) {
      setBooking(prev => ({ ...prev, status: 'completed' }));
      setShowRatingModal(true);
    }
  }, [route.params?.paymentComplete]);

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [faceVerificationModal, setFaceVerificationModal] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [fullImageUri, setFullImageUri] = useState<string | null>(null);

  // Charges
  const [charges, setCharges] = useState<{ pending: AdditionalCharge[]; approved: AdditionalCharge[]; total: number } | null>(null);
  const [chargesModal, setChargesModal] = useState(false);
  const [addChargeModal, setAddChargeModal] = useState(false);
  const [newCharges, setNewCharges] = useState([{ description: '', amount: '', category: 'materials' }]);

  // Media - UC Style (combined photo/video)
  const [beforeMedia, setBeforeMedia] = useState<MediaItem[]>([]);
  const [afterMedia, setAfterMedia] = useState<MediaItem[]>([]);
  const [mediaBottomSheet, setMediaBottomSheet] = useState<{
    visible: boolean;
    target: 'before' | 'after' | 'oldPart' | 'newPart';
  }>({ visible: false, target: 'before' });

  // Parts Replacement - UC Style (No Price, Just Media)
  const [addPartModal, setAddPartModal] = useState(false);
  const [parts, setParts] = useState<Array<{
    id: string;
    oldPartName: string;
    oldPartMedia: MediaItem[];
    newPartName: string;
    newPartMedia: MediaItem[];
  }>>([]);
  const [currentPart, setCurrentPart] = useState({
    oldPartName: '',
    oldPartMedia: [] as MediaItem[],
    newPartName: '',
    newPartMedia: [] as MediaItem[],
  });
  const [editingPartId, setEditingPartId] = useState<string | null>(null);

  // Payment method for completion (cash vs online)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('online');

  // Socket connection for real-time updates
  const socket = useSocket();

  useEffect(() => {
    // Fetch full booking details to get media data (list API may not include it)
    const loadFullBooking = async () => {
      try {
        if (booking.id) {
          const raw = await bookingApi.getBookingById(booking.id);
          const full = normalizeBooking(raw);
          setBooking((prev) => ({
            ...prev,
            beforeMedia: full.beforeMedia,
            afterMedia: full.afterMedia,
            total: full.total || prev.total,
            finalTotal: full.finalTotal || prev.finalTotal,
            additionalChargesTotal: full.additionalChargesTotal ?? prev.additionalChargesTotal,
          }));
        }
      } catch (e) {
        console.log('Failed to load full booking details:', e);
      }
    };
    loadFullBooking();

    if (booking.status === 'in_progress' || booking.status === 'completed') {
      loadCharges();
    }

    // Set up socket listeners for real-time charge updates
    if (socket) {
      // Listen for charge approvals
      const handleChargeApproved = (data: any) => {
        if (data.bookingId === booking.id) {
          console.log('[Socket] Charge approved:', data);
          // Refresh charges immediately
          loadCharges();
          // Show alert to professional
          Alert.alert(
            'Charge Approved! ✅',
            `Customer approved your ₹${data.charge?.amount} charge for ${data.charge?.description}`
          );
        }
      };

      // Listen for charge rejections
      const handleChargeRejected = (data: any) => {
        if (data.bookingId === booking.id) {
          console.log('[Socket] Charge rejected:', data);
          // Refresh charges immediately
          loadCharges();
          // Show alert to professional
          Alert.alert(
            'Charge Rejected',
            `Customer rejected your ₹${data.charge?.amount} charge for ${data.charge?.description}`
          );
        }
      };

      // Listen for general booking updates
      const handleBookingUpdated = (data: any) => {
        if (data.bookingId === booking.id) {
          console.log('[Socket] Booking updated:', data.type);
          // Refresh charges for any booking update
          loadCharges();
        }
      };

      socket.on('charge_approved', handleChargeApproved);
      socket.on('charge_rejected', handleChargeRejected);
      socket.on('booking_updated', handleBookingUpdated);

      // Cleanup listeners on unmount
      return () => {
        socket.off('charge_approved', handleChargeApproved);
        socket.off('charge_rejected', handleChargeRejected);
        socket.off('booking_updated', handleBookingUpdated);
      };
    }
  }, [booking.id, socket]);

  const loadCharges = async () => {
    try {
      const data = await bookingApi.getCharges(booking.id);
      setCharges(data?.data || data);
    } catch { }
  };

  const initiateJobStart = () => {
    // Face verification disabled - proceed directly
    setFaceVerified(true);
    Alert.alert(
      'Ready to Start',
      'You can now enter the start OTP from the customer to begin the job.'
    );
  };

  const handleFaceVerificationSuccess = () => {
    setFaceVerificationModal(false);
    setFaceVerified(true);
    Alert.alert(
      'Verification Successful',
      'Your identity has been verified. You can now enter the start OTP from the customer.'
    );
  };

  const handleStatusChange = async (newStatus: string) => {
    setError('');

    // Only require OTP for starting job, not for completion
    const trimmedOtp = otp.trim();
    if (newStatus === 'in_progress' && !trimmedOtp) {
      setError('Please enter the start OTP from customer');
      return;
    }

    // For completion with cash payment (pay_later only), show confirmation
    if (newStatus === 'completed' && booking.paymentMethod === 'pay_later' && paymentMethod === 'cash') {
      Alert.alert(
        'Confirm Cash Payment',
        `Did you receive ₹${booking.finalTotal || booking.total} in cash from the customer?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Received',
            onPress: () => completeWithCash()
          },
        ]
      );
      return;
    }

    setLoading(true);
    try {
      const res = await dispatch(updateProBookingStatus({
        bookingId: booking.id,
        status: newStatus,
        otp: newStatus === 'in_progress' ? trimmedOtp : undefined,
        cashPayment: newStatus === 'completed' && paymentMethod === 'cash'
      }));
      setLoading(false);

      if (res.meta.requestStatus === 'fulfilled') {
        // Update local booking state with new status
        setBooking({ ...booking, status: newStatus as any });

        if (newStatus === 'completed') {
          // Show rating modal immediately after completion
          Alert.alert(
            'Job Completed! ✓',
            'Invoice has been generated. Would you like to rate this customer?',
            [
              {
                text: 'Rate Customer',
                onPress: () => {
                  setShowRatingModal(true);
                }
              },
              {
                text: 'Skip',
                onPress: () => navigation.goBack(),
                style: 'cancel'
              }
            ]
          );
        } else if (newStatus === 'in_progress') {
          // Job started - stay on the page to show upload media section
          Alert.alert('Job Started! ✓', 'You can now upload before photos/videos and add charges.');
          setOtp(''); // Clear OTP input
        } else {
          // For other status changes (if any), navigate back
          Alert.alert('Success', `Job updated to ${newStatus.replace('_', ' ')}`);
          navigation.goBack();
        }
      } else {
        const errorMsg = (res.payload as string) || 'Failed to update status';
        setError(errorMsg);
        Alert.alert('Error', errorMsg);
      }
    } catch (error) {
      setLoading(false);
      const errorMsg = error instanceof Error ? error.message : 'Failed to update status';
      setError(errorMsg);
      Alert.alert('Error', errorMsg);
    }
  };

  // Validation before job completion - removed strict validation to prevent crashes
  const validateCompletion = (): boolean => {
    // Removed strict media validation - allow completion without media
    // Media upload is optional for job completion
    return true;
  };

  const completeWithCash = async () => {
    // Validate before proceeding
    if (!validateCompletion()) {
      return;
    }

    setLoading(true);
    try {
      const res = await dispatch(updateProBookingStatus({
        bookingId: booking.id,
        status: 'completed',
        cashPayment: true
      }));
      setLoading(false);

      if (res.meta.requestStatus === 'fulfilled') {
        // Update local booking state
        setBooking({ ...booking, status: 'completed' });

        // Show rating modal immediately after completion
        Alert.alert(
          'Job Completed! ✓',
          'Cash payment received. Invoice has been generated. Would you like to rate this customer?',
          [
            {
              text: 'Rate Customer',
              onPress: () => {
                setShowRatingModal(true);
              }
            },
            {
              text: 'Skip',
              onPress: () => navigation.goBack(),
              style: 'cancel'
            }
          ]
        );
      } else {
        const errorMsg = (res.payload as string) || 'Failed to complete job';
        setError(errorMsg);
        Alert.alert('Error', errorMsg);
      }
    } catch (error) {
      setLoading(false);
      const errorMsg = error instanceof Error ? error.message : 'Failed to complete job';
      setError(errorMsg);
      Alert.alert('Error', errorMsg);
    }
  };

  // UC-Style Media Upload - Single "Add Media" button with bottom sheet
  const openMediaBottomSheet = (target: 'before' | 'after' | 'oldPart' | 'newPart') => {
    setMediaBottomSheet({ visible: true, target });
  };

  const handleMediaAction = async (action: 'photo' | 'video' | 'gallery') => {
    setMediaBottomSheet({ ...mediaBottomSheet, visible: false });

    if (action === 'photo') {
      await takePhoto();
    } else if (action === 'video') {
      await recordVideo();
    } else if (action === 'gallery') {
      await pickFromGallery();
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      addMediaToTarget(result.assets[0], 'photo');
    }
  };

  const recordVideo = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      quality: 0.7,
      base64: true,
      videoMaxDuration: 30,
    });

    if (!result.canceled && result.assets[0]) {
      addMediaToTarget(result.assets[0], 'video');
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery permission is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.7,
      base64: true,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const type = asset.type === 'video' ? 'video' : 'photo';
      addMediaToTarget(asset, type);
    }
  };

  const addMediaToTarget = (asset: any, type: 'photo' | 'video') => {
    const mediaItem: MediaItem = {
      dataUrl: `data:${type === 'video' ? 'video/mp4' : 'image/jpeg'};base64,${asset.base64}`,
      type,
      label: type === 'photo' ? 'Photo' : 'Video',
    };

    const target = mediaBottomSheet.target;
    if (target === 'before') {
      setBeforeMedia(prev => [...prev, mediaItem]);
    } else if (target === 'after') {
      setAfterMedia(prev => [...prev, mediaItem]);
    } else if (target === 'oldPart') {
      setCurrentPart(prev => ({ ...prev, oldPartMedia: [...prev.oldPartMedia, mediaItem] }));
    } else if (target === 'newPart') {
      setCurrentPart(prev => ({ ...prev, newPartMedia: [...prev.newPartMedia, mediaItem] }));
    }
  };

  const removeMediaFromTarget = (target: 'before' | 'after' | 'oldPart' | 'newPart', index: number) => {
    if (target === 'before') {
      setBeforeMedia(prev => prev.filter((_, i) => i !== index));
    } else if (target === 'after') {
      setAfterMedia(prev => prev.filter((_, i) => i !== index));
    } else if (target === 'oldPart') {
      setCurrentPart(prev => ({ ...prev, oldPartMedia: prev.oldPartMedia.filter((_, i) => i !== index) }));
    } else if (target === 'newPart') {
      setCurrentPart(prev => ({ ...prev, newPartMedia: prev.newPartMedia.filter((_, i) => i !== index) }));
    }
  };

  const submitBeforeMedia = async () => {
    if (beforeMedia.length === 0) {
      Alert.alert('Error', 'Please add at least one photo or video');
      return;
    }
    setLoading(true);
    try {
      await bookingApi.addMedia(booking.id, 'before', beforeMedia);
      setBeforeMedia([]); // Clear pending media
      // Reload booking so the uploaded count updates correctly
      const raw = await bookingApi.getBookingById(booking.id);
      const updated = normalizeBooking(raw);
      setBooking((prev) => ({ ...prev, beforeMedia: updated.beforeMedia }));
      Alert.alert('Success', 'Before service media uploaded');
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to upload media';
      Alert.alert('Upload Failed', errorMsg);
      console.error('Before media upload error:', error);
    }
    setLoading(false);
  };

  const submitAfterMedia = async () => {
    if (afterMedia.length === 0) {
      Alert.alert('Error', 'Please add at least one photo or video');
      return;
    }
    setLoading(true);
    try {
      await bookingApi.addMedia(booking.id, 'after', afterMedia);
      setAfterMedia([]); // Clear pending media
      // Reload booking so the uploaded count updates correctly
      const raw = await bookingApi.getBookingById(booking.id);
      const updated = normalizeBooking(raw);
      setBooking((prev) => ({ ...prev, afterMedia: updated.afterMedia }));
      Alert.alert('Success', 'After service media uploaded');
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to upload media';
      Alert.alert('Upload Failed', errorMsg);
      console.error('After media upload error:', error);
    }
    setLoading(false);
  };

  // Parts Replacement Functions
  const openAddPartModal = () => {
    setCurrentPart({
      oldPartName: '',
      oldPartMedia: [],
      newPartName: '',
      newPartMedia: [],
    });
    setEditingPartId(null);
    setAddPartModal(true);
  };

  const editPart = (partId: string) => {
    const part = parts.find(p => p.id === partId);
    if (part) {
      setCurrentPart({
        oldPartName: part.oldPartName,
        oldPartMedia: part.oldPartMedia,
        newPartName: part.newPartName,
        newPartMedia: part.newPartMedia,
      });
      setEditingPartId(partId);
      setAddPartModal(true);
    }
  };

  const deletePart = (partId: string) => {
    Alert.alert(
      'Delete Part',
      'Are you sure you want to remove this part?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => setParts(prev => prev.filter(p => p.id !== partId)),
        },
      ]
    );
  };

  const savePart = async () => {
    if (!currentPart.oldPartName.trim() || !currentPart.newPartName.trim()) {
      Alert.alert('Error', 'Please fill in part names');
      return;
    }

    setLoading(true);
    try {
      // Submit part to backend
      await bookingApi.addParts(booking.id, [{
        oldPartName: currentPart.oldPartName,
        oldPartMedia: currentPart.oldPartMedia,
        newPartName: currentPart.newPartName,
        newPartMedia: currentPart.newPartMedia,
      }]);

      // Update local state
      if (editingPartId) {
        // Update existing part
        setParts(prev => prev.map(p => p.id === editingPartId
          ? { ...p, ...currentPart }
          : p
        ));
      } else {
        // Add new part
        setParts(prev => [...prev, {
          id: Date.now().toString(),
          ...currentPart,
        }]);
      }

      Alert.alert('Success', 'Part replacement recorded');
      setAddPartModal(false);
      setCurrentPart({
        oldPartName: '',
        oldPartMedia: [],
        newPartName: '',
        newPartMedia: [],
      });
      setEditingPartId(null);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to save part';
      Alert.alert('Failed to Save Part', errorMsg);
      console.error('Part save error:', error);
    }
    setLoading(false);
  };

  const submitCharges = async () => {
    const valid = newCharges.filter((c) => c.description && parseFloat(c.amount) > 0);
    if (valid.length === 0) { Alert.alert('Add at least one valid charge'); return; }
    setLoading(true);
    try {
      await bookingApi.addCharges(booking.id, valid.map((c) => ({
        description: c.description,
        amount: parseFloat(c.amount),
        category: c.category,
      })));
      Alert.alert('Success', 'Charges added. Customer will be notified for approval.');
      setAddChargeModal(false);
      setNewCharges([{ description: '', amount: '', category: 'materials' }]);
      loadCharges();
    } catch {
      Alert.alert('Error', 'Failed to add charges');
    }
    setLoading(false);
  };

  const handleDeleteCharge = (chargeId: string) => {
    Alert.alert(
      'Remove Charge',
      'Remove this charge? (Customer has denied or you want to cancel it)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await bookingApi.deleteCharge(booking.id, chargeId);
              loadCharges();
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.message || 'Failed to remove charge');
            }
          },
        },
      ]
    );
  };

  const openMap = () => {
    const url = booking.lat && booking.lng
      ? `https://maps.google.com/?q=${booking.lat},${booking.lng}`
      : `https://maps.google.com/?q=${encodeURIComponent(booking.addressFull || '')}`;
    Linking.openURL(url);
  };

  const openMapsApp = () => {
    // Check if lat/lng are available
    if (!booking.lat || !booking.lng) {
      // Fallback to address string
      openMap();
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
        openMap();
      });
    }
  };

  const callCustomer = () => {
    Linking.openURL(`tel:${booking.customerPhone}`);
  };

  const isConfirmed = booking.status === 'confirmed';
  const isInProgress = booking.status === 'in_progress';
  const isCompleted = booking.status === 'completed';
  const isCancelled = booking.status === 'cancelled' || booking.status === 'cancellation_pending';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity
          onPress={() => {
            if (fromScreen) {
              // Navigate to specific screen if coming from outside Jobs tab
              navigation.navigate('MainTabs', { screen: fromScreen });
            } else {
              // Default back behavior for Jobs tab navigation
              navigation.goBack();
            }
          }}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Job Detail</Text>
        {(isConfirmed || isInProgress) && (
          <TouchableOpacity onPress={() => navigation.navigate('Chat', { booking })} style={styles.chatBtn}>
            <Ionicons name="chatbubble-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header Card */}
        <Card style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1, marginRight: Spacing.md }}>
              <Text style={styles.bookingNum}>#{booking.bookingNumber}</Text>
              <Text style={styles.serviceName} numberOfLines={2}>{booking.serviceName}</Text>
            </View>
            <Badge status={booking.status} label={booking.status} />
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.infoText}>{booking.customerName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.infoText}>Booking Date: {formatDate(booking.scheduledAt)}</Text>
          </View>
          {!!booking.addressLine && (
            isCompleted ? (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={16} color={Colors.textTertiary} />
                <Text style={[styles.infoText, { color: Colors.textTertiary, flex: 1 }]}>
                  {booking.addressFull || booking.addressLine}
                </Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.infoRow} onPress={openMap}>
                <Ionicons name="location-outline" size={16} color={Colors.primary} />
                <Text style={[styles.infoText, { color: Colors.primary, flex: 1 }]}>
                  {booking.addressFull || booking.addressLine}
                </Text>
                <Ionicons name="open-outline" size={14} color={Colors.primary} />
              </TouchableOpacity>
            )
          )}
        </Card>

        {/* Location Section */}
        <Card style={styles.locationCard}>
          <Text style={styles.sectionTitle}>Job Location</Text>

          {/* Map Preview - MapMyIndia */}
          {!!(booking.lat && booking.lng) && (
            isCompleted ? (
              <Image
                source={{
                  uri: `https://apis.mapmyindia.com/advancedmaps/v1/${MAPPLS_API_KEY}/still_image?center=${booking.lat},${booking.lng}&zoom=15&size=${Math.round(SCREEN_WIDTH - 80)}x200&markers=${booking.lat},${booking.lng}`
                }}
                style={[styles.mapImage, { opacity: 0.5 }]}
                resizeMode="cover"
              />
            ) : (
              <TouchableOpacity onPress={openMapsApp} activeOpacity={0.8}>
                <Image
                  source={{
                    uri: `https://apis.mapmyindia.com/advancedmaps/v1/${MAPPLS_API_KEY}/still_image?center=${booking.lat},${booking.lng}&zoom=15&size=${Math.round(SCREEN_WIDTH - 80)}x200&markers=${booking.lat},${booking.lng}`
                  }}
                  style={styles.mapImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )
          )}

          {/* Full Address */}
          <View style={styles.addressRow}>
            <Ionicons name="location" size={20} color={Colors.primary} />
            <Text style={styles.addressText}>
              {booking.addressFull || booking.addressLine}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionBtn, isCompleted && styles.actionBtnDisabled]}
              onPress={isCompleted ? undefined : openMapsApp}
              activeOpacity={isCompleted ? 1 : 0.7}
            >
              <Ionicons name="map" size={20} color={isCompleted ? Colors.textTertiary : '#fff'} />
              <Text style={[styles.actionBtnText, isCompleted && styles.actionBtnTextDisabled]}>Open in Maps</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, isCompleted && styles.actionBtnDisabled]}
              onPress={isCompleted ? undefined : callCustomer}
              activeOpacity={isCompleted ? 1 : 0.7}
            >
              <Ionicons name="call" size={20} color={isCompleted ? Colors.textTertiary : '#fff'} />
              <Text style={[styles.actionBtnText, isCompleted && styles.actionBtnTextDisabled]}>Call Customer</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* OTP Section - Start Job (Face verification disabled) */}
        {isConfirmed && (
          <Card style={styles.otpCard}>
            <Text style={styles.sectionTitle}>Start Job</Text>
            <Text style={styles.otpHint}>Enter the 6-digit start OTP from customer</Text>
            <TextInput
              style={styles.otpInput}
              placeholder="Enter 6-digit OTP from customer"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
              placeholderTextColor={Colors.textTertiary}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Button
              label="Start Job"
              onPress={() => handleStatusChange('in_progress')}
              loading={loading}
              fullWidth
              style={{ marginTop: Spacing.md }}
            />
          </Card>
        )}

        {isInProgress && (
          <>
            {/* Additional Charges - First Section */}
            <Card>
              <View style={styles.chargesHeader}>
                <Text style={styles.sectionTitle}>Additional Charges</Text>
                <TouchableOpacity onPress={() => setChargesModal(true)}>
                  <Text style={styles.viewCharges}>View</Text>
                </TouchableOpacity>
              </View>
              {charges && (
                <View style={styles.chargesSummary}>
                  <Text style={styles.chargesStat}>
                    {charges.pending.length} pending • {charges.approved.length} approved
                  </Text>
                  {charges.total > 0 && (
                    <Text style={styles.chargesTotal}>Total: {formatCurrency(charges.total)}</Text>
                  )}
                </View>
              )}
              <Text style={styles.chargesNote}>Customer approves before payment is charged</Text>
              <Button
                label="Add Charges"
                onPress={() => setAddChargeModal(true)}
                variant="outline"
                size="sm"
                style={{ marginTop: Spacing.sm }}
              />
            </Card>

            {/* Media Upload */}
            <Card>
              <Text style={styles.sectionTitle}>Job Media</Text>

              {/* Before Media */}
              <View style={styles.mediaHeaderRow}>
                <Text style={styles.mediaGroupLabel}>
                  Before Photos/Videos
                </Text>
                <Text style={styles.mediaCount}>
                  {booking.beforeMedia?.length || 0} uploaded
                  {beforeMedia.length > 0 && ` • ${beforeMedia.length} pending`}
                </Text>
              </View>

              {/* Only show upload buttons if before media hasn't been uploaded yet */}
              {!(booking.beforeMedia && booking.beforeMedia.length > 0) && (
                <View style={styles.mediaButtonRow}>
                  <TouchableOpacity
                    style={styles.mediaActionBtn}
                    onPress={() => {
                      setMediaBottomSheet({ visible: false, target: 'before' });
                      takePhoto();
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="camera" size={22} color="#fff" />
                    <Text style={styles.mediaActionBtnText}>Upload Photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.mediaActionBtn, { backgroundColor: Colors.success }]}
                    onPress={() => {
                      setMediaBottomSheet({ visible: false, target: 'before' });
                      recordVideo();
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="videocam" size={22} color="#fff" />
                    <Text style={styles.mediaActionBtnText}>Upload Video</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Already Uploaded Before Media */}
              {booking.beforeMedia && booking.beforeMedia.length > 0 && (
                <View style={styles.uploadedMediaSection}>
                  <Text style={styles.uploadedMediaLabel}>✓ Uploaded</Text>
                  <View style={styles.mediaGrid}>
                    {booking.beforeMedia.map((media, index) => (
                      <TouchableOpacity key={`uploaded-before-${index}`} style={styles.mediaGridItem} onPress={() => setFullImageUri(media.dataUrl)} activeOpacity={0.8}>
                        <Image source={{ uri: media.dataUrl }} style={styles.mediaThumbnail} />
                        <View style={styles.uploadedBadge}>
                          <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                        </View>
                        <Text style={styles.mediaType}>{media.type === 'video' ? '🎥' : '📷'}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Before Media Preview Grid - Pending Upload */}
              {beforeMedia.length > 0 && (
                <View style={styles.mediaGrid}>
                  {beforeMedia.map((media, index) => (
                    <View key={index} style={styles.mediaGridItem}>
                      <Image source={{ uri: media.dataUrl }} style={styles.mediaThumbnail} />
                      <TouchableOpacity
                        style={styles.removeMediaBtn}
                        onPress={() => removeMediaFromTarget('before', index)}
                      >
                        <Ionicons name="close-circle" size={20} color={Colors.error} />
                      </TouchableOpacity>
                      <Text style={styles.mediaType}>{media.type === 'video' ? '🎥' : '📷'}</Text>
                    </View>
                  ))}
                </View>
              )}

              {beforeMedia.length > 0 && (
                <Button label="Submit Before Media" onPress={submitBeforeMedia} loading={loading} fullWidth />
              )}

              {/* After Media - Only show after charges are added */}
              {charges && (charges.pending.length > 0 || charges.approved.length > 0) && (
                <>
                  <View style={[styles.mediaHeaderRow, { marginTop: Spacing.xl }]}>
                    <Text style={styles.mediaGroupLabel}>
                      After Photos/Videos
                    </Text>
                    <Text style={styles.mediaCount}>
                      {booking.afterMedia?.length || 0} uploaded
                      {afterMedia.length > 0 && ` • ${afterMedia.length} pending`}
                    </Text>
                  </View>

                  {/* Only show upload buttons if after media hasn't been uploaded yet */}
                  {!(booking.afterMedia && booking.afterMedia.length > 0) && (
                    <View style={styles.mediaButtonRow}>
                      <TouchableOpacity
                        style={[styles.mediaActionBtn, { backgroundColor: Colors.success }]}
                        onPress={() => {
                          setMediaBottomSheet({ visible: false, target: 'after' });
                          takePhoto();
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="camera" size={22} color="#fff" />
                        <Text style={styles.mediaActionBtnText}>Upload Photo</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.mediaActionBtn, { backgroundColor: Colors.warning }]}
                        onPress={() => {
                          setMediaBottomSheet({ visible: false, target: 'after' });
                          recordVideo();
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="videocam" size={22} color="#fff" />
                        <Text style={styles.mediaActionBtnText}>Upload Video</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Already Uploaded After Media */}
                  {booking.afterMedia && booking.afterMedia.length > 0 && (
                    <View style={styles.uploadedMediaSection}>
                      <Text style={styles.uploadedMediaLabel}>✓ Uploaded</Text>
                      <View style={styles.mediaGrid}>
                        {booking.afterMedia.map((media, index) => (
                          <TouchableOpacity key={`uploaded-after-${index}`} style={styles.mediaGridItem} onPress={() => setFullImageUri(media.dataUrl)} activeOpacity={0.8}>
                            <Image source={{ uri: media.dataUrl }} style={styles.mediaThumbnail} />
                            <View style={styles.uploadedBadge}>
                              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                            </View>
                            <Text style={styles.mediaType}>{media.type === 'video' ? '🎥' : '📷'}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* After Media Preview Grid - Pending Upload */}
                  {afterMedia.length > 0 && (
                    <View style={styles.mediaGrid}>
                      {afterMedia.map((media, index) => (
                        <View key={index} style={styles.mediaGridItem}>
                          <Image source={{ uri: media.dataUrl }} style={styles.mediaThumbnail} />
                          <TouchableOpacity
                            style={styles.removeMediaBtn}
                            onPress={() => removeMediaFromTarget('after', index)}
                          >
                            <Ionicons name="close-circle" size={20} color={Colors.error} />
                          </TouchableOpacity>
                          <Text style={styles.mediaType}>{media.type === 'video' ? '🎥' : '📷'}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {afterMedia.length > 0 && (
                    <Button label="Submit After Media" onPress={submitAfterMedia} loading={loading} fullWidth />
                  )}
                </>
              )}
            </Card>

            {/* Collect Payment via QR - show for active jobs when there are charges */}
            {['confirmed', 'in_progress'].includes(booking.status) &&
              ((booking.paymentMethod === 'pay_later' && !booking.paidAt) ||
                (charges && charges.approved.length > 0)) && (
                <Card style={{ borderColor: Colors.primary, borderWidth: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}>
                    <Ionicons name="qr-code" size={24} color={Colors.primary} style={{ marginRight: Spacing.sm }} />
                    <Text style={styles.sectionTitle}>Receive Payment</Text>
                  </View>
                  <Text style={{ ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.md }}>
                    {(() => {
                      const approvedTotal = charges
                        ? charges.approved.reduce((sum, c) => sum + c.amount, 0)
                        : (booking.additionalChargesTotal || 0);
                      return booking.paidAt
                        ? `Collect ₹${approvedTotal} for additional charges`
                        : `Collect full amount ₹${(booking.finalTotal || booking.total) + approvedTotal}`;
                    })()}
                  </Text>
                  <Button
                    label="Show Company QR Code"
                    onPress={() => navigation.navigate('PaymentQR', { booking })}
                    icon="qr-code-outline"
                    fullWidth
                  />
                </Card>
              )}

            {/* Parts Replacement - only show after charges added */}
            {charges && (charges.pending.length > 0 || charges.approved.length > 0) && (
              <Card>
                <Text style={styles.sectionTitle}>Parts Replaced</Text>
                {parts.length > 0 && (
                  <>
                    {parts.map((part) => (
                      <View key={part.id} style={styles.partCard}>
                        <View style={styles.partHeader}>
                          <Text style={styles.partTitle}>{part.oldPartName} → {part.newPartName}</Text>
                          <View style={styles.partActions}>
                            <TouchableOpacity onPress={() => editPart(part.id)} style={{ marginRight: 8 }}>
                              <Ionicons name="create-outline" size={20} color={Colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => deletePart(part.id)}>
                              <Ionicons name="trash-outline" size={20} color={Colors.error} />
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={styles.partMediaRow}>
                          <Text style={styles.partMediaLabel}>Old: {part.oldPartMedia.length} media</Text>
                          <Text style={styles.partMediaLabel}>New: {part.newPartMedia.length} media</Text>
                        </View>
                      </View>
                    ))}
                  </>
                )}
                <Button
                  label="➕ Add Part"
                  onPress={openAddPartModal}
                  variant="outline"
                  size="sm"
                  style={{ marginTop: parts.length > 0 ? Spacing.md : 0 }}
                />
              </Card>
            )}

            {/* Complete Job - Only show after charges added */}
            {charges && (charges.pending.length > 0 || charges.approved.length > 0) && (
              <Card style={styles.otpCard}>
                <Text style={styles.sectionTitle}>Complete Job</Text>
                <Text style={styles.otpHint}>Mark this job as completed when service is finished</Text>

                {/* Payment method selection for pay_later bookings */}
                {booking.paymentMethod === 'pay_later' && (
                  <View style={styles.paymentMethodSection}>
                    <Text style={styles.paymentMethodLabel}>How did customer pay?</Text>
                    <View style={styles.paymentMethodOptions}>
                      <TouchableOpacity
                        style={[
                          styles.paymentMethodOption,
                          paymentMethod === 'cash' && styles.paymentMethodOptionActive
                        ]}
                        onPress={() => setPaymentMethod('cash')}
                        activeOpacity={0.7}
                      >
                        <View style={[
                          styles.paymentMethodRadio,
                          paymentMethod === 'cash' && styles.paymentMethodRadioActive
                        ]}>
                          {paymentMethod === 'cash' && <View style={styles.paymentMethodRadioDot} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.paymentMethodText}>Cash</Text>
                          <Text style={styles.paymentMethodSubtext}>I received ₹{booking.finalTotal || booking.total}</Text>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.paymentMethodOption,
                          paymentMethod === 'online' && styles.paymentMethodOptionActive
                        ]}
                        onPress={() => setPaymentMethod('online')}
                        activeOpacity={0.7}
                      >
                        <View style={[
                          styles.paymentMethodRadio,
                          paymentMethod === 'online' && styles.paymentMethodRadioActive
                        ]}>
                          {paymentMethod === 'online' && <View style={styles.paymentMethodRadioDot} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.paymentMethodText}>Online Payment</Text>
                          <Text style={styles.paymentMethodSubtext}>Process via app</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Show Payment QR button for pay_later bookings with online payment */}
                {booking.paymentMethod === 'pay_later' && paymentMethod === 'online' && (
                  <Button
                    label="Show Payment QR Code"
                    onPress={() => navigation.navigate('PaymentQR', { booking })}
                    icon="qr-code-outline"
                    variant="secondary"
                    fullWidth
                    style={{ marginTop: Spacing.md }}
                  />
                )}

                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <Button
                  label="Mark Job Completed"
                  onPress={() => handleStatusChange('completed')}
                  loading={loading}
                  fullWidth
                  icon="checkmark-circle"
                  style={{ marginTop: Spacing.md }}
                />
              </Card>
            )}
          </>
        )}

        {/* Completed */}
        {isCompleted && (
          <Card style={{ borderLeftWidth: 3, borderLeftColor: Colors.success }}>
            <View style={styles.completedRow}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
              <Text style={styles.completedText}>Job Completed</Text>
            </View>
            {booking.warrantyExpiresAt && (
              <View style={styles.warrantyRow}>
                <Ionicons name="shield-checkmark-outline" size={16} color={Colors.primary} />
                <Text style={styles.warrantyText}>
                  {booking.warrantyClaimed
                    ? 'Warranty Claimed'
                    : `Warranty till ${formatDateOnly(booking.warrantyExpiresAt)}`}
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Cancelled */}
        {isCancelled && (
          <Card style={{ borderLeftWidth: 3, borderLeftColor: Colors.error }}>
            <View style={styles.completedRow}>
              <Ionicons name="close-circle" size={24} color={Colors.error} />
              <Text style={[styles.completedText, { color: Colors.error }]}>Job Cancelled</Text>
            </View>
          </Card>
        )}

        {/* Payment Summary */}
        <Card style={styles.paymentSummaryCard}>
          <Text style={styles.sectionTitle}>Job Summary</Text>

          {(() => {
            // Use local charges state for real-time approved total, fallback to booking field
            const approvedChargesTotal = charges
              ? charges.approved.reduce((sum, c) => sum + c.amount, 0)
              : (booking.additionalChargesTotal || 0);
            const baseCharge = booking.total;
            const subtotal = baseCharge + approvedChargesTotal;

            return (
              <View style={styles.paymentBox}>
                <View style={styles.payRow}>
                  <Text style={styles.payLabel}>Base Charge</Text>
                  <Text style={styles.payValue}>{formatCurrency(baseCharge)}</Text>
                </View>

                {approvedChargesTotal > 0 && (
                  <View style={styles.payRow}>
                    <Text style={styles.payLabel}>Approved Extra Charges</Text>
                    <Text style={[styles.payValue, { color: Colors.success }]}>
                      +{formatCurrency(approvedChargesTotal)}
                    </Text>
                  </View>
                )}

                <View style={styles.payDivider} />

                <View style={styles.payRow}>
                  <Text style={styles.payLabel}>Subtotal</Text>
                  <Text style={styles.payValue}>{formatCurrency(subtotal)}</Text>
                </View>

                <View style={styles.payDivider} />

                <View style={[styles.payRow, styles.payTotal]}>
                  <Text style={styles.payTotalLabel}>Total</Text>
                  <Text style={styles.payTotalValue}>{formatCurrency(booking.finalTotal || subtotal)}</Text>
                </View>
              </View>
            );
          })()}
          {isCompleted && booking.creditDeducted && (
            <View style={styles.payRow}>
              <Text style={styles.payLabel}>Platform Fee (Prepaid)</Text>
              <Text style={[styles.payValue, { color: Colors.error }]}>
                -{formatCurrency(booking.creditDeducted)}
              </Text>
            </View>
          )}
          <View style={styles.payMethodRow}>
            <Text style={styles.payLabel}>Payment</Text>
            <Text style={styles.payValue}>
              {booking.paymentMethod === 'pay_later' ? 'Cash / Pay Later' : 'Paid Online'}
            </Text>
          </View>
        </Card>
      </ScrollView>

      {/* Add Charge Modal */}
      <Modal visible={addChargeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Add Parts & Materials</Text>
              {newCharges.map((c, i) => (
                <View key={i} style={styles.chargeItem}>
                  <View style={styles.chargeItemHeader}>
                    <Text style={styles.fieldLabel}>Charge #{i + 1}</Text>
                    {newCharges.length > 1 && (
                      <TouchableOpacity
                        onPress={() => setNewCharges((prev) => prev.filter((_, idx) => idx !== i))}
                        style={styles.removeChargeBtn}
                      >
                        <Ionicons name="trash-outline" size={18} color={Colors.error} />
                        <Text style={styles.removeChargeText}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.fieldLabel}>Part/Material Description</Text>
                  <TextInput
                    style={styles.otpInput}
                    placeholder="e.g. Replaced water pump"
                    value={c.description}
                    onChangeText={(v) => setNewCharges((prev) => prev.map((x, idx) => idx === i ? { ...x, description: v } : x))}
                    placeholderTextColor={Colors.textTertiary}
                  />
                  <Text style={styles.fieldLabel}>Price</Text>
                  <TextInput
                    style={styles.otpInput}
                    placeholder="Amount (₹)"
                    keyboardType="decimal-pad"
                    value={c.amount}
                    onChangeText={(v) => setNewCharges((prev) => prev.map((x, idx) => idx === i ? { ...x, amount: v } : x))}
                    placeholderTextColor={Colors.textTertiary}
                  />
                </View>
              ))}
              {newCharges.length < 5 && (
                <TouchableOpacity
                  onPress={() => setNewCharges((prev) => [...prev, { description: '', amount: '', category: 'materials' }])}
                  style={styles.addMoreBtn}
                >
                  <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                  <Text style={styles.addMoreText}>Add Part</Text>
                </TouchableOpacity>
              )}
              <View style={styles.modalActions}>
                <Button label="Cancel" onPress={() => setAddChargeModal(false)} variant="ghost" />
                <Button label="Submit" onPress={submitCharges} loading={loading} />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* View Charges Modal */}
      <Modal visible={chargesModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Charges Breakdown</Text>
            {charges && (
              <>
                {charges.pending.length > 0 && (
                  <View>
                    <Text style={styles.chargesGroup}>Pending Approval</Text>
                    {charges.pending.map((c) => (
                      <View key={c._id} style={[styles.chargeRow, { alignItems: 'center' }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.chargeName}>{c.description}</Text>
                          <Text style={styles.chargeAmt}>{formatCurrency(c.amount)}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleDeleteCharge(c._id)}
                          style={{ padding: 6 }}
                        >
                          <Ionicons name="trash-outline" size={18} color={Colors.error} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
                {charges.approved.length > 0 && (
                  <View>
                    <Text style={[styles.chargesGroup, { color: Colors.success }]}>Approved</Text>
                    {charges.approved.map((c) => (
                      <View key={c._id} style={styles.chargeRow}>
                        <Text style={styles.chargeName}>{c.description}</Text>
                        <Text style={[styles.chargeAmt, { color: Colors.success }]}>{formatCurrency(c.amount)}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <View style={[styles.chargeRow, { borderTopWidth: 1, borderTopColor: Colors.divider, marginTop: 8, paddingTop: 8 }]}>
                  <Text style={{ fontWeight: '700', color: Colors.textPrimary }}>Total</Text>
                  <Text style={{ fontWeight: '800', fontSize: 16, color: Colors.textPrimary }}>{formatCurrency(charges.total)}</Text>
                </View>
              </>
            )}
            <Button label="Close" onPress={() => setChargesModal(false)} variant="outline" fullWidth style={{ marginTop: Spacing.lg }} />
          </View>
        </View>
      </Modal>

      {/* Media Bottom Sheet - UC Style */}
      <Modal visible={mediaBottomSheet.visible} animationType="slide" transparent>
        <TouchableOpacity
          style={styles.bottomSheetOverlay}
          activeOpacity={1}
          onPress={() => setMediaBottomSheet({ ...mediaBottomSheet, visible: false })}
        >
          <View style={styles.bottomSheet}>
            <View style={styles.bottomSheetHandle} />
            <Text style={styles.bottomSheetTitle}>Add Media</Text>

            <TouchableOpacity
              style={styles.bottomSheetOption}
              onPress={() => handleMediaAction('photo')}
            >
              <Ionicons name="camera" size={24} color={Colors.primary} />
              <Text style={styles.bottomSheetOptionText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bottomSheetOption}
              onPress={() => handleMediaAction('video')}
            >
              <Ionicons name="videocam" size={24} color={Colors.primary} />
              <Text style={styles.bottomSheetOptionText}>Record Video</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bottomSheetOption}
              onPress={() => handleMediaAction('gallery')}
            >
              <Ionicons name="images" size={24} color={Colors.primary} />
              <Text style={styles.bottomSheetOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bottomSheetCancel}
              onPress={() => setMediaBottomSheet({ ...mediaBottomSheet, visible: false })}
            >
              <Text style={styles.bottomSheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add Part Modal - UC Style */}
      <Modal visible={addPartModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>{editingPartId ? 'Edit Part' : 'Add Part'}</Text>

              {/* Old Part Section */}
              <Text style={styles.partSectionTitle}>Old Part</Text>
              <TextInput
                style={styles.otpInput}
                placeholder="Part name (e.g., Old water pump)"
                value={currentPart.oldPartName}
                onChangeText={(v) => setCurrentPart(prev => ({ ...prev, oldPartName: v }))}
                placeholderTextColor={Colors.textTertiary}
              />

              {/* Separate Photo and Video Buttons for Old Part */}
              <View style={styles.mediaButtonRow}>
                <TouchableOpacity
                  style={[styles.mediaActionBtn, { backgroundColor: Colors.error }]}
                  onPress={() => {
                    setMediaBottomSheet({ visible: false, target: 'oldPart' });
                    takePhoto();
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="camera" size={20} color="#fff" />
                  <Text style={styles.mediaActionBtnText}>Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.mediaActionBtn, { backgroundColor: Colors.error }]}
                  onPress={() => {
                    setMediaBottomSheet({ visible: false, target: 'oldPart' });
                    recordVideo();
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="videocam" size={20} color="#fff" />
                  <Text style={styles.mediaActionBtnText}>Video</Text>
                </TouchableOpacity>
              </View>

              {currentPart.oldPartMedia.length > 0 && (
                <View style={styles.mediaGrid}>
                  {currentPart.oldPartMedia.map((media, index) => (
                    <View key={index} style={styles.mediaGridItem}>
                      <Image source={{ uri: media.dataUrl }} style={styles.mediaThumbnail} />
                      <TouchableOpacity
                        style={styles.removeMediaBtn}
                        onPress={() => removeMediaFromTarget('oldPart', index)}
                      >
                        <Ionicons name="close-circle" size={20} color={Colors.error} />
                      </TouchableOpacity>
                      <Text style={styles.mediaType}>{media.type === 'video' ? '🎥' : '📷'}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* New Part Section */}
              <Text style={[styles.partSectionTitle, { marginTop: Spacing.lg }]}>New Part</Text>
              <TextInput
                style={styles.otpInput}
                placeholder="Part name (e.g., New water pump)"
                value={currentPart.newPartName}
                onChangeText={(v) => setCurrentPart(prev => ({ ...prev, newPartName: v }))}
                placeholderTextColor={Colors.textTertiary}
              />

              {/* Separate Photo and Video Buttons for New Part */}
              <View style={styles.mediaButtonRow}>
                <TouchableOpacity
                  style={[styles.mediaActionBtn, { backgroundColor: Colors.success }]}
                  onPress={() => {
                    setMediaBottomSheet({ visible: false, target: 'newPart' });
                    takePhoto();
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="camera" size={20} color="#fff" />
                  <Text style={styles.mediaActionBtnText}>Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.mediaActionBtn, { backgroundColor: Colors.success }]}
                  onPress={() => {
                    setMediaBottomSheet({ visible: false, target: 'newPart' });
                    recordVideo();
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="videocam" size={20} color="#fff" />
                  <Text style={styles.mediaActionBtnText}>Video</Text>
                </TouchableOpacity>
              </View>

              {currentPart.newPartMedia.length > 0 && (
                <View style={styles.mediaGrid}>
                  {currentPart.newPartMedia.map((media, index) => (
                    <View key={index} style={styles.mediaGridItem}>
                      <Image source={{ uri: media.dataUrl }} style={styles.mediaThumbnail} />
                      <TouchableOpacity
                        style={styles.removeMediaBtn}
                        onPress={() => removeMediaFromTarget('newPart', index)}
                      >
                        <Ionicons name="close-circle" size={20} color={Colors.error} />
                      </TouchableOpacity>
                      <Text style={styles.mediaType}>{media.type === 'video' ? '🎥' : '📷'}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.modalActions}>
                <Button label="Cancel" onPress={() => setAddPartModal(false)} variant="ghost" />
                <Button label={editingPartId ? 'Update' : 'Add'} onPress={savePart} />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Face Verification Modal */}
      <FaceVerificationModal
        visible={faceVerificationModal}
        bookingId={booking.id}
        onSuccess={handleFaceVerificationSuccess}
        onCancel={() => setFaceVerificationModal(false)}
      />

      {/* Rate Customer Modal */}
      <RateCustomerModal
        visible={showRatingModal}
        bookingId={booking.id}
        customerName={booking.customerName}
        onClose={() => {
          setShowRatingModal(false);
          navigation.goBack();
        }}
        onSuccess={() => {
          Alert.alert(
            'Thank You! 🎉',
            'Your feedback helps us maintain service quality.',
            [
              {
                text: 'View My Reviews',
                onPress: () => {
                  setShowRatingModal(false);
                  navigation.goBack();
                  setTimeout(() => {
                    (navigation as any).navigate('Reviews');
                  }, 100);
                }
              },
              {
                text: 'Done',
                onPress: () => {
                  setShowRatingModal(false);
                  navigation.goBack();
                },
                style: 'cancel'
              }
            ]
          );
        }}
      />

      {/* Full-Screen Image Viewer */}
      <Modal visible={!!fullImageUri} transparent animationType="fade" onRequestClose={() => setFullImageUri(null)}>
        <View style={styles.imageViewerOverlay}>
          <TouchableOpacity style={styles.imageViewerClose} onPress={() => setFullImageUri(null)}>
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>
          {fullImageUri && (
            <Image
              source={{ uri: fullImageUri }}
              style={styles.imageViewerImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  backBtn: { padding: 4 },
  navTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  chatBtn: { padding: 4 },
  scroll: { padding: Spacing.xl, gap: Spacing.md, paddingBottom: 100 },
  headerCard: {},
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  bookingNum: { fontSize: 11, color: Colors.textTertiary, marginBottom: 2 },
  serviceName: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  infoText: { fontSize: 14, color: Colors.textSecondary, flex: 1 },
  otpCard: {},
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  otpHint: { fontSize: 12, color: Colors.textSecondary, marginBottom: Spacing.md },
  otpDisplay: {
    backgroundColor: Colors.primaryBg, borderRadius: BorderRadius.md,
    padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.md,
  },
  otpBig: { fontSize: 32, fontWeight: '800', color: Colors.primary, letterSpacing: 6 },
  otpInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: 12, fontSize: 16,
    color: Colors.textPrimary, marginBottom: Spacing.sm, backgroundColor: Colors.surface,
  },
  errorText: { fontSize: 13, color: Colors.error, marginBottom: 8 },
  mediaRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  mediaBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primaryBg, padding: Spacing.md, borderRadius: BorderRadius.md,
  },
  mediaBtnText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  mediaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  mediaGroupLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  mediaCount: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  uploadedMediaSection: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  uploadedMediaLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
    marginBottom: Spacing.sm,
  },
  uploadedBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 2,
  },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4, marginTop: 6 },
  chargesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  viewCharges: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  chargesSummary: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chargesStat: { fontSize: 13, color: Colors.textSecondary },
  chargesTotal: { fontSize: 13, fontWeight: '700', color: Colors.success },
  chargesNote: { fontSize: 11, color: Colors.textTertiary, marginBottom: Spacing.sm, fontStyle: 'italic' },
  completedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  completedText: { fontSize: 16, fontWeight: '700', color: Colors.success },
  warrantyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm },
  warrantyText: { fontSize: 13, color: Colors.primary },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  payLabel: { fontSize: 14, color: Colors.textSecondary },
  payValue: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  payTotal: { borderTopWidth: 1, borderTopColor: Colors.divider, marginTop: 4 },
  payTotalLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  payTotalValue: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  paymentSummaryCard: {
    marginBottom: Spacing.lg,
  },
  paymentBox: {
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    backgroundColor: Colors.background,
  },
  payDivider: {
    height: 1,
    backgroundColor: Colors.gray200,
    marginVertical: Spacing.sm,
  },
  payMethodRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6, marginTop: 4, borderTopWidth: 1, borderTopColor: Colors.divider },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.xl, paddingBottom: Platform.OS === 'ios' ? 100 : 80, minHeight: 300,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: Colors.gray300, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.lg },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md, marginTop: Spacing.lg },
  mediaPreview: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Spacing.sm },
  mediaThumb: { width: 60, height: 60, borderRadius: 8, backgroundColor: Colors.gray100 },
  mediaPreviewLabel: { flex: 1, fontSize: 13, color: Colors.textPrimary },
  chargeItem: { marginBottom: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  chargeItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  removeChargeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.errorBg,
  },
  removeChargeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.error,
  },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.sm },
  catChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100, borderWidth: 1, borderColor: Colors.border,
  },
  catChipActive: { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
  catText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600' },
  catTextActive: { color: Colors.primary },
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.md },
  addMoreText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  chargesGroup: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6, marginTop: Spacing.sm },
  chargeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  chargeName: { fontSize: 14, color: Colors.textPrimary, flex: 1 },
  chargeAmt: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  verificationRequired: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.successBg || '#d4edda',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  verifiedText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.success,
  },
  locationCard: {
    marginBottom: Spacing.lg,
  },
  mapImage: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
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
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  actionBtnDisabled: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionBtnTextDisabled: {
    color: Colors.textTertiary,
  },
  paymentMethodSection: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  paymentMethodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  paymentMethodOptions: {
    gap: Spacing.sm,
  },
  paymentMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.surface,
    gap: Spacing.md,
  },
  paymentMethodOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  paymentMethodRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethodRadioActive: {
    borderColor: Colors.primary,
  },
  paymentMethodRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  paymentMethodSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // UC-Style Media Upload Styles
  addMediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    backgroundColor: Colors.surface,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  addMediaText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  mediaButtonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  mediaActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  mediaActionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  mediaGridItem: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.gray100,
  },
  mediaThumbnail: {
    width: '100%',
    height: '100%',
  },
  removeMediaBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
  },
  mediaType: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    fontSize: 16,
  },

  // Bottom Sheet Styles
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.xl,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.gray200,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  bottomSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
  bottomSheetOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  bottomSheetCancel: {
    padding: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  bottomSheetCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  // Parts Replacement Styles
  partSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  partCard: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  partHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  partTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  partActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partMediaRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  partMediaLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },

  // Full-Screen Image Viewer
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 30,
    right: 20,
    zIndex: 10,
  },
  imageViewerImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
});
