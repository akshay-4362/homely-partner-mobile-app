import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as creditApi from '../api/creditApi';

interface CreditState {
  balance: number;
  stats: creditApi.CreditStats | null;
  transactions: creditApi.CreditTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  purchaseStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  purchaseError: string | null;
}

const initialState: CreditState = {
  balance: 0,
  stats: null,
  transactions: [],
  pagination: null,
  status: 'idle',
  error: null,
  purchaseStatus: 'idle',
  purchaseError: null,
};

// Async thunks
export const fetchCreditBalance = createAsyncThunk(
  'credit/fetchBalance',
  async (_, { rejectWithValue }) => {
    try {
      const response = await creditApi.getCreditBalance();
      return response.data.balance;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch balance');
    }
  }
);

export const fetchCreditStats = createAsyncThunk(
  'credit/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await creditApi.getCreditStats();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch stats');
    }
  }
);

export const fetchCreditTransactions = createAsyncThunk(
  'credit/fetchTransactions',
  async (
    params: {
      type?: 'purchase' | 'job_deduction' | 'penalty' | 'refund';
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    } = {},
    { rejectWithValue }
  ) => {
    try {
      const response = await creditApi.getCreditTransactions(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch transactions');
    }
  }
);

export const createPurchaseIntent = createAsyncThunk(
  'credit/createPurchaseIntent',
  async (amount: number, { rejectWithValue }) => {
    try {
      const response = await creditApi.createPurchaseIntent(amount);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create purchase intent');
    }
  }
);

export const confirmPurchase = createAsyncThunk(
  'credit/confirmPurchase',
  async (
    { razorpayPaymentId, razorpayOrderId, amount }: { razorpayPaymentId: string; razorpayOrderId: string; amount: number },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const response = await creditApi.confirmPurchase(razorpayPaymentId, razorpayOrderId, amount);
      // Refresh balance and stats after successful purchase
      dispatch(fetchCreditBalance());
      dispatch(fetchCreditStats());
      dispatch(fetchCreditTransactions({}));
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to confirm purchase');
    }
  }
);

const creditSlice = createSlice({
  name: 'credit',
  initialState,
  reducers: {
    resetPurchaseStatus: (state) => {
      state.purchaseStatus = 'idle';
      state.purchaseError = null;
    },
    clearError: (state) => {
      state.error = null;
      state.purchaseError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch balance
      .addCase(fetchCreditBalance.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCreditBalance.fulfilled, (state, action: PayloadAction<number>) => {
        state.status = 'succeeded';
        state.balance = action.payload;
        state.error = null;
      })
      .addCase(fetchCreditBalance.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })

      // Fetch stats
      .addCase(fetchCreditStats.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCreditStats.fulfilled, (state, action: PayloadAction<creditApi.CreditStats>) => {
        state.status = 'succeeded';
        state.stats = action.payload;
        state.balance = action.payload.currentBalance;
        state.error = null;
      })
      .addCase(fetchCreditStats.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })

      // Fetch transactions
      .addCase(fetchCreditTransactions.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCreditTransactions.fulfilled, (state, action: PayloadAction<creditApi.CreditHistory>) => {
        state.status = 'succeeded';
        state.transactions = action.payload.transactions;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(fetchCreditTransactions.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })

      // Create purchase intent
      .addCase(createPurchaseIntent.pending, (state) => {
        state.purchaseStatus = 'loading';
      })
      .addCase(createPurchaseIntent.fulfilled, (state) => {
        state.purchaseStatus = 'succeeded';
        state.purchaseError = null;
      })
      .addCase(createPurchaseIntent.rejected, (state, action) => {
        state.purchaseStatus = 'failed';
        state.purchaseError = action.payload as string;
      })

      // Confirm purchase
      .addCase(confirmPurchase.pending, (state) => {
        state.purchaseStatus = 'loading';
      })
      .addCase(confirmPurchase.fulfilled, (state) => {
        state.purchaseStatus = 'succeeded';
        state.purchaseError = null;
      })
      .addCase(confirmPurchase.rejected, (state, action) => {
        state.purchaseStatus = 'failed';
        state.purchaseError = action.payload as string;
      });
  },
});

export const { resetPurchaseStatus, clearError } = creditSlice.actions;
export default creditSlice.reducer;
