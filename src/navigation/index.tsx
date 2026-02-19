import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../hooks/useAppSelector';
import { Colors } from '../theme/colors';

import { AuthScreen } from '../screens/AuthScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { BookingsScreen } from '../screens/BookingsScreen';
import { BookingDetailScreen } from '../screens/BookingDetailScreen';
import { EarningsScreen } from '../screens/EarningsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AvailabilityScreen } from '../screens/AvailabilityScreen';
import { PayoutsScreen } from '../screens/PayoutsScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { CreditsScreen } from '../screens/CreditsScreen';
import { TrainingScreen } from '../screens/TrainingScreen';
import { HelpScreen } from '../screens/HelpScreen';
import { MyHubScreen } from '../screens/MyHubScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const BookingStack = createStackNavigator();

const BookingStackNav = () => (
  <BookingStack.Navigator screenOptions={{ headerShown: false }}>
    <BookingStack.Screen name="BookingsList" component={BookingsScreen} />
    <BookingStack.Screen name="BookingDetail" component={BookingDetailScreen} />
    <BookingStack.Screen name="Chat" component={ChatScreen} />
  </BookingStack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: Colors.primary,
      tabBarInactiveTintColor: Colors.gray400,
      tabBarStyle: {
        backgroundColor: Colors.surface,
        borderTopColor: Colors.border,
        borderTopWidth: 1,
        paddingTop: 6,
        paddingBottom: 6,
        height: 62,
      },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' as const, marginTop: 2 },
      tabBarIcon: ({ color, size, focused }) => {
        const icons: Record<string, { active: any; inactive: any }> = {
          Home: { active: 'home', inactive: 'home-outline' },
          Jobs: { active: 'briefcase', inactive: 'briefcase-outline' },
          Earnings: { active: 'wallet', inactive: 'wallet-outline' },
          Profile: { active: 'person', inactive: 'person-outline' },
        };
        const i = icons[route.name] || { active: 'ellipse', inactive: 'ellipse-outline' };
        return <Ionicons name={focused ? i.active : i.inactive} size={size} color={color} />;
      },
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Jobs" component={BookingStackNav} />
    <Tab.Screen name="Earnings" component={EarningsScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export const AppNavigator = () => {
  const { user, hydrated } = useAppSelector((s) => s.auth);
  if (!hydrated) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Availability" component={AvailabilityScreen} />
            <Stack.Screen name="Calendar" component={CalendarScreen} />
            <Stack.Screen name="Payouts" component={PayoutsScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Credits" component={CreditsScreen} />
            <Stack.Screen name="Training" component={TrainingScreen} />
            <Stack.Screen name="Help" component={HelpScreen} />
            <Stack.Screen name="MyHub" component={MyHubScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
