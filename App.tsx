import 'react-native-gesture-handler';
// notificationService must be imported first so setNotificationHandler runs
// at module level before any component mounts.
import './src/services/notificationService';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus, Platform, KeyboardAvoidingView } from 'react-native';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { store } from './src/store';
import { AppNavigator } from './src/navigation';
import { restoreSession, logout } from './src/store/authSlice';
import { setLogoutHandler } from './src/api/client';
import { useSocket } from './src/hooks/useSocket';
import { useAppSelector } from './src/hooks/useAppSelector';
import { useAppDispatch } from './src/hooks/useAppDispatch';
import {
  registerForPushNotifications,
  setupNotificationListeners,
  setForegroundBookingHandler,
} from './src/services/notificationService';
import { fetchProBookings } from './src/store/bookingSlice';
import { fetchTodayBookings } from './src/store/accountingSlice';
import { NewBookingAlert, BookingAlertData } from './src/components/NewBookingAlert';

const AppInner = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const [navReady, setNavReady] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState<BookingAlertData | null>(null);

  const showAlert = useCallback((title: string, message: string, bookingId?: string) => {
    setAlertData({ title, message, bookingId });
    setAlertVisible(true);
  }, []);

  const navigateToBooking = useCallback((bookingId: string) => {
    (navigationRef.current as any)?.navigate('Jobs', {
      screen: 'BookingDetail',
      params: { bookingId },
    });
  }, []);

  useEffect(() => {
    dispatch(restoreSession() as any);
    setLogoutHandler(() => dispatch(logout()));
  }, []);

  // Register for push notifications when user logs in
  useEffect(() => {
    if (user?.id) {
      registerForPushNotifications(user.id).catch(console.error);
    }
  }, [user?.id]);

  // Setup notification listeners — wait until navigation container is ready
  useEffect(() => {
    if (!navReady) return;

    setForegroundBookingHandler(showAlert);

    const cleanup = setupNotificationListeners(navigationRef.current);

    // Handle the case where the app was KILLED and user tapped a notification.
    // getLastNotificationResponseAsync returns the tap that launched the app.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data as any;
      if (data?.screen) {
        // Small delay to let navigation finish mounting
        setTimeout(() => {
          if (data.params) {
            navigationRef.current?.navigate(data.screen, data.params);
          } else {
            navigationRef.current?.navigate(data.screen);
          }
        }, 500);
      }
    });

    return cleanup;
  }, [navReady, showAlert]);

  // Refresh jobs when app comes back to foreground from background
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        // App returned to foreground — refresh jobs silently
        dispatch(fetchProBookings(true));
        dispatch(fetchTodayBookings());
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [dispatch]);

  // Initialize socket when user is logged in
  useSocket();

  return (
    <>
      <StatusBar style="dark" />
      <AppNavigator
        navigationRef={navigationRef}
        onReady={() => setNavReady(true)}
      />
      <NewBookingAlert
        visible={alertVisible}
        data={alertData}
        onViewBooking={(bookingId) => {
          setAlertVisible(false);
          setAlertData(null);
          navigateToBooking(bookingId);
        }}
        onDismiss={() => {
          setAlertVisible(false);
          setAlertData(null);
        }}
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
