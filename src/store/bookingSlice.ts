import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { proApi } from '../api/proApi';
import { ProBooking } from '../types';

interface BookingState {
  items: ProBooking[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: BookingState = {
  items: [],
  status: 'idle',
  error: null,
};

const mapBooking = (b: any): ProBooking => ({
  id: b._id || b.id,
  bookingNumber: b.bookingNumber,
  serviceName: b.service?.name || b.serviceName || 'Service',
  customerName: b.customer
    ? `${b.customer.firstName} ${b.customer.lastName}`
    : b.customerName || 'Customer',
  scheduledAt: b.scheduledAt,
  status: b.status,
  city: b.address?.city || b.city,
  paymentMethod: b.paymentMethod,
  paymentStatus: b.payment?.status || b.paymentStatus,
  addressLine: b.address
    ? [b.address.line1, b.address.city].filter(Boolean).join(', ')
    : b.addressLine,
  addressFull: b.address
    ? [b.address.line1, b.address.line2, b.address.city, b.address.state, b.address.pincode]
        .filter(Boolean)
        .join(', ')
    : b.addressFull,
  lat: b.address?.lat || b.lat,
  lng: b.address?.lng || b.lng,
  total: b.total ?? b.pricing?.total ?? 0,
  additionalChargesTotal: b.additionalChargesTotal ?? 0,
  finalTotal: b.finalTotal ?? b.total ?? 0,
  beforeMedia: b.beforeMedia || [],
  afterMedia: b.afterMedia || [],
  warrantyExpiresAt: b.warrantyExpiresAt,
  warrantyClaimed: b.warrantyClaimed,
  warrantyClaimReason: b.warrantyClaimReason,
  startOtp: b.startOtp,
  completionOtp: b.completionOtp,
});

export const fetchProBookings = createAsyncThunk(
  'bookings/fetchPro',
  async (_, { rejectWithValue }) => {
    try {
      const data = await proApi.fetchBookings();
      const list = Array.isArray(data) ? data : data.bookings || data.data || [];
      return list.map(mapBooking);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch bookings');
    }
  }
);

export const updateProBookingStatus = createAsyncThunk(
  'bookings/updateStatus',
  async (
    { bookingId, status, otp }: { bookingId: string; status: string; otp?: string },
    { rejectWithValue }
  ) => {
    try {
      await proApi.updateBookingStatus(bookingId, status, otp);
      return { bookingId, status };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update status');
    }
  }
);

const bookingSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    resetBookings(state) {
      state.items = [];
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProBookings.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchProBookings.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchProBookings.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(updateProBookingStatus.fulfilled, (state, action) => {
        const booking = state.items.find((b) => b.id === action.payload.bookingId);
        if (booking) booking.status = action.payload.status;
      });
  },
});

export const { resetBookings } = bookingSlice.actions;
export const selectProBookings = (state: any) => state.bookings;
export default bookingSlice.reducer;
