import React from 'react';
import { Platform, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector } from '../hooks/useAppSelector';
import { Colors } from '../theme/colors';
import { CustomDrawer } from '../components/CustomDrawer';

import { AuthScreen } from '../screens/AuthScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { BookingsScreen } from '../screens/BookingsScreen';
import { BookingDetailScreen } from '../screens/BookingDetailScreen';
import { EarningsScreen } from '../screens/EarningsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AvailabilityScreen } from '../screens/AvailabilityScreen';
import { PayoutsScreen } from '../screens/PayoutsScreen';
import { EnhancedCalendarScreen } from '../screens/EnhancedCalendarScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { CreditsScreen } from '../screens/CreditsScreen';
import { TrainingScreen } from '../screens/TrainingScreen';
import { HelpCenterScreen } from '../screens/HelpCenterScreen';
import { TicketDetailScreen } from '../screens/TicketDetailScreen';
import { MyHubScreen } from '../screens/MyHubScreen';
import { ReviewsScreen } from '../screens/ReviewsScreen';
import { TargetsScreen } from '../screens/TargetsScreen';
import { UnifiedCalendarScreen } from '../screens/UnifiedCalendarScreen';
import { PaymentQRScreen } from '../screens/PaymentQRScreen';
import { BankAccountSetupScreen } from '../screens/BankAccountSetupScreen';
import { PayoutAccountsScreen } from '../screens/PayoutAccountsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const BookingStack = createStackNavigator();
const Drawer = createDrawerNavigator();

const BookingStackNav = () => {
  return (
    <BookingStack.Navigator
      screenOptions={{ headerShown: false }}
    >
      <BookingStack.Screen name="BookingsList" component={BookingsScreen} />
      <BookingStack.Screen name="BookingDetail" component={BookingDetailScreen} />
      <BookingStack.Screen name="PaymentQR" component={PaymentQRScreen} />
      <BookingStack.Screen name="Chat" component={ChatScreen} />
    </BookingStack.Navigator>
  );
};

const MainTabs = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: route.name === 'Home',
        headerStyle: {
          backgroundColor: Colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        },
        headerTitle: 'Homelyo Professional',
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '700',
          color: Colors.textPrimary,
        },
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => navigation.openDrawer()}
            style={{ marginLeft: 16, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="menu" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        ),
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray400,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          height: 60 + Math.max(insets.bottom, 8),
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600' as const,
          marginBottom: Platform.OS === 'ios' ? 0 : 2,
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: Platform.OS === 'ios' ? 4 : 2,
        },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, { active: any; inactive: any }> = {
            Home: { active: 'home', inactive: 'home-outline' },
            Jobs: { active: 'briefcase', inactive: 'briefcase-outline' },
            Earnings: { active: 'wallet', inactive: 'wallet-outline' },
            Target: { active: 'analytics', inactive: 'analytics-outline' },
            Profile: { active: 'person', inactive: 'person-outline' },
          };
          const i = icons[route.name] || { active: 'ellipse', inactive: 'ellipse-outline' };
          return <Ionicons name={focused ? i.active : i.inactive} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen
        name="Jobs"
        component={BookingStackNav}
        listeners={({ navigation }) => ({
          tabPress: () => {
            // Always reset to BookingsList when the Jobs tab button is pressed.
            // This prevents HomeScreen's deep-link navigation (directly to BookingDetail)
            // from persisting when the user returns to the Jobs tab later.
            navigation.navigate('Jobs', { screen: 'BookingsList' });
          },
        })}
      />
      <Tab.Screen name="Earnings" component={EarningsScreen} />
      <Tab.Screen name="Target" component={TargetsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const DrawerNav = () => (
  <Drawer.Navigator
    drawerContent={(props) => <CustomDrawer {...props} />}
    screenOptions={{
      headerShown: false,
      drawerType: 'front',
      drawerStyle: {
        width: 300,
      },
    }}
  >
    <Drawer.Screen name="MainTabs" component={MainTabs} />
    <Drawer.Screen name="Calendar" component={UnifiedCalendarScreen} />
    <Drawer.Screen name="Payouts" component={PayoutsScreen} />
    <Drawer.Screen name="Notifications" component={NotificationsScreen} />
    <Drawer.Screen name="Credits" component={CreditsScreen} />
    <Drawer.Screen name="Training" component={TrainingScreen} />
    <Drawer.Screen name="HelpCenter" component={HelpCenterScreen} />
    <Drawer.Screen name="TicketDetail" component={TicketDetailScreen} />
    <Drawer.Screen name="MyHub" component={MyHubScreen} />
    <Drawer.Screen name="Reviews" component={ReviewsScreen} />
    <Drawer.Screen name="Targets" component={TargetsScreen} />
    <Drawer.Screen name="PayoutAccounts" component={PayoutAccountsScreen} />
    <Drawer.Screen name="BankAccountSetup" component={BankAccountSetupScreen} />
  </Drawer.Navigator>
);

export const AppNavigator = ({ navigationRef }: { navigationRef?: any }) => {
  const { user, hydrated } = useAppSelector((s) => s.auth);
  if (!hydrated) return null;

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={DrawerNav} />
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
