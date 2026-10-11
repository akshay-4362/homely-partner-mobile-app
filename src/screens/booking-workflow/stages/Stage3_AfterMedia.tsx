/**
 * Stage 3: After Service Photos/Videos
 * Uses CameraScreen + MediaReviewScreen for upload.
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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, Typography } from '../../../theme/colors';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { formatCurrency } from '../../../utils/format';
import { StageComponentProps } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const Stage3_AfterMedia: React.FC<StageComponentProps> = ({
  booking,
  charges,
  onStageComplete,
  onError,
}) => {
  const navigation = useNavigation<any>();

  const [localBooking, setLocalBooking] = useState(booking);
  const [localCharges, setLocalCharges] = useState(charges);
  const [fullImageUri, setFullImageUri] = useState<string | null>(null);
  const [mediaJustUploaded, setMediaJustUploaded] = useState(false);

  useEffect(() => { setLocalBooking(booking); }, [booking]);
  useEffect(() => { setLocalCharges(charges); }, [charges]);

  const afterMediaUploaded = (localBooking.afterMedia?.length || 0) > 0 || mediaJustUploaded;
  const hasPendingCharges = (localCharges.pending?.length || 0) > 0;
  const canContinue = afterMediaUploaded && !hasPendingCharges;

  const openMediaFlow = () => {
    navigation.navigate('MediaReview', {
      phase: 'after',
      bookingId: booking.id,
      existingMedia: booking.afterMedia || [],
      pendingMedia: [],
      onUploadComplete: () => setMediaJustUploaded(true),
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Before Photos Summary */}
      <TouchableOpacity style={styles.completedCard} activeOpacity={0.7}>
        <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
        <View style={{ flex: 1 }}>
          <Text style={styles.completedTitle}>Before Photos ✓</Text>
          <Text style={styles.completedSub}>{booking.beforeMedia?.length || 0} photos uploaded</Text>
        </View>
      </TouchableOpacity>

      {/* After Media — Main Task */}
      <TouchableOpacity
        style={[styles.taskCard, afterMediaUploaded && styles.taskCardDone]}
        onPress={openMediaFlow}
        activeOpacity={0.7}
      >
        <View style={styles.taskIconWrap}>
          {afterMediaUploaded ? (
            <Ionicons name="checkmark-circle" size={28} color={Colors.success} />
          ) : (
            <View style={styles.taskIconCircle}>
              <Ionicons name="camera" size={22} color={Colors.success} />
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.taskTitle}>After Service Photos</Text>
          <Text style={styles.taskSub}>
            {afterMediaUploaded
              ? `${localBooking.afterMedia?.length || 0} photos uploaded ✓`
              : 'Tap to capture completed work photos'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
      </TouchableOpacity>

      {/* Already uploaded gallery */}
      {afterMediaUploaded && (localBooking.afterMedia?.length || 0) > 0 && (
        <Card style={styles.galleryCard}>
          <Text style={styles.galleryTitle}>Uploaded Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {localBooking.afterMedia?.map((media, index) => (
              <TouchableOpacity
                key={index}
                style={styles.galleryThumb}
                onPress={() => setFullImageUri(media.dataUrl)}
              >
                <Image source={{ uri: media.dataUrl }} style={styles.galleryImage} />
                <Text style={styles.mediaType}>{media.type === 'video' ? '🎥' : '📷'}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Card>
      )}

      {/* Charges Status */}
      <Card style={[styles.chargesCard, { borderLeftColor: hasPendingCharges ? Colors.warning : Colors.success }]}>
        <Text style={styles.sectionTitle}>Additional Parts</Text>
        {charges.pending.length > 0 && (
          <View style={styles.statusRow}>
            <Ionicons name="time-outline" size={16} color={Colors.warning} />
            <Text style={styles.statusText}>{charges.pending.length} pending approval</Text>
          </View>
        )}
        {charges.approved.length > 0 && (
          <View style={styles.statusRow}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.statusText}>{charges.approved.length} approved • {formatCurrency(charges.total)}</Text>
          </View>
        )}
        {charges.pending.length === 0 && charges.approved.length === 0 && (
          <View style={styles.statusRow}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.statusText}>No additional parts</Text>
          </View>
        )}
        {hasPendingCharges && (
          <View style={styles.warningBox}>
            <Ionicons name="alert-circle-outline" size={14} color={Colors.warning} />
            <Text style={styles.warningText}>Wait for customer approval before proceeding</Text>
          </View>
        )}
      </Card>

      {/* Navigation */}
      <View style={styles.navSection}>
        <View style={styles.navRow}>
          <Button label="Back" icon="arrow-back" onPress={() => onStageComplete(2)} variant="ghost" style={{ flex: 1 }} />
          <Button
            label="Proceed to Payment"
            icon="arrow-forward"
            onPress={() => {
              if (!afterMediaUploaded) { Alert.alert('Upload Required', 'Upload after photos first'); return; }
              if (hasPendingCharges) { Alert.alert('Charges Pending', 'Wait for customer approval'); return; }
              onStageComplete(4);
            }}
            disabled={!canContinue}
            style={{ flex: 2 }}
            size="lg"
          />
        </View>
        {!canContinue && (
          <Text style={styles.navHint}>
            {!afterMediaUploaded ? 'Upload after photos to continue' : 'Waiting for charge approval'}
          </Text>
        )}
      </View>

      {/* Full-screen viewer */}
      <Modal visible={!!fullImageUri} transparent animationType="fade" onRequestClose={() => setFullImageUri(null)}>
        <View style={styles.viewerOverlay}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setFullImageUri(null)}>
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>
          {fullImageUri && <Image source={{ uri: fullImageUri }} style={styles.viewerImage} resizeMode="contain" />}
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  completedCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md, backgroundColor: Colors.successBg,
    borderRadius: BorderRadius.md, marginBottom: Spacing.md,
    borderLeftWidth: 3, borderLeftColor: Colors.success,
  },
  completedTitle: { ...Typography.body, fontWeight: '600', color: Colors.textPrimary },
  completedSub: { ...Typography.caption, color: Colors.textSecondary },

  taskCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.lg, backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  taskCardDone: { borderColor: Colors.success, backgroundColor: Colors.successBg },
  taskIconWrap: { width: 36, alignItems: 'center' },
  taskIconCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center',
  },
  taskTitle: { ...Typography.body, fontWeight: '700', color: Colors.textPrimary },
  taskSub: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },

  galleryCard: { marginBottom: Spacing.md },
  galleryTitle: { ...Typography.body, fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.sm },
  galleryThumb: {
    width: 100, height: 100, borderRadius: BorderRadius.md,
    overflow: 'hidden', marginRight: Spacing.sm, position: 'relative',
  },
  galleryImage: { width: '100%', height: '100%' },
  mediaType: { position: 'absolute', bottom: 4, left: 4, fontSize: 14 },

  chargesCard: { borderLeftWidth: 3, marginBottom: Spacing.md },
  sectionTitle: { ...Typography.h4, color: Colors.textPrimary, marginBottom: Spacing.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs },
  statusText: { ...Typography.body, color: Colors.textPrimary },
  warningBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs,
    padding: Spacing.md, backgroundColor: Colors.warningBg,
    borderRadius: BorderRadius.md, marginTop: Spacing.md,
  },
  warningText: { ...Typography.caption, color: Colors.textSecondary, flex: 1 },

  navSection: { marginTop: Spacing.lg, marginBottom: Spacing.xxl },
  navRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm },
  navHint: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm },

  viewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  viewerClose: { position: 'absolute', top: 60, right: 20, zIndex: 10 },
  viewerImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH },
});
