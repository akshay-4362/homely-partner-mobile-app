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
  customerPhone: b.customer?.phone || b.customerPhone,
  scheduledAt: b.scheduledAt,
  status: b.status,
  city: b.address?.city || b.addressSnapshot?.city || b.city,
  paymentMethod: b.paymentMethod,
  paymentStatus: b.payment?.status || b.paymentStatus,
  paidAt: b.payment?.paidAt || b.paidAt,
  paymentAmount: b.payment?.amount || b.paymentAmount,
  paymentIntentId: b.payment?.stripePaymentIntentId || b.paymentIntentId,
  addressLine: b.address
    ? [b.address.line1, b.address.city].filter(Boolean).join(', ')
    : b.addressSnapshot
      ? [b.addressSnapshot.line1, b.addressSnapshot.city].filter(Boolean).join(', ')
      : b.addressLine,
  addressFull: b.address
    ? [b.address.line1, b.address.line2, b.address.city, b.address.state, b.address.pincode]
      .filter(Boolean)
      .join(', ')
    : b.addressSnapshot
      ? [b.addressSnapshot.line1, b.addressSnapshot.line2, b.addressSnapshot.city, b.addressSnapshot.state, b.addressSnapshot.pincode]
        .filter(Boolean)
        .join(', ')
      : b.addressFull,
  lat: b.address?.lat || b.addressSnapshot?.lat || b.lat,
  lng: b.address?.lng || b.addressSnapshot?.lng || b.lng,
  total: b.total ?? b.pricing?.total ?? 0,
  additionalChargesTotal: b.additionalChargesTotal ?? 0,
  finalTotal: b.finalTotal ?? b.total ?? 0,
  creditDeducted: b.creditDeducted ?? b.pricing?.creditDeducted,
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
  async (_forceRefresh: boolean = false, { rejectWithValue }) => {
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
    { bookingId, status, otp, cashPayment }: { bookingId: string; status: string; otp?: string; cashPayment?: boolean },
    { rejectWithValue }
  ) => {
    try {
      await proApi.updateBookingStatus(bookingId, status, otp, cashPayment);
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
      console.log('🔴 Resetting bookings state to initial');
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProBookings.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchProBookings.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
        state.error = null;
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
