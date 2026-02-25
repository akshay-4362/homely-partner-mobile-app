import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { proApi } from '../api/proApi';

/**
 * Configure how notifications are handled when app is in foreground
 */
export const configureNotificationHandler = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
};

/**
 * Request notification permissions from the user
 * @returns Permission status
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical devices');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Failed to get push notification permissions');
    return false;
  }

  return true;
};

/**
 * Get the Expo push token for this device
 * @returns Expo push token or null if failed
 */
export const getExpoPushToken = async (): Promise<string | null> => {
  try {
    if (!Device.isDevice) {
      console.warn('Must use physical device for push notifications');
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    if (!projectId) {
      console.error('Project ID not found in expo config');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    return token.data;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
};

/**
 * Register push notification token with backend
 * @param userId - User ID to associate token with
 * @returns Success status
 */
export const registerForPushNotifications = async (
  userId: string
): Promise<boolean> => {
  try {
    // Request permissions
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return false;
    }

    // Get push token
    const token = await getExpoPushToken();
    if (!token) {
      return false;
    }

    // Get device info
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    const deviceId = Constants.deviceId || undefined;

    // Register with backend
    await proApi.registerPushToken({
      token,
      platform,
      deviceId,
    });

    console.log('Push notification token registered successfully');
    return true;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return false;
  }
};

/**
 * Unregister push notification token from backend
 * @param token - Push token to unregister
 */
export const unregisterPushToken = async (token: string): Promise<void> => {
  try {
    await proApi.unregisterPushToken(token);
    console.log('Push notification token unregistered');
  } catch (error) {
    console.error('Error unregistering push token:', error);
  }
};

/**
 * Setup notification listeners for handling incoming notifications
 * @param navigation - Navigation object for navigating on notification tap
 */
export const setupNotificationListeners = (navigation: any) => {
  // Configure handler
  configureNotificationHandler();

  // Handle notification received while app is in foreground
  const foregroundSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log('Notification received in foreground:', notification);
      // You can show a custom in-app notification here if desired
    }
  );

  // Handle notification tap (user tapped notification)
  const responseSubscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;

      console.log('Notification tapped:', data);

      // Navigate to appropriate screen based on notification data
      if (data.screen) {
        if (data.params) {
          navigation.navigate(data.screen, data.params);
        } else {
          navigation.navigate(data.screen);
        }
      }
    });

  // Return cleanup function
  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
};

/**
 * Send a test notification (for testing purposes)
 */
export const sendTestNotification = async (): Promise<void> => {
  try {
    await proApi.sendTestNotification();
    console.log('Test notification sent');
  } catch (error) {
    console.error('Error sending test notification:', error);
  }
};

/**
 * Set badge count on app icon
 * @param count - Badge count (0 to clear)
 */
export const setBadgeCount = async (count: number): Promise<void> => {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error('Error setting badge count:', error);
  }
};

/**
 * Clear all notifications from notification tray
 */
export const clearAllNotifications = async (): Promise<void> => {
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch (error) {
    console.error('Error clearing notifications:', error);
  }
};
