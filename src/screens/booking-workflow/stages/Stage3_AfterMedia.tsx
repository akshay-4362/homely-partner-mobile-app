/**
 * Stage 3: After Media Upload
 * Partner uploads after-service photos/videos and waits for charge approvals
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, BorderRadius, Typography } from '../../../theme/colors';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { formatCurrency } from '../../../utils/format';
import { StageComponentProps, MediaItem } from '../types';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { useAppSelector } from '../../../hooks/useAppSelector';
import {
  selectAfterMediaPending,
  addAfterMedia,
  removeAfterMedia,
  clearAfterMedia,
  setUploading,
  setUploadProgress,
} from '../../../store/booking-workflow/bookingWorkflowSlice';
import { bookingApi } from '../../../api/bookingApi';

export const Stage3_AfterMedia: React.FC<StageComponentProps> = ({
  booking,
  charges,
  onStageComplete,
  onError,
}) => {
  const dispatch = useAppDispatch();
  const pendingMedia = useAppSelector(selectAfterMediaPending);

  const [uploading, setUploadingLocal] = useState(false);
  const [localBooking, setLocalBooking] = useState(booking);
  const [localCharges, setLocalCharges] = useState(charges);

  // Sync with parent's background refreshes so Stage 3 always shows fresh data
  useEffect(() => { setLocalBooking(booking); }, [booking]);
  useEffect(() => { setLocalCharges(charges); }, [charges]);

  // Check if after media already uploaded
  const afterMediaUploaded = (localBooking.afterMedia?.length || 0) > 0;
  const hasPendingCharges = (localCharges.pending?.length || 0) > 0;
  const canContinue = afterMediaUploaded && !hasPendingCharges;

  /**
   * Reload booking data to get latest media
   */
  const reloadBooking = async () => {
    try {
      const bookingData = await bookingApi.getBookingById(booking.id);
      setLocalBooking(bookingData);
    } catch (error) {
      console.error('Failed to reload booking:', error);
    }
  };

  /**
   * Reload charges data
   */
  const reloadCharges = async () => {
    try {
      const chargesData = await bookingApi.getCharges(booking.id);
      setLocalCharges(chargesData?.data || chargesData);
    } catch (error) {
      console.error('Failed to reload charges:', error);
    }
  };

  /**
   * Request camera permissions
   */
  const requestCameraPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to take photos');
      return false;
    }
    return true;
  };

  /**
   * Take photo with camera
   */
  const takePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const mediaItem: MediaItem = {
        dataUrl: `data:image/jpeg;base64,${asset.base64}`,
        type: 'photo',
        label: 'Photo',
      };
      dispatch(addAfterMedia(mediaItem));
    }
  };

  /**
   * Record video with camera
   */
  const recordVideo = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      quality: 0.7,
      base64: true,
      videoMaxDuration: 30,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const mediaItem: MediaItem = {
        dataUrl: `data:video/mp4;base64,${asset.base64}`,
        type: 'video',
        label: 'Video',
      };
      dispatch(addAfterMedia(mediaItem));
    }
  };

  /**
   * Remove media from pending list
   */
  const handleRemoveMedia = (index: number) => {
    dispatch(removeAfterMedia(index));
  };

  /**
   * Submit after media to backend
   */
  const submitAfterMedia = async () => {
    if (pendingMedia.length === 0) {
      Alert.alert('Error', 'Please add at least one photo or video');
      return;
    }

    setUploadingLocal(true);
    dispatch(setUploading(true));
    dispatch(setUploadProgress(0));

    try {
      await bookingApi.addMedia(booking.id, 'after', pendingMedia);

      dispatch(clearAfterMedia());
      dispatch(setUploadProgress(100));

      // Reload booking to get updated media
      await reloadBooking();

      setUploadingLocal(false);
      dispatch(setUploading(false));

      Alert.alert('Success', 'After service media uploaded successfully');
    } catch (error: any) {
      setUploadingLocal(false);
      dispatch(setUploading(false));
      const errorMsg = error.response?.data?.message || error.message || 'Failed to upload media';
      Alert.alert('Upload Failed', errorMsg);
      onError(errorMsg);
    }
  };

  /**
   * View before media gallery
   */
  const viewBeforeMedia = () => {
    Alert.alert('Before Photos', `${booking.beforeMedia?.length || 0} photos uploaded`);
    // Could open a full-screen gallery modal here
  };

  /**
   * Continue to payment stage
   */
  const handleContinue = () => {
    if (!afterMediaUploaded) {
      Alert.alert('Upload Required', 'Please upload at least one after photo or video');
      return;
    }

    if (hasPendingCharges) {
      Alert.alert(
        'Charges Pending',
        'Wait for customer to approve additional parts before proceeding to payment'
      );
      return;
    }

    onStageComplete(4);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Before Media Summary (Collapsed) */}
      <TouchableOpacity
        style={styles.beforeSummaryCard}
        onPress={viewBeforeMedia}
        activeOpacity={0.7}
      >
        <View style={styles.summaryRow}>
          <View style={styles.summaryLeft}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <View>
              <Text style={styles.summaryTitle}>Before Photos ✓</Text>
              <Text style={styles.summarySubtitle}>
                {booking.beforeMedia?.length || 0} photos uploaded
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
        </View>
      </TouchableOpacity>

      {/* After Media Card */}
      <Card style={styles.card}>
        <View style={styles.mediaHeader}>
          <View>
            <Text style={styles.sectionTitle}>After Service Photos/Videos</Text>
            <Text style={styles.subtitle}>Document the completed work</Text>
          </View>
        </View>

        <View style={styles.mediaCount}>
          <Ionicons name="images" size={16} color={Colors.textSecondary} />
          <Text style={styles.countText}>
            {booking.afterMedia?.length || 0} uploaded
            {pendingMedia.length > 0 && ` • ${pendingMedia.length} pending`}
          </Text>
        </View>

        {/* Already Uploaded Media */}
        {afterMediaUploaded && (
          <View style={styles.uploadedSection}>
            <Text style={styles.uploadedLabel}>✓ Uploaded</Text>
            <View style={styles.mediaGrid}>
              {booking.afterMedia?.map((media, index) => (
                <View key={`uploaded-${index}`} style={styles.mediaThumbnail}>
                  <Image source={{ uri: media.dataUrl }} style={styles.thumbnailImage} />
                  <View style={styles.uploadedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  </View>
                  <Text style={styles.mediaType}>{media.type === 'video' ? '🎥' : '📷'}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Upload Buttons (only if not already uploaded) */}
        {!afterMediaUploaded && (
          <>
            <View style={styles.uploadButtonRow}>
              <TouchableOpacity
                style={[styles.uploadButton, { backgroundColor: Colors.success }]}
                onPress={takePhoto}
              >
                <Ionicons name="camera" size={22} color="#fff" />
                <Text style={styles.uploadButtonText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.uploadButton, { backgroundColor: Colors.warning }]}
                onPress={recordVideo}
              >
                <Ionicons name="videocam" size={22} color="#fff" />
                <Text style={styles.uploadButtonText}>Record Video</Text>
              </TouchableOpacity>
            </View>

            {/* Pending Media Grid */}
            {pendingMedia.length > 0 && (
              <View style={styles.mediaGrid}>
                {pendingMedia.map((media, index) => (
                  <View key={index} style={styles.mediaThumbnail}>
                    <Image source={{ uri: media.dataUrl }} style={styles.thumbnailImage} />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveMedia(index)}
                    >
                      <Ionicons name="close-circle" size={20} color={Colors.error} />
                    </TouchableOpacity>
                    <Text style={styles.mediaType}>{media.type === 'video' ? '🎥' : '📷'}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Submit Button */}
            {pendingMedia.length > 0 && (
              <Button
                label="Submit After Media"
                icon="cloud-upload"
                onPress={submitAfterMedia}
                loading={uploading}
                fullWidth
                style={{ marginTop: Spacing.md }}
              />
            )}
          </>
        )}
      </Card>

      {/* Charges Status Card */}
      <Card
        style={[
          styles.card,
          styles.chargesStatusCard,
          { borderLeftColor: hasPendingCharges ? Colors.warning : Colors.success },
        ]}
      >
        <Text style={styles.sectionTitle}>Additional Parts</Text>

        {charges.pending.length > 0 && (
          <View style={styles.statusRow}>
            <View style={styles.statusIcon}>
              <Ionicons name="time-outline" size={18} color={Colors.warning} />
            </View>
            <Text style={styles.statusText}>
              {charges.pending.length} pending approval
            </Text>
          </View>
        )}

        {charges.approved.length > 0 && (
          <View style={styles.statusRow}>
            <View style={styles.statusIcon}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusText}>
                {charges.approved.length} approved
              </Text>
              <Text style={styles.statusAmount}>{formatCurrency(charges.total)}</Text>
            </View>
          </View>
        )}

        {charges.pending.length === 0 && charges.approved.length === 0 && (
          <View style={styles.statusRow}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.statusText}>No additional parts</Text>
          </View>
        )}

        {hasPendingCharges && (
          <View style={styles.warningBox}>
            <Ionicons name="alert-circle-outline" size={16} color={Colors.warning} />
            <Text style={styles.warningText}>
              Wait for customer approval before proceeding to payment
            </Text>
          </View>
        )}

        <Button
          label="View Charges Breakdown"
          variant="outline"
          onPress={() => {
            Alert.alert(
              'Charges Breakdown',
              `Pending: ${charges.pending.length}\nApproved: ${charges.approved.length}\nTotal: ${formatCurrency(charges.total)}`
            );
          }}
          fullWidth
          style={{ marginTop: Spacing.md }}
        />
      </Card>

      {/* Navigation Buttons */}
      <View style={styles.continueContainer}>
        <View style={styles.navButtonRow}>
          <Button
            label="Back"
            icon="arrow-back"
            onPress={() => onStageComplete(2)}
            variant="ghost"
            style={{ flex: 1 }}
          />
          <Button
            label="Proceed to Payment"
            icon="arrow-forward"
            onPress={handleContinue}
            disabled={!canContinue}
            style={{ flex: 2 }}
            size="lg"
          />
        </View>
        {!canContinue && (
          <Text style={styles.disabledHint}>
            {!afterMediaUploaded
              ? 'Upload after photos to continue'
              : 'Waiting for customer to approve charges'}
          </Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  beforeSummaryCard: {
    backgroundColor: Colors.successBg,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.success,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },

  summaryTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  summarySubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },

  card: {
    marginBottom: Spacing.md,
  },

  mediaHeader: {
    marginBottom: Spacing.sm,
  },

  sectionTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
  },

  subtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  mediaCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },

  countText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },

  uploadedSection: {
    marginTop: Spacing.md,
  },

  uploadedLabel: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.success,
    marginBottom: Spacing.sm,
  },

  uploadButtonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },

  uploadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },

  uploadButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: '#fff',
  },

  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },

  mediaThumbnail: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.gray100,
  },

  thumbnailImage: {
    width: '100%',
    height: '100%',
  },

  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
  },

  uploadedBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 2,
  },

  mediaType: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    fontSize: 16,
  },

  chargesStatusCard: {
    borderLeftWidth: 3,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },

  statusIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },

  statusAmount: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.success,
    marginTop: 2,
  },

  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    padding: Spacing.md,
    backgroundColor: Colors.warningBg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },

  warningText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
  },

  continueContainer: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xxl,
  },

  navButtonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },

  disabledHint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
