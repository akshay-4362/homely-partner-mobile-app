import client from './client';

export const proApi = {
  fetchBookings: async () => {
    const { data } = await client.get('/bookings/professional');
    return data;
  },

  updateBookingStatus: async (bookingId: string, status: string, otp?: string) => {
    const { data } = await client.patch(`/bookings/${bookingId}/status`, { status, otp });
    return data;
  },

  fetchProfile: async () => {
    const { data } = await client.get('/professionals/me');
    return data;
  },

  listServices: async () => {
    const { data } = await client.get('/services');
    return data;
  },

  updateAvailability: async (payload: Record<string, unknown>) => {
    const { data } = await client.put('/professionals/me', payload);
    return data;
  },

  fetchPayouts: async () => {
    const { data } = await client.get('/payouts/me');
    return data;
  },
};
