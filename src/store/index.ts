import { configureStore, combineReducers } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import bookingReducer from './bookingSlice';
import payoutReducer from './payoutSlice';
import creditReducer from './creditSlice';
import accountingReducer from './accountingSlice';

// Combine all reducers
const rootReducer = combineReducers({
  auth: authReducer,
  bookings: bookingReducer,
  payouts: payoutReducer,
  credit: creditReducer,
  accounting: accountingReducer,
});

// Root reducer with logout handling
const resettableRootReducer = (state: any, action: any) => {
  // When logout action is dispatched, reset entire state
  if (action.type === 'auth/logout') {
    console.log('🔴 LOGOUT: Clearing all Redux state');
    state = undefined; // This resets all slices to their initial state
  }
  return rootReducer(state, action);
};

export const store = configureStore({
  reducer: resettableRootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
