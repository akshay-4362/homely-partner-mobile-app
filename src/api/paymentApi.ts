import client from './client';

export const paymentApi = {
  /**
   * Generate UPI QR Code for payment
   */
  generateUPIQR: async (bookingId: string) => {
    return client.post('/payments/generate-upi-qr', {
      bookingId,
      description: `Payment for booking`,
    });
  },

  /**
   * Get QR code status
   */
  getQRStatus: async (qrCodeId: string) => {
    return client.get(`/payments/qr/${qrCodeId}`);
  },

  /**
   * Close/expire a QR code
   */
  closeQR: async (qrCodeId: string) => {
    return client.post(`/payments/qr/${qrCodeId}/close`);
  },

  /**
   * Get payment status by payment ID
   */
  getPaymentStatus: async (paymentId: string) => {
    return client.get(`/payments/${paymentId}`);
  },

  /**
   * Get payment for a booking
   */
  getPaymentByBooking: async (bookingId: string) => {
    return client.get(`/payments/booking/${bookingId}`);
  },
};
