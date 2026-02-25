import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { proApi } from '../api/proApi';
import { Payout } from '../types';

interface PayoutState {
  items: Payout[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  lastFetched: number | null;
  cacheTTL: number; // 10 minutes in milliseconds
  error: string | null;
}

const initialState: PayoutState = {
  items: [],
  status: 'idle',
  lastFetched: null,
  cacheTTL: 10 * 60 * 1000, // 10 minutes
  error: null,
};

export const fetchPayouts = createAsyncThunk(
  'payouts/fetch',
  async (forceRefresh: boolean = false, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const { payouts } = state;
      const now = Date.now();

      // Skip if data is fresh and not force refresh
      if (
        !forceRefresh &&
        payouts.lastFetched &&
        now - payouts.lastFetched < payouts.cacheTTL &&
        payouts.items.length > 0
      ) {
        return payouts.items;
      }

      const data = await proApi.fetchPayouts();
      const list = Array.isArray(data) ? data : data.payouts || data.data || [];
      return list.map((p: any) => ({ ...p, id: p._id || p.id }));
    } catch (err: any) {
      return rejectWithValue('Failed to fetch payouts');
    }
  }
);

const payoutSlice = createSlice({
  name: 'payouts',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPayouts.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchPayouts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
        state.lastFetched = Date.now();
        state.error = null;
      })
      .addCase(fetchPayouts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const selectPayouts = (state: any) => state.payouts;
export default payoutSlice.reducer;
