import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { proApi } from '../api/proApi';
import { Payout } from '../types';

interface PayoutState {
  items: Payout[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
}

const initialState: PayoutState = { items: [], status: 'idle' };

export const fetchPayouts = createAsyncThunk('payouts/fetch', async (_, { rejectWithValue }) => {
  try {
    const data = await proApi.fetchPayouts();
    const list = Array.isArray(data) ? data : data.payouts || data.data || [];
    return list.map((p: any) => ({ ...p, id: p._id || p.id }));
  } catch (err: any) {
    return rejectWithValue('Failed to fetch payouts');
  }
});

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
      })
      .addCase(fetchPayouts.rejected, (state) => { state.status = 'failed'; });
  },
});

export const selectPayouts = (state: any) => state.payouts;
export default payoutSlice.reducer;
