/**
 * MediaReviewScreen
 * Full-screen media review before uploading.
 * Shows all pending + already-uploaded media with upload progress.
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
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, Typography } from '../../../theme/colors';
import { UploadableMedia, UploadProgress, formatFileSize, uploadMediaWithProgress } from '../../../utils/mediaUtils';
import { UploadProgressBar } from '../../../components/UploadProgressBar';
import { Button } from '../../../components/common/Button';
import { MediaItem } from '../../../types';
import { bookingApi } from '../../../api/bookingApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const MediaReviewScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const phase: 'before' | 'after' = route.params?.phase || 'before';
  const bookingId: string = route.params?.bookingId;
  const existingMedia: MediaItem[] = route.params?.existingMedia || [];
  const onUploadComplete = route.params?.onUploadComplete;

  const [pendingMedia, setPendingMedia] = useState<UploadableMedia[]>(
    route.params?.pendingMedia || []
  );
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [failedIndices, setFailedIndices] = useState<number[]>([]);
  const [fullImageUri, setFullImageUri] = useState<string | null>(null);

  const openCamera = useCallback(() => {
    navigation.navigate('Camera', {
      phase,
      existingCount: existingMedia.length + pendingMedia.length,
      onCapture: (captured: UploadableMedia[]) => {
        setPendingMedia((prev) => [...prev, ...captured]);
        setFailedIndices([]);
      },
    });
  }, [phase, existingMedia.length, pendingMedia.length]);

  const removePending = (index: number) => {
    setPendingMedia((prev) => prev.filter((_, i) => i !== index));
    setFailedIndices((prev) => prev.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i)));
  };

  const handleUpload = async () => {
    if (pendingMedia.length === 0) {
      Alert.alert('No Media', 'Open camera to capture photos first');
      return;
    }

    setUploading(true);
    setFailedIndices([]);

    const result = await uploadMediaWithProgress(
      bookingId,
      phase,
      pendingMedia,
      bookingApi.addMedia,
      (progress) => setUploadProgress(progress),
      2 // max retries
    );

    setUploading(false);

    if (result.success) {
      Alert.alert(
        'Upload Complete ✓',
        `${pendingMedia.length} ${pendingMedia.length === 1 ? 'file' : 'files'} uploaded successfully`,
        [
          {
            text: 'Continue',
            onPress: () => {
              if (onUploadComplete) onUploadComplete();
              navigation.goBack();
            },
          },
        ]
      );
    } else {
      setFailedIndices(result.failedIndices);
      Alert.alert(
        'Upload Incomplete',
        `${result.failedIndices.length} file(s) failed. You can retry them.`,
        [
          { text: 'OK' },
          {
            text: 'Retry Failed',
            onPress: () => retryFailed(result.failedIndices),
          },
        ]
      );
    }
  };

  const retryFailed = async (indices: number[]) => {
    const retryMedia = indices.map((i) => pendingMedia[i]).filter(Boolean);
    if (retryMedia.length === 0) return;

    setUploading(true);

    const result = await uploadMediaWithProgress(
      bookingId,
      phase,
      retryMedia,
      bookingApi.addMedia,
      (progress) => setUploadProgress(progress),
      2
    );

    setUploading(false);

    if (result.success) {
      setFailedIndices([]);
      Alert.alert('Retry Successful', 'All files uploaded', [
        {
          text: 'Continue',
          onPress: () => {
            if (onUploadComplete) onUploadComplete();
            navigation.goBack();
          },
        },
      ]);
    } else {
      const newFailed = result.failedIndices.map((ri) => indices[ri]);
      setFailedIndices(newFailed);
      Alert.alert('Some files still failed', 'Please check your connection and try again');
    }
  };

  const totalPendingSize = pendingMedia.reduce((sum, m) => sum + m.sizeBytes, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {phase === 'before' ? 'Before Photos' : 'After Photos'}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {/* Upload Progress */}
        <UploadProgressBar progress={uploadProgress} visible={uploading} />

        {/* Already Uploaded */}
        {existingMedia.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
              <Text style={styles.sectionTitle}>
                Uploaded ({existingMedia.length})
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {existingMedia.map((media, index) => (
                <TouchableOpacity
                  key={`uploaded-${index}`}
                  style={styles.uploadedThumb}
                  onPress={() => setFullImageUri(media.dataUrl)}
                >
                  <Image source={{ uri: media.dataUrl }} style={styles.thumbImage} />
                  <View style={styles.uploadedBadge}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Pending Upload */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name={pendingMedia.length > 0 ? 'cloud-upload-outline' : 'camera-outline'}
              size={18}
              color={pendingMedia.length > 0 ? Colors.primary : Colors.textTertiary}
            />
            <Text style={styles.sectionTitle}>
              {pendingMedia.length > 0
                ? `Ready to Upload (${pendingMedia.length} • ${formatFileSize(totalPendingSize)})`
                : 'No photos captured yet'}
            </Text>
          </View>

          {pendingMedia.length > 0 ? (
            <View style={styles.pendingGrid}>
              {pendingMedia.map((media, index) => {
                const isFailed = failedIndices.includes(index);
                return (
                  <View
                    key={index}
                    style={[styles.pendingThumb, isFailed && styles.pendingThumbFailed]}
                  >
                    <Image source={{ uri: media.uri }} style={styles.thumbImage} />
                    {!uploading && (
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => removePending(index)}
                      >
                        <Ionicons name="close-circle" size={22} color={Colors.error} />
                      </TouchableOpacity>
                    )}
                    <View style={styles.thumbOverlay}>
                      <Text style={styles.thumbType}>
                        {media.type === 'video' ? '🎥' : '📷'}
                      </Text>
                      <Text style={styles.thumbSize}>{formatFileSize(media.sizeBytes)}</Text>
                    </View>
                    {media.originalSizeBytes && media.originalSizeBytes > media.sizeBytes && (
                      <View style={styles.savedBadge}>
                        <Ionicons name="trending-down" size={10} color="#fff" />
                        <Text style={styles.savedText}>
                          {Math.round(100 - (media.sizeBytes / media.originalSizeBytes) * 100)}%
                        </Text>
                      </View>
                    )}
                    {isFailed && (
                      <View style={styles.failedOverlay}>
                        <Ionicons name="alert-circle" size={24} color="#fff" />
                        <Text style={styles.failedText}>Failed</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <TouchableOpacity style={styles.emptyCapture} onPress={openCamera}>
              <Ionicons name="camera" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyCaptureText}>Tap to open camera</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.cameraBtn} onPress={openCamera} disabled={uploading}>
          <Ionicons name="camera" size={22} color={Colors.primary} />
          <Text style={styles.cameraBtnText}>Camera</Text>
        </TouchableOpacity>

        <Button
          label={
            uploading
              ? 'Uploading...'
              : failedIndices.length > 0
                ? `Retry ${failedIndices.length} Failed`
                : `Upload ${pendingMedia.length} ${pendingMedia.length === 1 ? 'File' : 'Files'}`
          }
          icon={failedIndices.length > 0 ? 'refresh' : 'cloud-upload'}
          onPress={failedIndices.length > 0 ? () => retryFailed(failedIndices) : handleUpload}
          loading={uploading}
          disabled={pendingMedia.length === 0 || uploading}
          style={{ flex: 1 }}
          size="lg"
        />
      </View>

      {/* Full-screen viewer */}
      <Modal visible={!!fullImageUri} transparent animationType="fade" onRequestClose={() => setFullImageUri(null)}>
        <View style={styles.viewerOverlay}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setFullImageUri(null)}>
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>
          {fullImageUri && (
            <Image source={{ uri: fullImageUri }} style={styles.viewerImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
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
  body: { flex: 1 },
  bodyContent: { padding: Spacing.lg, paddingBottom: 120 },

  // Sections
  section: { marginBottom: Spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: { ...Typography.body, fontWeight: '600', color: Colors.textPrimary },

  // Uploaded thumbnails
  uploadedThumb: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginRight: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.success,
  },
  uploadedBadge: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Pending grid
  pendingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  pendingThumb: {
    width: (SCREEN_WIDTH - 48 - 16) / 3,
    height: (SCREEN_WIDTH - 48 - 16) / 3,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.gray100,
  },
  pendingThumbFailed: { borderWidth: 2, borderColor: Colors.error },
  thumbImage: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 11,
  },
  thumbOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  thumbType: { fontSize: 12 },
  thumbSize: { fontSize: 10, color: '#fff', fontWeight: '600' },
  savedBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.success,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  savedText: { fontSize: 9, fontWeight: '700', color: '#fff' },
  failedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(220,38,38,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  failedText: { fontSize: 11, fontWeight: '700', color: '#fff', marginTop: 2 },

  // Empty
  emptyCapture: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  emptyCaptureText: { ...Typography.body, color: Colors.textTertiary },

  // Bottom bar
  bottomBar: {
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
  cameraBtn: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  cameraBtnText: { ...Typography.caption, fontWeight: '600', color: Colors.primary },

  // Viewer
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerClose: { position: 'absolute', top: 60, right: 20, zIndex: 10 },
  viewerImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH },
});
