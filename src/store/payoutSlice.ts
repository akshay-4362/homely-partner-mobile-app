import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { proApi } from '../api/proApi';
import { Payout } from '../types';

interface PayoutState {
  items: Payout[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: PayoutState = {
  items: [],
  status: 'idle',
  error: null,
};

export const fetchPayouts = createAsyncThunk(
  'payouts/fetch',
  async (_forceRefresh: boolean = false, { rejectWithValue }) => {
    try {
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
