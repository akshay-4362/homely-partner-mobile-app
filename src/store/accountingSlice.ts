import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { accountingApi } from '../api/accountingApi';
import { ProfessionalAccountingSummary, ProfessionalMonthlyEarning, TodayBooking } from '../types';

interface AccountingState {
  summary: ProfessionalAccountingSummary | null;
  monthlyEarnings: ProfessionalMonthlyEarning[];
  todayBookings: TodayBooking[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: AccountingState = {
  summary: null,
  monthlyEarnings: [],
  todayBookings: [],
  status: 'idle',
  error: null,
};

export const fetchAccountingSummary = createAsyncThunk(
  'accounting/fetchSummary',
  async (_forceRefresh: boolean = false, { rejectWithValue }) => {
    try {
      const response = await accountingApi.getSummary();
      return response?.data || response;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch summary');
    }
  }
);

export const fetchMonthlyEarnings = createAsyncThunk(
  'accounting/fetchMonthlyEarnings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await accountingApi.getMonthlyEarnings();
      const data = response?.data || response || [];
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch monthly earnings');
    }
  }
);

export const fetchTodayBookings = createAsyncThunk(
  'accounting/fetchTodayBookings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await accountingApi.getTodayBookings();
      const data = response?.data || response || [];
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch today bookings');
    }
  }
);

const accountingSlice = createSlice({
  name: 'accounting',
  initialState,
  reducers: {
    resetAccounting(state) {
      state.summary = null;
      state.monthlyEarnings = [];
      state.todayBookings = [];
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch summary
      .addCase(fetchAccountingSummary.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchAccountingSummary.fulfilled, (state, action: PayloadAction<ProfessionalAccountingSummary>) => {
        state.status = 'succeeded';
        state.summary = action.payload;
        state.error = null;
      })
      .addCase(fetchAccountingSummary.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })

      // Fetch monthly earnings
      .addCase(fetchMonthlyEarnings.fulfilled, (state, action: PayloadAction<ProfessionalMonthlyEarning[]>) => {
        state.monthlyEarnings = action.payload;
      })

      // Fetch today bookings
      .addCase(fetchTodayBookings.fulfilled, (state, action: PayloadAction<TodayBooking[]>) => {
        state.todayBookings = action.payload;
      });
  },
});

export const { resetAccounting } = accountingSlice.actions;
export const selectAccounting = (state: any) => state.accounting;
export default accountingSlice.reducer;
