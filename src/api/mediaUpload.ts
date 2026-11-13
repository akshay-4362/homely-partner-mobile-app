/**
 * Job media upload helper.
 *
 * The API runs on Vercel serverless functions, which reject request bodies above ~4.5MB.
 * Videos (and any unusually large photo) are therefore uploaded straight to Cloudinary
 * with a short-lived signature from the API, and only the resulting URL is sent to
 * POST /bookings/:id/media. Small photos keep the simple base64 path.
 */
import * as FileSystem from 'expo-file-system/legacy';
import client from './client';
import { MediaItem } from '../types';

/** Base64 payloads above this go direct to storage (keeps JSON body under the serverless cap) */
const MAX_INLINE_DATA_URL_CHARS = 3 * 1024 * 1024;
const MAX_VIDEO_BYTES = 60 * 1024 * 1024;

interface UploadSignature {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
}

const getSignature = async (bookingId: string, resourceType: 'image' | 'video'): Promise<UploadSignature> => {
  const { data } = await client.post('/upload/job-media/signature', { bookingId, resourceType });
  return data.data || data;
};

const parseCloudinaryResponse = (body: string): string => {
  let parsed: any;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error('Media storage returned an invalid response');
  }
  if (!parsed?.secure_url) {
    throw new Error(parsed?.error?.message || 'Media upload failed');
  }
  return parsed.secure_url as string;
};

/** Upload a local file (file://...) to Cloudinary and return its https URL */
export const uploadFileDirect = async (
  bookingId: string,
  fileUri: string,
  type: 'photo' | 'video'
): Promise<string> => {
  if (type === 'video') {
    const info = await FileSystem.getInfoAsync(fileUri);
    const size = (info as any).size || 0;
    if (size > MAX_VIDEO_BYTES) {
      throw new Error(`Video is too large (${Math.round(size / (1024 * 1024))}MB). Keep it under 60MB / 30 seconds.`);
    }
  }
  const sig = await getSignature(bookingId, type === 'video' ? 'video' : 'image');
  const result = await FileSystem.uploadAsync(sig.uploadUrl, fileUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    parameters: {
      api_key: sig.apiKey,
      timestamp: String(sig.timestamp),
      folder: sig.folder,
      signature: sig.signature,
    },
  });
  if (result.status < 200 || result.status >= 300) {
    let message = `Media upload failed (${result.status})`;
    try {
      message = JSON.parse(result.body)?.error?.message || message;
    } catch { /* keep default */ }
    throw new Error(message);
  }
  return parseCloudinaryResponse(result.body);
};

/** Upload a base64 data URI to Cloudinary (used when no local file is available) */
const uploadDataUrlDirect = async (bookingId: string, dataUrl: string, type: 'photo' | 'video'): Promise<string> => {
  const sig = await getSignature(bookingId, type === 'video' ? 'video' : 'image');
  const form = new FormData();
  form.append('file', dataUrl);
  form.append('api_key', sig.apiKey);
  form.append('timestamp', String(sig.timestamp));
  form.append('folder', sig.folder);
  form.append('signature', sig.signature);
  const response = await fetch(sig.uploadUrl, { method: 'POST', body: form });
  return parseCloudinaryResponse(await response.text());
};

/**
 * Make a media item safe to send to the API:
 * - already-uploaded URLs pass through
 * - videos and large files are uploaded directly and replaced by their URL
 * - small photos stay as base64 data URIs
 */
export const prepareMediaForApi = async (bookingId: string, item: MediaItem): Promise<MediaItem> => {
  const { uri, ...rest } = item;
  if (/^https?:\/\//.test(item.dataUrl)) return rest;

  const needsDirect =
    item.type === 'video' || !item.dataUrl || item.dataUrl.length > MAX_INLINE_DATA_URL_CHARS;
  if (!needsDirect) return rest;

  if (uri && uri.startsWith('file:')) {
    return { ...rest, dataUrl: await uploadFileDirect(bookingId, uri, item.type) };
  }
  if (item.dataUrl.startsWith('data:')) {
    return { ...rest, dataUrl: await uploadDataUrlDirect(bookingId, item.dataUrl, item.type) };
  }
  throw new Error('Media file is missing. Please capture it again.');
};

export const prepareMediaListForApi = (bookingId: string, items: MediaItem[]) =>
  Promise.all(items.map((item) => prepareMediaForApi(bookingId, item)));

/** Image source for a thumbnail. Cloudinary videos get a generated JPG frame. */
export const mediaThumbnailUri = (media: { dataUrl: string; type: 'photo' | 'video'; uri?: string }): string | undefined => {
  if (media.type === 'video') {
    if (/^https:\/\/res\.cloudinary\.com\/.+\/video\/upload\//.test(media.dataUrl)) {
      return media.dataUrl.replace(/\.[a-z0-9]+(\?.*)?$/i, '.jpg');
    }
    return undefined; // local video: show the placeholder icon only
  }
  return media.dataUrl || media.uri;
};
