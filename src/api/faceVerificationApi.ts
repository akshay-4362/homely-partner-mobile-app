import client from './client';

export interface FaceVerificationResponse {
  success: boolean;
  similarity: number;
  confidence: number;
  message: string;
}

/**
 * Verify a selfie against the professional's profile picture
 * @param selfieBase64 - Base64 encoded selfie image
 * @param bookingId - ID of the booking being started
 * @returns Verification result
 */
export const verifyFace = async (
  selfieBase64: string,
  bookingId: string
): Promise<FaceVerificationResponse> => {
  const response = await client.post('/professionals/verify-face', {
    selfie: selfieBase64,
    bookingId,
  });
  return response.data.data || response.data;
};

export const faceVerificationApi = {
  verifyFace,
};
