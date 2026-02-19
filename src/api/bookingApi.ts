import client from './client';
import { MediaItem } from '../types';

export const bookingApi = {
  fetchBookings: async () => {
    const { data } = await client.get('/bookings/professional');
    return data;
  },

  updateStatus: async (bookingId: string, status: string, otp?: string) => {
    const { data } = await client.patch(`/bookings/${bookingId}/status`, { status, otp });
    return data;
  },

  getBookingById: async (bookingId: string) => {
    const { data } = await client.get(`/bookings/${bookingId}`);
    return data;
  },

  addCharge: async (
    bookingId: string,
    charge: { description: string; amount: number; category: string }
  ) => {
    const { data } = await client.post(`/bookings/${bookingId}/charges`, charge);
    return data;
  },

  addCharges: async (
    bookingId: string,
    items: Array<{ description: string; amount: number; category: string }>
  ) => {
    const { data } = await client.post(`/bookings/${bookingId}/charges/bulk`, { items });
    return data;
  },

  getCharges: async (bookingId: string) => {
    const { data } = await client.get(`/bookings/${bookingId}/charges`);
    return data;
  },

  addMedia: async (bookingId: string, phase: 'before' | 'after', media: MediaItem[]) => {
    const { data } = await client.post(`/bookings/${bookingId}/media`, { phase, media });
    return data;
  },

  getInvoice: async (bookingId: string) => {
    const { data } = await client.get(`/invoices/booking/${bookingId}`);
    return data;
  },
};
