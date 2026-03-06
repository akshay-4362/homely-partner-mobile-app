/**
 * Stage 2: Before Media Upload + Additional Charges
 * Partner uploads before-service photos/videos and optionally adds charges
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
  Modal,
  TextInput,
  Platform,
  ActivityIndicator,
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
  selectBeforeMediaPending,
  addBeforeMedia,
  removeBeforeMedia,
  clearBeforeMedia,
  setUploading,
  setUploadProgress,
} from '../../../store/booking-workflow/bookingWorkflowSlice';
import { bookingApi } from '../../../api/bookingApi';
import { useSocket } from '../../../hooks/useSocket';
import { updateProBookingStatus } from '../../../store/bookingSlice';

export const Stage2_BeforeMedia: React.FC<StageComponentProps> = ({
  booking,
  charges,
  onStageComplete,
  onError,
}) => {
  const dispatch = useAppDispatch();
  const pendingMedia = useAppSelector(selectBeforeMediaPending);
  const socket = useSocket();

  const [uploading, setUploadingLocal] = useState(false);
  const [addChargeModal, setAddChargeModal] = useState(false);
  const [newCharges, setNewCharges] = useState([{ description: '', amount: '', category: 'materials' }]);
  const [localCharges, setLocalCharges] = useState(charges);
  const [loadingCharges, setLoadingCharges] = useState(false);
  const [editingCharge, setEditingCharge] = useState<any>(null);
  const [editChargeModal, setEditChargeModal] = useState(false);

  // Check if before media already uploaded
  const beforeMediaUploaded = (booking.beforeMedia?.length || 0) > 0;

  // Check if charges added
  const hasCharges = (localCharges.pending?.length || 0) > 0 || (localCharges.approved?.length || 0) > 0;
  const hasPendingCharges = (localCharges.pending?.length || 0) > 0;
  const allChargesApproved = hasCharges && !hasPendingCharges;

  // Can only continue if:
  // 1. Charges added
  // 2. ALL charges approved (no pending)
  // 3. Before media uploaded
  const canContinue = hasCharges && allChargesApproved && beforeMediaUploaded;

  /**
   * Load charges from backend
   */
  const loadCharges = async () => {
    setLoadingCharges(true);
    try {
      const data = await bookingApi.getCharges(booking.id);
      setLocalCharges(data?.data || data);
    } catch (error) {
      console.error('Failed to load charges:', error);
    }
    setLoadingCharges(false);
  };

  /**
   * Setup socket listeners and auto-polling for charge updates
   */
  useEffect(() => {
    // Load charges on mount
    loadCharges();

    // Auto-poll charges every 5 seconds if there are pending charges
    let pollInterval: NodeJS.Timeout | null = null;
    if (hasPendingCharges) {
      pollInterval = setInterval(() => {
        console.log('[Auto-Poll] Checking for charge updates...');
        loadCharges();
      }, 5000); // Poll every 5 seconds
    }

    if (socket) {
      console.log('[Socket] Setting up charge listeners for booking:', booking.id);

      // Listen for charge approvals
      const handleChargeApproved = (data: any) => {
        console.log('[Socket] Charge approved event received:', data);
        if (data.bookingId === booking.id) {
          console.log('[Socket] Charge approved for this booking');
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
        console.log('[Socket] Charge rejected event received:', data);
        if (data.bookingId === booking.id) {
          console.log('[Socket] Charge rejected for this booking');
          // Refresh charges immediately
          loadCharges();
          // Show alert to professional
          Alert.alert(
            'Charge Rejected ❌',
            `Customer rejected your ₹${data.charge?.amount} charge for ${data.charge?.description}`
          );
        }
      };

      socket.on('charge_approved', handleChargeApproved);
      socket.on('charge_rejected', handleChargeRejected);

      // Cleanup listeners on unmount
      return () => {
        if (pollInterval) clearInterval(pollInterval);
        socket.off('charge_approved', handleChargeApproved);
        socket.off('charge_rejected', handleChargeRejected);
      };
    }

    // Cleanup poll interval
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [booking.id, socket, hasPendingCharges]);

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
      dispatch(addBeforeMedia(mediaItem));
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
      videoMaxDuration: 30, // Max 30 seconds
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const mediaItem: MediaItem = {
        dataUrl: `data:video/mp4;base64,${asset.base64}`,
        type: 'video',
        label: 'Video',
      };
      dispatch(addBeforeMedia(mediaItem));
    }
  };

  /**
   * Remove media from pending list
   */
  const handleRemoveMedia = (index: number) => {
    dispatch(removeBeforeMedia(index));
  };

  /**
   * Submit before media to backend
   */
  const submitBeforeMedia = async () => {
    if (pendingMedia.length === 0) {
      Alert.alert('Error', 'Please add at least one photo or video');
      return;
    }

    setUploadingLocal(true);
    dispatch(setUploading(true));
    dispatch(setUploadProgress(0));

    try {
      // Upload media
      await bookingApi.addMedia(booking.id, 'before', pendingMedia);

      // Success
      dispatch(clearBeforeMedia());
      dispatch(setUploadProgress(100));
      setUploadingLocal(false);
      dispatch(setUploading(false));

      Alert.alert('Success', 'Before service media uploaded successfully');

      // Reload booking to get updated media
      // This will be handled by parent component refreshing data
    } catch (error: any) {
      setUploadingLocal(false);
      dispatch(setUploading(false));
      const errorMsg = error.response?.data?.message || error.message || 'Failed to upload media';
      Alert.alert('Upload Failed', errorMsg);
      onError(errorMsg);
    }
  };

  /**
   * Delete a charge
   */
  const handleDeleteCharge = (chargeId: string, description: string) => {
    Alert.alert(
      'Remove Charge',
      `Remove charge for "${description}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setLoadingCharges(true);
            try {
              await bookingApi.deleteCharge(booking.id, chargeId);
              await loadCharges();
              Alert.alert('Success', 'Charge removed successfully');
            } catch (error: any) {
              const errorMsg = error?.response?.data?.message || 'Failed to remove charge';
              Alert.alert('Error', errorMsg);
            }
            setLoadingCharges(false);
          },
        },
      ]
    );
  };

  /**
   * Open edit charge modal
   */
  const handleEditCharge = (charge: any) => {
    setEditingCharge({
      id: charge._id,
      description: charge.description,
      amount: charge.amount.toString(),
      category: charge.category || 'materials',
    });
    setEditChargeModal(true);
  };

  /**
   * Update existing charge
   */
  const updateCharge = async () => {
    if (!editingCharge.description || parseFloat(editingCharge.amount) <= 0) {
      Alert.alert('Error', 'Please provide valid description and amount');
      return;
    }

    setUploadingLocal(true);
    try {
      await bookingApi.updateCharge(booking.id, editingCharge.id, {
        description: editingCharge.description,
        amount: parseFloat(editingCharge.amount),
        category: editingCharge.category,
      });

      await loadCharges();
      Alert.alert('Success', 'Charge updated successfully');
      setEditChargeModal(false);
      setEditingCharge(null);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update charge';
      Alert.alert('Error', errorMessage);
    }
    setUploadingLocal(false);
  };

  /**
   * Submit additional charges
   */
  const submitCharges = async () => {
    const valid = newCharges.filter((c) => c.description && parseFloat(c.amount) > 0);
    if (valid.length === 0) {
      Alert.alert('Error', 'Add at least one valid charge');
      return;
    }

    setUploadingLocal(true);
    try {
      await bookingApi.addCharges(booking.id, valid.map((c) => ({
        description: c.description,
        amount: parseFloat(c.amount),
        category: c.category,
      })));

      // Reload charges to show newly added ones
      await loadCharges();

      Alert.alert('Success', 'Charges added. Customer will be notified for approval.');
      setAddChargeModal(false);
      setNewCharges([{ description: '', amount: '', category: 'materials' }]);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to add charges';
      Alert.alert('Error', errorMessage);
      onError(errorMessage);
    }
    setUploadingLocal(false);
  };

  /**
   * Cancel job if customer doesn't want to proceed
   */
  const handleCancelJob = () => {
    Alert.alert(
      'Cancel Job',
      'Customer declined the service? This will mark the job as cancelled.',
      [
        { text: 'No, Continue Working', style: 'cancel' },
        {
          text: 'Yes, Cancel Job',
          style: 'destructive',
          onPress: async () => {
            setUploadingLocal(true);
            try {
              await dispatch(updateProBookingStatus({
                bookingId: booking.id,
                status: 'cancelled',
              }));

              Alert.alert(
                'Job Cancelled',
                'The job has been cancelled. Customer will be notified.',
                [{ text: 'OK', onPress: () => onStageComplete(5) }]
              );
            } catch (error: any) {
              const errorMsg = error.response?.data?.message || 'Failed to cancel job';
              Alert.alert('Error', errorMsg);
              onError(errorMsg);
            }
            setUploadingLocal(false);
          },
        },
      ]
    );
  };

  /**
   * Continue to next stage (after media)
   */
  const handleContinue = () => {
    if (!canContinue) {
      if (!hasCharges) {
        Alert.alert('Charges Required', 'Please add additional charges first');
      } else if (hasPendingCharges) {
        Alert.alert('Approval Pending', 'Wait for customer to approve charges before proceeding');
      } else if (!beforeMediaUploaded) {
        Alert.alert('Media Required', 'Please upload at least one before photo or video');
      }
      return;
    }

    onStageComplete(3);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Additional Charges Card (First - Required) */}
      <Card style={styles.card}>
        <View style={styles.chargesHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Additional Charges (Required)</Text>
            <Text style={styles.subtitle}>Add parts/materials cost first</Text>
          </View>
          <View style={styles.chargesHeaderActions}>
            {hasPendingCharges && (
              <TouchableOpacity
                onPress={loadCharges}
                style={styles.refreshBtn}
                disabled={loadingCharges}
              >
                <Ionicons
                  name="refresh"
                  size={20}
                  color={loadingCharges ? Colors.textTertiary : Colors.primary}
                />
              </TouchableOpacity>
            )}
            {allChargesApproved && (
              <View style={styles.checkBadge}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              </View>
            )}
          </View>
        </View>

        {loadingCharges ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading charges...</Text>
          </View>
        ) : (
          <>
            <View style={styles.chargesSummary}>
              <Ionicons name="receipt-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.countText}>
                {localCharges.pending.length} pending • {localCharges.approved.length} approved
              </Text>
            </View>

            {/* Pending Charges Warning */}
            {hasPendingCharges && (
              <View style={styles.pendingChargesBox}>
                <Ionicons name="time-outline" size={18} color={Colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pendingChargesTitle}>
                    Waiting for Customer Approval
                  </Text>
                  <Text style={styles.pendingChargesText}>
                    {localCharges.pending.length} charge(s) pending approval. Customer will review and approve/reject.
                  </Text>
                  <View style={styles.autoRefreshIndicator}>
                    <Ionicons name="sync" size={12} color={Colors.textTertiary} />
                    <Text style={styles.autoRefreshText}>
                      Auto-checking every 5 seconds...
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Charges List */}
            {hasCharges && (
              <View style={styles.chargesList}>
                {localCharges.pending.map((charge, index) => (
                  <View key={`pending-${index}`} style={styles.chargeItemRow}>
                    <View style={styles.chargeItemLeft}>
                      <Ionicons name="time-outline" size={16} color={Colors.warning} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.chargeDescription}>{charge.description}</Text>
                        <Text style={styles.chargeAmount}>{formatCurrency(charge.amount)}</Text>
                      </View>
                    </View>
                    <View style={styles.chargeItemActions}>
                      <TouchableOpacity
                        onPress={() => handleEditCharge(charge)}
                        style={styles.chargeActionBtn}
                      >
                        <Ionicons name="create-outline" size={18} color={Colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteCharge(charge._id, charge.description)}
                        style={styles.chargeActionBtn}
                      >
                        <Ionicons name="trash-outline" size={18} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {localCharges.approved.map((charge, index) => (
                  <View key={`approved-${index}`} style={styles.chargeItemRow}>
                    <View style={styles.chargeItemLeft}>
                      <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.chargeDescription}>{charge.description}</Text>
                        <Text style={styles.chargeAmount}>{formatCurrency(charge.amount)}</Text>
                      </View>
                    </View>
                    <View style={styles.approvedBadge}>
                      <Text style={styles.approvedBadgeText}>Approved</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {localCharges.total > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Approved:</Text>
                <Text style={styles.totalValue}>{formatCurrency(localCharges.total)}</Text>
              </View>
            )}

            <View style={styles.infoNote}>
              <Ionicons name="information-circle-outline" size={14} color={Colors.primary} />
              <Text style={styles.infoText}>Customer must approve charges before proceeding</Text>
            </View>

            <Button
              label={hasCharges ? 'Add More Charges' : 'Add Charges'}
              icon="add-circle-outline"
              variant={hasCharges ? 'outline' : 'primary'}
              onPress={() => setAddChargeModal(true)}
              fullWidth
              style={{ marginTop: Spacing.md }}
            />
          </>
        )}
      </Card>

      {/* Before Media Card (Second - Required after charges) */}
      <Card style={styles.card}>
        <View style={styles.mediaHeader}>
          <View>
            <Text style={styles.sectionTitle}>Before Service Photos/Videos</Text>
            <Text style={styles.subtitle}>
              {hasCharges
                ? 'Document the initial condition'
                : 'Add charges first, then upload photos'}
            </Text>
          </View>
          {beforeMediaUploaded && (
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            </View>
          )}
        </View>

        <View style={styles.mediaCount}>
          <Ionicons name="images" size={16} color={Colors.textSecondary} />
          <Text style={styles.countText}>
            {booking.beforeMedia?.length || 0} uploaded
            {pendingMedia.length > 0 && ` • ${pendingMedia.length} pending`}
          </Text>
        </View>

        {/* Already Uploaded Media */}
        {beforeMediaUploaded && (
          <View style={styles.uploadedSection}>
            <Text style={styles.uploadedLabel}>✓ Uploaded</Text>
            <View style={styles.mediaGrid}>
              {booking.beforeMedia?.map((media, index) => (
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

        {/* Upload Buttons (only if not already uploaded AND charges added) */}
        {!beforeMediaUploaded && (
          <>
            {!hasCharges && (
              <View style={styles.warningBox}>
                <Ionicons name="alert-circle-outline" size={16} color={Colors.warning} />
                <Text style={styles.warningText}>
                  Add additional charges first before uploading photos
                </Text>
              </View>
            )}

            <View style={styles.uploadButtonRow}>
              <TouchableOpacity
                style={[
                  styles.uploadButton,
                  !hasCharges && styles.uploadButtonDisabled,
                ]}
                onPress={hasCharges ? takePhoto : undefined}
                disabled={!hasCharges}
              >
                <Ionicons name="camera" size={22} color={!hasCharges ? Colors.textTertiary : '#fff'} />
                <Text style={[
                  styles.uploadButtonText,
                  !hasCharges && styles.uploadButtonTextDisabled,
                ]}>
                  Take Photo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.uploadButton,
                  { backgroundColor: hasCharges ? Colors.success : Colors.surfaceAlt },
                  !hasCharges && styles.uploadButtonDisabled,
                ]}
                onPress={hasCharges ? recordVideo : undefined}
                disabled={!hasCharges}
              >
                <Ionicons name="videocam" size={22} color={!hasCharges ? Colors.textTertiary : '#fff'} />
                <Text style={[
                  styles.uploadButtonText,
                  !hasCharges && styles.uploadButtonTextDisabled,
                ]}>
                  Record Video
                </Text>
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
                label="Submit Before Media"
                icon="cloud-upload"
                onPress={submitBeforeMedia}
                loading={uploading}
                fullWidth
                style={{ marginTop: Spacing.md }}
              />
            )}
          </>
        )}
      </Card>

      {/* Navigation Buttons */}
      <View style={styles.continueContainer}>
        <View style={styles.navButtonRow}>
          <Button
            label="Back"
            icon="arrow-back"
            onPress={() => onStageComplete(1)}
            variant="ghost"
            style={{ flex: 1 }}
          />
          <Button
            label="Continue to After Photos"
            icon="arrow-forward"
            onPress={handleContinue}
            disabled={!canContinue}
            style={{ flex: 2 }}
            size="lg"
          />
        </View>
        {!canContinue && (
          <Text style={styles.disabledHint}>
            {!hasCharges
              ? '⚠️ Add additional charges first'
              : hasPendingCharges
              ? '⏳ Waiting for customer to approve charges...'
              : '📸 Upload at least 1 before photo to continue'}
          </Text>
        )}

        {/* Cancel Job Option */}
        {hasPendingCharges && (
          <View style={styles.cancelJobSection}>
            <Text style={styles.cancelJobHint}>
              If customer doesn't want to proceed with service:
            </Text>
            <Button
              label="Cancel Job (Customer Declined)"
              icon="close-circle-outline"
              variant="ghost"
              onPress={handleCancelJob}
              fullWidth
              style={{ marginTop: Spacing.sm }}
            />
          </View>
        )}
      </View>

      {/* Edit Charge Modal */}
      <Modal visible={editChargeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Edit Charge</Text>

              <Text style={styles.fieldLabel}>Part/Material Description</Text>
              <TextInput
                style={styles.chargeInput}
                placeholder="e.g. Replaced water pump"
                value={editingCharge?.description || ''}
                onChangeText={(v) => setEditingCharge({ ...editingCharge, description: v })}
                placeholderTextColor={Colors.textTertiary}
              />

              <Text style={styles.fieldLabel}>Price</Text>
              <TextInput
                style={styles.chargeInput}
                placeholder="Amount (₹)"
                keyboardType="decimal-pad"
                value={editingCharge?.amount || ''}
                onChangeText={(v) => setEditingCharge({ ...editingCharge, amount: v })}
                placeholderTextColor={Colors.textTertiary}
              />

              <View style={styles.modalActions}>
                <Button
                  label="Cancel"
                  onPress={() => {
                    setEditChargeModal(false);
                    setEditingCharge(null);
                  }}
                  variant="ghost"
                />
                <Button label="Update" onPress={updateCharge} loading={uploading} />
              </View>
            </View>
          </ScrollView>
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
                    style={styles.chargeInput}
                    placeholder="e.g. Replaced water pump"
                    value={c.description}
                    onChangeText={(v) => setNewCharges((prev) => prev.map((x, idx) => idx === i ? { ...x, description: v } : x))}
                    placeholderTextColor={Colors.textTertiary}
                  />
                  <Text style={styles.fieldLabel}>Price</Text>
                  <TextInput
                    style={styles.chargeInput}
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
                <Button label="Submit" onPress={submitCharges} loading={uploading} />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
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

  mediaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },

  chargesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },

  chargesHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  refreshBtn: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primaryBg,
  },

  checkBadge: {
    marginLeft: Spacing.xs,
  },

  chargesSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.successBg,
    borderRadius: BorderRadius.md,
  },

  totalLabel: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  totalValue: {
    ...Typography.h4,
    color: Colors.success,
  },

  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.sm,
  },

  infoText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    flex: 1,
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
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },

  uploadButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: '#fff',
  },

  uploadButtonDisabled: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  uploadButtonTextDisabled: {
    color: Colors.textTertiary,
  },

  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    padding: Spacing.md,
    backgroundColor: Colors.warningBg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },

  warningText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
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

  chargesHeader: {
    marginBottom: Spacing.sm,
  },

  chargesSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.successBg,
    borderRadius: BorderRadius.md,
  },

  totalLabel: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  totalValue: {
    ...Typography.h4,
    color: Colors.success,
  },

  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.sm,
  },

  infoText: {
    ...Typography.bodySmall,
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

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },

  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
    minHeight: 300,
  },

  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.gray300,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },

  modalTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },

  chargeItem: {
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },

  chargeItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },

  fieldLabel: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },

  chargeInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
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
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.error,
  },

  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },

  addMoreText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
  },

  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },

  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
  },

  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },

  pendingChargesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.warningBg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },

  pendingChargesTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },

  pendingChargesText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },

  autoRefreshIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },

  autoRefreshText: {
    ...Typography.bodySmall,
    fontSize: 11,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },

  chargesList: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },

  chargeItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
  },

  chargeItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },

  chargeItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginLeft: Spacing.sm,
  },

  chargeActionBtn: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background,
  },

  chargeDescription: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginBottom: 2,
  },

  chargeAmount: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  pendingBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: Colors.warningBg,
    borderRadius: BorderRadius.sm,
  },

  pendingBadgeText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.warning,
    fontSize: 11,
  },

  approvedBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: Colors.successBg,
    borderRadius: BorderRadius.sm,
  },

  approvedBadgeText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.success,
    fontSize: 11,
  },

  cancelJobSection: {
    marginTop: Spacing.xl,
    padding: Spacing.md,
    backgroundColor: Colors.errorBg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.error,
    borderStyle: 'dashed',
  },

  cancelJobHint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
