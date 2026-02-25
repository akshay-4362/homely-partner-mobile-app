import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, FlatList, Image, Linking, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { updateProBookingStatus } from '../store/bookingSlice';
import { bookingApi } from '../api/bookingApi';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { formatCurrency, formatDate, formatDateOnly } from '../utils/format';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { ProBooking, AdditionalCharge, MediaItem } from '../types';
import { FaceVerificationModal } from '../components/FaceVerificationModal';
import { useSocket } from '../hooks/useSocket';

const CHARGE_CATEGORIES = ['materials', 'extra_work', 'transport', 'other'];

export const BookingDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const booking: ProBooking = route.params?.booking;

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [faceVerificationModal, setFaceVerificationModal] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);

  // Charges
  const [charges, setCharges] = useState<{ pending: AdditionalCharge[]; approved: AdditionalCharge[]; total: number } | null>(null);
  const [chargesModal, setChargesModal] = useState(false);
  const [addChargeModal, setAddChargeModal] = useState(false);
  const [newCharges, setNewCharges] = useState([{ description: '', amount: '', category: 'materials' }]);

  // Media
  const [mediaModal, setMediaModal] = useState(false);
  const [mediaPhase, setMediaPhase] = useState<'before' | 'after'>('before');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem[]>([]);
  const [mediaLabel, setMediaLabel] = useState('');

  // Payment method for completion (cash vs online)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('online');

  // Socket connection for real-time updates
  const socket = useSocket();

  useEffect(() => {
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
    } catch {}
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
    const res = await dispatch(updateProBookingStatus({
      bookingId: booking.id,
      status: newStatus,
      otp: newStatus === 'in_progress' ? trimmedOtp : undefined,
      cashPayment: newStatus === 'completed' && paymentMethod === 'cash'
    }));
    setLoading(false);
    if (res.meta.requestStatus === 'fulfilled') {
      if (newStatus === 'completed') {
        // Show completion modal with Reviews option
        Alert.alert(
          'Job Completed! ✓',
          'Customer will be asked to rate your service.',
          [
            {
              text: 'View My Reviews',
              onPress: () => {
                navigation.goBack();
                setTimeout(() => {
                  (navigation as any).navigate('Reviews');
                }, 100);
              }
            },
            {
              text: 'Done',
              onPress: () => navigation.goBack(),
              style: 'cancel'
            }
          ]
        );
      } else {
        Alert.alert('Success', `Job updated to ${newStatus.replace('_', ' ')}`);
        navigation.goBack();
      }
    } else {
      setError((res.payload as string) || 'Failed to update status');
    }
  };

  const completeWithCash = async () => {
    setLoading(true);
    const res = await dispatch(updateProBookingStatus({
      bookingId: booking.id,
      status: 'completed',
      cashPayment: true
    }));
    setLoading(false);
    if (res.meta.requestStatus === 'fulfilled') {
      // Show completion modal with Reviews option
      Alert.alert(
        'Job Completed! ✓',
        'Cash payment received. Customer will be asked to rate your service.',
        [
          {
            text: 'View My Reviews',
            onPress: () => {
              navigation.goBack();
              setTimeout(() => {
                (navigation as any).navigate('Reviews');
              }, 100);
            }
          },
          {
            text: 'Done',
            onPress: () => navigation.goBack(),
            style: 'cancel'
          }
        ]
      );
    } else {
      setError((res.payload as string) || 'Failed to complete job');
    }
  };

  const openPhotoUpload = (phase: 'before' | 'after') => {
    setMediaPhase(phase);
    Alert.alert(
      'Add Photo',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: () => captureMedia('photo'),
        },
        {
          text: 'Choose from Gallery',
          onPress: () => pickMediaFromGallery('photo'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const openVideoUpload = (phase: 'before' | 'after') => {
    setMediaPhase(phase);
    Alert.alert(
      'Add Video',
      'Choose an option',
      [
        {
          text: 'Record Video',
          onPress: () => captureMedia('video'),
        },
        {
          text: 'Choose from Gallery',
          onPress: () => pickMediaFromGallery('video'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const captureMedia = async (type: 'photo' | 'video') => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos/videos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: type === 'video' ? ['videos'] : ['images'],
      quality: 0.7,
      base64: true,
      allowsEditing: true,
      videoMaxDuration: type === 'video' ? 30 : undefined, // 30 seconds max for videos
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const isVideo = asset.type === 'video';
      setMediaModal(true);
      setSelectedMedia((prev) => [
        ...prev,
        {
          dataUrl: `data:${isVideo ? 'video/mp4' : 'image/jpeg'};base64,${asset.base64}`,
          type: isVideo ? 'video' : 'photo',
          label: mediaLabel || (isVideo ? 'Video' : 'Photo'),
        },
      ]);
    }
  };

  const pickMediaFromGallery = async (type: 'photo' | 'video') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery permission is required to select photos/videos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'video' ? ['videos'] : ['images'],
      quality: 0.7,
      base64: true,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const isVideo = type === 'video';
      setMediaModal(true);
      setSelectedMedia((prev) => [
        ...prev,
        {
          dataUrl: `data:${isVideo ? 'video/mp4' : 'image/jpeg'};base64,${asset.base64}`,
          type: isVideo ? 'video' : 'photo',
          label: mediaLabel || (isVideo ? 'Video' : 'Photo'),
        },
      ]);
    }
  };

  const submitMedia = async () => {
    if (selectedMedia.length === 0) { Alert.alert('Add at least one photo'); return; }
    setLoading(true);
    try {
      await bookingApi.addMedia(booking.id, mediaPhase, selectedMedia);
      Alert.alert('Success', `${mediaPhase === 'before' ? 'Before' : 'After'} photos uploaded`);
      setMediaModal(false);
      setSelectedMedia([]);
    } catch {
      Alert.alert('Error', 'Failed to upload media');
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

  const openMap = () => {
    const url = booking.lat && booking.lng
      ? `https://maps.google.com/?q=${booking.lat},${booking.lng}`
      : `https://maps.google.com/?q=${encodeURIComponent(booking.addressFull || '')}`;
    Linking.openURL(url);
  };

  const openMapsApp = () => {
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
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
            <View>
              <Text style={styles.bookingNum}>#{booking.bookingNumber}</Text>
              <Text style={styles.serviceName}>{booking.serviceName}</Text>
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
          {booking.addressLine && (
            <TouchableOpacity style={styles.infoRow} onPress={openMap}>
              <Ionicons name="location-outline" size={16} color={Colors.primary} />
              <Text style={[styles.infoText, { color: Colors.primary, flex: 1 }]}>
                {booking.addressFull || booking.addressLine}
              </Text>
              <Ionicons name="open-outline" size={14} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </Card>

        {/* Location Section */}
        <Card style={styles.locationCard}>
          <Text style={styles.sectionTitle}>Job Location</Text>

          {/* Map Preview */}
          {booking.lat && booking.lng && (
            <TouchableOpacity onPress={openMapsApp} activeOpacity={0.8}>
              <Image
                source={{
                  uri: `https://maps.googleapis.com/maps/api/staticmap?center=${booking.lat},${booking.lng}&zoom=15&size=600x200&markers=color:red%7C${booking.lat},${booking.lng}&key=AIzaSyDummy_Replace_With_Real_Key`,
                }}
                style={styles.mapImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
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
              style={styles.actionBtn}
              onPress={openMapsApp}
              activeOpacity={0.7}
            >
              <Ionicons name="map" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Open in Maps</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={callCustomer}
              activeOpacity={0.7}
            >
              <Ionicons name="call" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Call Customer</Text>
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

            {/* Media Upload */}
            <Card>
              <Text style={styles.sectionTitle}>Job Media</Text>

              {/* Before Media */}
              <Text style={styles.mediaGroupLabel}>Before ({booking.beforeMedia?.length || 0})</Text>
              <View style={styles.mediaRow}>
                <TouchableOpacity
                  style={styles.mediaBtn}
                  onPress={() => openPhotoUpload('before')}
                >
                  <Ionicons name="camera" size={20} color={Colors.primary} />
                  <Text style={styles.mediaBtnText}>Upload Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.mediaBtn}
                  onPress={() => openVideoUpload('before')}
                >
                  <Ionicons name="videocam" size={20} color={Colors.primary} />
                  <Text style={styles.mediaBtnText}>Upload Video</Text>
                </TouchableOpacity>
              </View>

              {/* After Media */}
              <Text style={[styles.mediaGroupLabel, { marginTop: Spacing.md }]}>After ({booking.afterMedia?.length || 0})</Text>
              <View style={styles.mediaRow}>
                <TouchableOpacity
                  style={styles.mediaBtn}
                  onPress={() => openPhotoUpload('after')}
                >
                  <Ionicons name="camera" size={20} color={Colors.success} />
                  <Text style={[styles.mediaBtnText, { color: Colors.success }]}>Upload Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.mediaBtn}
                  onPress={() => openVideoUpload('after')}
                >
                  <Ionicons name="videocam" size={20} color={Colors.success} />
                  <Text style={[styles.mediaBtnText, { color: Colors.success }]}>Upload Video</Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* Additional Charges */}
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

          <View style={styles.paymentBox}>
            <View style={styles.payRow}>
              <Text style={styles.payLabel}>Base Charge</Text>
              <Text style={styles.payValue}>{formatCurrency(booking.total - (booking.additionalChargesTotal || 0))}</Text>
            </View>

            {booking.additionalChargesTotal > 0 && (
              <View style={styles.payRow}>
                <Text style={styles.payLabel}>Extra Charges</Text>
                <Text style={styles.payValue}>{formatCurrency(booking.additionalChargesTotal)}</Text>
              </View>
            )}

            <View style={styles.payDivider} />

            <View style={styles.payRow}>
              <Text style={styles.payLabel}>Subtotal</Text>
              <Text style={styles.payValue}>{formatCurrency(booking.total)}</Text>
            </View>

            <View style={styles.payRow}>
              <Text style={styles.payLabel}>Tax (18%)</Text>
              <Text style={styles.payValue}>{formatCurrency(Math.round(booking.total * 0.18))}</Text>
            </View>

            <View style={styles.payDivider} />

            <View style={[styles.payRow, styles.payTotal]}>
              <Text style={styles.payTotalLabel}>Total</Text>
              <Text style={styles.payTotalValue}>{formatCurrency(booking.finalTotal || booking.total)}</Text>
            </View>
          </View>
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

      {/* Media Upload Modal */}
      <Modal visible={mediaModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{mediaPhase === 'before' ? 'Before' : 'After'} Photos</Text>
            <Text style={styles.modalSubtitle}>Upload up to 3 photos/videos</Text>

            {selectedMedia.map((m, i) => (
              <View key={i} style={styles.mediaPreview}>
                <Image source={{ uri: m.dataUrl }} style={styles.mediaThumb} />
                <Text style={styles.mediaPreviewLabel}>{m.label}</Text>
                <TouchableOpacity onPress={() => setSelectedMedia((prev) => prev.filter((_, idx) => idx !== i))}>
                  <Ionicons name="close-circle" size={20} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ))}

            {selectedMedia.length < 3 && (
              <>
                <TextInput
                  style={styles.otpInput}
                  placeholder="Photo label (e.g. Kitchen sink)"
                  value={mediaLabel}
                  onChangeText={setMediaLabel}
                  placeholderTextColor={Colors.textTertiary}
                />
                <Button label="Add Photo/Video" onPress={pickMediaOptions} variant="outline" fullWidth />
              </>
            )}

            <View style={styles.modalActions}>
              <Button label="Cancel" onPress={() => { setMediaModal(false); setSelectedMedia([]); }} variant="ghost" />
              <Button label="Upload" onPress={submitMedia} loading={loading} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Charge Modal */}
      <Modal visible={addChargeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Add Parts & Materials</Text>
              {newCharges.map((c, i) => (
                <View key={i} style={styles.chargeItem}>
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
                  <View style={styles.categoryRow}>
                    {CHARGE_CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.catChip, c.category === cat && styles.catChipActive]}
                        onPress={() => setNewCharges((prev) => prev.map((x, idx) => idx === i ? { ...x, category: cat } : x))}
                      >
                        <Text style={[styles.catText, c.category === cat && styles.catTextActive]}>
                          {cat.replace('_', ' ')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
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
                      <View key={c._id} style={styles.chargeRow}>
                        <Text style={styles.chargeName}>{c.description}</Text>
                        <Text style={styles.chargeAmt}>{formatCurrency(c.amount)}</Text>
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

      {/* Face Verification Modal */}
      <FaceVerificationModal
        visible={faceVerificationModal}
        bookingId={booking.id}
        onSuccess={handleFaceVerificationSuccess}
        onCancel={() => setFaceVerificationModal(false)}
      />
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
  mediaGroupLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm },
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
    height: 180,
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
});
