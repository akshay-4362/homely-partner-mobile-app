import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authApi } from '../api/authApi';
import { setTokens, clearTokens, setUser, getUser, getAccessToken, getRefreshToken } from '../utils/tokenStorage';
import { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  status: 'idle' | 'loading';
  hydrated: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  status: 'idle',
  hydrated: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const data = await authApi.login(email, password);
      await setTokens(data.accessToken, data.refreshToken);
      await setUser(data.user);
      return data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (
    payload: { firstName: string; lastName: string; email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const data = await authApi.register(payload);
      await setTokens(data.accessToken, data.refreshToken);
      await setUser(data.user);
      return data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Registration failed');
    }
  }
);

export const restoreSession = createAsyncThunk('auth/restoreSession', async () => {
  const [user, accessToken, refreshToken] = await Promise.all([
    getUser(),
    getAccessToken(),
    getRefreshToken(),
  ]);
  return { user, accessToken, refreshToken };
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      clearTokens();
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'idle';
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'idle';
        state.error = action.payload as string;
      })
      .addCase(register.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(register.fulfilled, (state, action) => {
        state.status = 'idle';
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
      })
      .addCase(register.rejected, (state, action) => {
        state.status = 'idle';
        state.error = action.payload as string;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.user = action.payload.user as User | null;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.hydrated = true;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.hydrated = true;
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export const selectAuth = (state: any) => state.auth;
export default authSlice.reducer;
