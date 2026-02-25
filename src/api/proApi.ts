import client from './client';

export const proApi = {
  fetchBookings: async () => {
    const { data } = await client.get('/bookings/professional');
    return data.data || data;
  },

  updateBookingStatus: async (bookingId: string, status: string, otp?: string) => {
    const { data } = await client.patch(`/bookings/${bookingId}/status`, { status, otp });
    return data.data || data;
  },

  fetchProfile: async () => {
    const { data } = await client.get('/professionals/me');
    return data.data || data;
  },

  listServices: async () => {
    const { data } = await client.get('/services');
    return data.data || data;
  },

  updateAvailability: async (payload: Record<string, unknown>) => {
    const { data } = await client.put('/professionals/me', payload);
    return data.data || data;
  },

  fetchPayouts: async () => {
    const { data } = await client.get('/payouts/me');
    return data.data || data;
  },

  // Push notification token methods
  registerPushToken: async (payload: {
    token: string;
    platform: 'ios' | 'android' | 'web';
    deviceId?: string;
  }) => {
    const { data } = await client.post('/professionals/me/push-token', payload);
    return data;
  },

  unregisterPushToken: async (token: string) => {
    const { data } = await client.delete('/professionals/me/push-token', { data: { token } });
    return data;
  },

  sendTestNotification: async () => {
    const { data } = await client.post('/professionals/me/push-token/test');
    return data;
  },
};
