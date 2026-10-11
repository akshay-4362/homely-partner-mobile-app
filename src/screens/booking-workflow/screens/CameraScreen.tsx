/**
 * CameraScreen
 * Full-screen camera with guidance overlay and multi-capture support.
 * Launches ImagePicker in a loop, letting the technician take multiple
 * photos/videos before returning to the media review screen.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, Typography } from '../../../theme/colors';
import { compressPhoto, processVideo, formatFileSize, UploadableMedia } from '../../../utils/mediaUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const THUMB_SIZE = (SCREEN_WIDTH - 48 - 24) / 4; // 4 per row with gaps

const GUIDANCE_TIPS: Record<string, string[]> = {
  before: [
    '📸 Capture the full appliance/area',
    '🔍 Take close-up of the problem area',
    '📐 Include any damage or wear',
    '💡 Ensure good lighting',
  ],
  after: [
    '✅ Show the completed repair',
    '📸 Same angles as before photos',
    '🔧 Include replaced parts if any',
    '✨ Highlight the fixed area',
  ],
};

export const CameraScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const phase: 'before' | 'after' = route.params?.phase || 'before';
  const existingCount: number = route.params?.existingCount || 0;
  const onCapture = route.params?.onCapture;

  const [capturedMedia, setCapturedMedia] = useState<UploadableMedia[]>([]);
  const [compressing, setCompressing] = useState(false);

  const requestCameraPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to take photos');
      return false;
    }
    return true;
  };

  const takePhoto = useCallback(async () => {
    const ok = await requestCameraPermission();
    if (!ok) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      setCompressing(true);
      try {
        const asset = result.assets[0];
        const { dataUrl, sizeBytes, originalSizeBytes } = await compressPhoto(asset.uri);
        const media: UploadableMedia = {
          uri: asset.uri,
          type: 'photo',
          label: `Photo ${existingCount + capturedMedia.length + 1}`,
          dataUrl,
          sizeBytes,
          originalSizeBytes,
        };
        setCapturedMedia((prev) => [...prev, media]);
      } catch (error) {
        Alert.alert('Error', 'Failed to process photo. Please try again.');
      }
      setCompressing(false);
    }
  }, [capturedMedia.length, existingCount]);

  const recordVideo = useCallback(async () => {
    const ok = await requestCameraPermission();
    if (!ok) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      quality: 0.7,
      videoMaxDuration: 30,
    });

    if (!result.canceled && result.assets[0]) {
      setCompressing(true);
      try {
        const asset = result.assets[0];
        const { dataUrl, sizeBytes } = await processVideo(
          asset.uri,
          (asset as any).base64
        );
        const media: UploadableMedia = {
          uri: asset.uri,
          type: 'video',
          label: `Video ${existingCount + capturedMedia.length + 1}`,
          dataUrl,
          sizeBytes,
        };
        setCapturedMedia((prev) => [...prev, media]);
      } catch (error) {
        Alert.alert('Error', 'Failed to process video. Please try again.');
      }
      setCompressing(false);
    }
  }, [capturedMedia.length, existingCount]);

  const removeMedia = (index: number) => {
    setCapturedMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDone = () => {
    if (onCapture && capturedMedia.length > 0) {
      onCapture(capturedMedia);
    }
    navigation.goBack();
  };

  const tips = GUIDANCE_TIPS[phase] || GUIDANCE_TIPS.before;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {phase === 'before' ? 'Before Photos' : 'After Photos'}
        </Text>
        <TouchableOpacity
          onPress={handleDone}
          style={[styles.doneBtn, capturedMedia.length === 0 && styles.doneBtnDisabled]}
          disabled={capturedMedia.length === 0}
        >
          <Text
            style={[
              styles.doneBtnText,
              capturedMedia.length === 0 && styles.doneBtnTextDisabled,
            ]}
          >
            Done ({capturedMedia.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {/* Guidance Tips */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb" size={18} color={Colors.warning} />
            <Text style={styles.tipsTitle}>Photo Guidelines</Text>
          </View>
          {tips.map((tip, i) => (
            <Text key={i} style={styles.tipText}>{tip}</Text>
          ))}
        </View>

        {/* Capture Buttons */}
        <View style={styles.captureRow}>
          <TouchableOpacity
            style={styles.captureBtn}
            onPress={takePhoto}
            disabled={compressing}
            activeOpacity={0.7}
          >
            <View style={styles.captureBtnInner}>
              <Ionicons name="camera" size={32} color="#fff" />
            </View>
            <Text style={styles.captureBtnLabel}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.captureBtn}
            onPress={recordVideo}
            disabled={compressing}
            activeOpacity={0.7}
          >
            <View style={[styles.captureBtnInner, { backgroundColor: Colors.success }]}>
              <Ionicons name="videocam" size={32} color="#fff" />
            </View>
            <Text style={styles.captureBtnLabel}>Record Video</Text>
            <Text style={styles.captureBtnHint}>Max 30s</Text>
          </TouchableOpacity>
        </View>

        {compressing && (
          <View style={styles.compressingBanner}>
            <Ionicons name="construct" size={16} color={Colors.warning} />
            <Text style={styles.compressingText}>Compressing image...</Text>
          </View>
        )}

        {/* Captured Media Grid */}
        {capturedMedia.length > 0 && (
          <View style={styles.capturedSection}>
            <Text style={styles.capturedTitle}>
              Captured ({capturedMedia.length})
            </Text>
            <View style={styles.mediaGrid}>
              {capturedMedia.map((media, index) => (
                <View key={index} style={styles.thumbContainer}>
                  <Image source={{ uri: media.uri }} style={styles.thumbImage} />
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeMedia(index)}
                  >
                    <Ionicons name="close-circle" size={22} color={Colors.error} />
                  </TouchableOpacity>
                  <View style={styles.thumbInfo}>
                    <Text style={styles.thumbType}>
                      {media.type === 'video' ? '🎥' : '📷'}
                    </Text>
                    <Text style={styles.thumbSize}>
                      {formatFileSize(media.sizeBytes)}
                    </Text>
                  </View>
                  {media.originalSizeBytes && media.originalSizeBytes > media.sizeBytes && (
                    <View style={styles.compressedBadge}>
                      <Text style={styles.compressedText}>
                        -{Math.round(100 - (media.sizeBytes / media.originalSizeBytes) * 100)}%
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Empty state */}
        {capturedMedia.length === 0 && !compressing && (
          <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={64} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>
              Tap the buttons above to capture photos or videos
            </Text>
            <Text style={styles.emptyHint}>
              Take at least 1 photo to continue
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom action bar */}
      {capturedMedia.length > 0 && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.addMoreBtn} onPress={takePhoto}>
            <Ionicons name="add-circle" size={20} color={Colors.primary} />
            <Text style={styles.addMoreText}>Add More</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleDone}>
            <Text style={styles.confirmBtnText}>
              Confirm {capturedMedia.length} {capturedMedia.length === 1 ? 'item' : 'items'}
            </Text>
            <Ionicons name="checkmark" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backBtn: { padding: 4 },
  headerTitle: { ...Typography.h4, color: Colors.textPrimary },
  doneBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  doneBtnDisabled: { backgroundColor: Colors.gray100 },
  doneBtnText: { ...Typography.body, fontWeight: '700', color: '#fff' },
  doneBtnTextDisabled: { color: Colors.textTertiary },
  body: { flex: 1 },
  bodyContent: { padding: Spacing.lg, paddingBottom: 120 },

  // Tips
  tipsCard: {
    backgroundColor: Colors.warningBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tipsTitle: { ...Typography.body, fontWeight: '700', color: Colors.textPrimary },
  tipText: { ...Typography.caption, color: Colors.textSecondary, marginTop: 4, paddingLeft: 26 },

  // Capture buttons
  captureRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  captureBtn: { alignItems: 'center', gap: Spacing.sm },
  captureBtnInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  captureBtnLabel: { ...Typography.body, fontWeight: '600', color: Colors.textPrimary },
  captureBtnHint: { ...Typography.caption, color: Colors.textTertiary, marginTop: -4 },

  // Compressing
  compressingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.warningBg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  compressingText: { ...Typography.body, color: Colors.textSecondary },

  // Captured media
  capturedSection: { marginTop: Spacing.sm },
  capturedTitle: { ...Typography.h4, color: Colors.textPrimary, marginBottom: Spacing.md },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  thumbContainer: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.gray100,
  },
  thumbImage: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 11,
  },
  thumbInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  thumbType: { fontSize: 12 },
  thumbSize: { fontSize: 9, color: '#fff', fontWeight: '600' },
  compressedBadge: {
    position: 'absolute',
    top: 2,
    left: 2,
    backgroundColor: Colors.success,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  compressedText: { fontSize: 9, fontWeight: '700', color: '#fff' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.md },
  emptyText: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
  emptyHint: { ...Typography.caption, color: Colors.textTertiary, textAlign: 'center' },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  addMoreText: { ...Typography.body, fontWeight: '600', color: Colors.primary },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  confirmBtnText: { ...Typography.body, fontWeight: '700', color: '#fff' },
});
