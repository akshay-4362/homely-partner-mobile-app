import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { StripeProvider } from '@stripe/stripe-react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import { store } from './src/store';
import { AppNavigator } from './src/navigation';
import { restoreSession, logout } from './src/store/authSlice';
import { setLogoutHandler } from './src/api/client';
import { useSocket } from './src/hooks/useSocket';
import { useAppSelector } from './src/hooks/useAppSelector';
import {
  registerForPushNotifications,
  setupNotificationListeners,
} from './src/services/notificationService';

// Stripe publishable key - Replace with your actual key
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_YOUR_KEY_HERE';

const AppInner = () => {
  const dispatch = useDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  useEffect(() => {
    // Restore auth session on app start
    dispatch(restoreSession() as any);
    // Connect logout handler for token refresh failures
    setLogoutHandler(() => dispatch(logout()));
  }, []);

  // Register for push notifications when user logs in
  useEffect(() => {
    if (user?._id) {
      registerForPushNotifications(user._id).catch((error) => {
        console.error('Failed to register for push notifications:', error);
      });
    }
  }, [user?._id]);

  // Setup notification listeners
  useEffect(() => {
    if (!navigationRef.current) return;

    const cleanup = setupNotificationListeners(navigationRef.current);

    return cleanup;
  }, []);

  // Initialize socket when user is logged in
  useSocket();

  return (
    <>
      <StatusBar style="dark" />
      <AppNavigator navigationRef={navigationRef} />
    </>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
          <AppInner />
        </StripeProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
