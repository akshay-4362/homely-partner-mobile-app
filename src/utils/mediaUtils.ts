/**
 * Media Utilities
 * Image/video compression, upload with progress, retry logic
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { MediaItem } from '../types';

// ── Compression Config ──
const PHOTO_MAX_WIDTH = 1280;
const PHOTO_QUALITY = 0.7;
const VIDEO_QUALITY = 0.7; // used by ImagePicker, not post-process

export interface UploadableMedia {
  uri: string;
  type: 'photo' | 'video';
  label: string;
  /** base64 data URL for display / upload */
  dataUrl: string;
  /** file size in bytes (after compression) */
  sizeBytes: number;
  /** original file size before compression */
  originalSizeBytes?: number;
}

export interface UploadProgress {
  index: number;
  total: number;
  fileName: string;
  status: 'compressing' | 'uploading' | 'done' | 'error';
  progress: number; // 0-100
  error?: string;
}

/**
 * Compress a photo: resize to max width, reduce quality
 * Returns a base64 data URL + size info
 */
export const compressPhoto = async (
  uri: string
): Promise<{ dataUrl: string; sizeBytes: number; originalSizeBytes: number }> => {
  // Get original size
  const originalInfo = await FileSystem.getInfoAsync(uri);
  const originalSizeBytes = (originalInfo as any).size || 0;

  // Compress
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: PHOTO_MAX_WIDTH } }],
    {
      compress: PHOTO_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  );

  const dataUrl = `data:image/jpeg;base64,${result.base64}`;
  const sizeBytes = result.base64 ? Math.ceil((result.base64.length * 3) / 4) : 0;

  return { dataUrl, sizeBytes, originalSizeBytes };
};

/**
 * Process a video URI — for now just read as base64
 * (Real compression would need ffmpeg/native module)
 */
export const processVideo = async (
  uri: string,
  base64?: string | null
): Promise<{ dataUrl: string; sizeBytes: number }> => {
  if (base64) {
    const dataUrl = `data:video/mp4;base64,${base64}`;
    const sizeBytes = Math.ceil((base64.length * 3) / 4);
    return { dataUrl, sizeBytes };
  }

  // Read from file
  const b64 = await FileSystem.readAsStringAsync(uri, {
    encoding: 'base64',
  });
  const dataUrl = `data:video/mp4;base64,${b64}`;
  const sizeBytes = Math.ceil((b64.length * 3) / 4);
  return { dataUrl, sizeBytes };
};

/**
 * Format bytes to human-readable string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Upload media items one by one with progress callback
 * Includes retry logic (up to 2 retries per item)
 */
export const uploadMediaWithProgress = async (
  bookingId: string,
  phase: 'before' | 'after',
  media: UploadableMedia[],
  uploadFn: (bookingId: string, phase: 'before' | 'after', media: MediaItem[]) => Promise<any>,
  onProgress: (progress: UploadProgress) => void,
  maxRetries = 2
): Promise<{ success: boolean; failedIndices: number[] }> => {
  const failedIndices: number[] = [];

  for (let i = 0; i < media.length; i++) {
    const item = media[i];
    let attempts = 0;
    let uploaded = false;

    while (attempts <= maxRetries && !uploaded) {
      try {
        onProgress({
          index: i,
          total: media.length,
          fileName: item.label,
          status: attempts > 0 ? 'uploading' : 'uploading',
          progress: Math.round(((i) / media.length) * 100),
        });

        // Upload single item
        await uploadFn(bookingId, phase, [
          { dataUrl: item.dataUrl, type: item.type, label: item.label },
        ]);

        uploaded = true;
        onProgress({
          index: i,
          total: media.length,
          fileName: item.label,
          status: 'done',
          progress: Math.round(((i + 1) / media.length) * 100),
        });
      } catch (error: any) {
        attempts++;
        if (attempts > maxRetries) {
          failedIndices.push(i);
          onProgress({
            index: i,
            total: media.length,
            fileName: item.label,
            status: 'error',
            progress: Math.round(((i + 1) / media.length) * 100),
            error: error.message || 'Upload failed',
          });
        }
      }
    }
  }

  return {
    success: failedIndices.length === 0,
    failedIndices,
  };
};
