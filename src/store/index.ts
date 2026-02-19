import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import bookingReducer from './bookingSlice';
import payoutReducer from './payoutSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    bookings: bookingReducer,
    payouts: payoutReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
