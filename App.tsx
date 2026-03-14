import 'react-native-gesture-handler';
import React, { useEffect, useRef, useState } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
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
  setForegroundBookingHandler,
} from './src/services/notificationService';
import { NewBookingAlert, BookingAlertData } from './src/components/NewBookingAlert';

const AppInner = () => {
  const dispatch = useDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState<BookingAlertData | null>(null);

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

  // Setup notification listeners + foreground booking alert handler
  useEffect(() => {
    // Register foreground booking alert handler BEFORE setting up listeners
    setForegroundBookingHandler((title, message, bookingId) => {
      setAlertData({ title, message, bookingId });
      setAlertVisible(true);
    });

    if (!navigationRef.current) return;
    const cleanup = setupNotificationListeners(navigationRef.current);
    return cleanup;
  }, []);

  // Initialize socket when user is logged in
  useSocket();

  const handleViewBooking = (bookingId: string) => {
    setAlertVisible(false);
    setAlertData(null);
    navigationRef.current?.navigate('Jobs', {
      screen: 'BookingDetail',
      params: { bookingId },
    });
  };

  const handleDismiss = () => {
    setAlertVisible(false);
    setAlertData(null);
  };

  return (
    <>
      <StatusBar style="dark" />
      <AppNavigator navigationRef={navigationRef} />
      <NewBookingAlert
        visible={alertVisible}
        data={alertData}
        onViewBooking={handleViewBooking}
        onDismiss={handleDismiss}
      />
    </>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          enabled={Platform.OS === 'ios'}
        >
          <Provider store={store}>
            <AppInner />
          </Provider>
        </KeyboardAvoidingView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
