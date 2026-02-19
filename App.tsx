import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { store } from './src/store';
import { AppNavigator } from './src/navigation';
import { restoreSession, logout } from './src/store/authSlice';
import { setLogoutHandler } from './src/api/client';
import { useSocket } from './src/hooks/useSocket';
import { useAppSelector } from './src/hooks/useAppSelector';

const AppInner = () => {
  const dispatch = useDispatch();
  const { user } = useAppSelector((s) => s.auth);

  useEffect(() => {
    // Restore auth session on app start
    dispatch(restoreSession() as any);
    // Connect logout handler for token refresh failures
    setLogoutHandler(() => dispatch(logout()));
  }, []);

  // Initialize socket when user is logged in
  useSocket();

  return (
    <>
      <StatusBar style="dark" />
      <AppNavigator />
    </>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <AppInner />
      </Provider>
    </GestureHandlerRootView>
  );
}
