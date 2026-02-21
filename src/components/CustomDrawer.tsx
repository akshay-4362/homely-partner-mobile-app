import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { logout } from '../store/authSlice';
import { creditApi } from '../api/creditApi';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { formatCurrency } from '../utils/format';

interface MenuItem {
  label: string;
  icon: string;
  screen?: string;
  badge?: number | string;
  color?: string;
  onPress?: () => void;
}

export const CustomDrawer: React.FC<DrawerContentComponentProps> = (props) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const [creditBalance, setCreditBalance] = useState<number>(0);

  useEffect(() => {
    loadCredits();
  }, []);

  const loadCredits = async () => {
    try {
      const { data } = await creditApi.getCreditBalance();
      setCreditBalance(data?.balance || 0);
    } catch {}
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          props.navigation.closeDrawer();
          dispatch(logout());
        }
      },
    ]);
  };

  const menuItems: MenuItem[] = [
    { label: 'Home', icon: 'home', screen: 'Home' },
    { label: 'My Jobs', icon: 'briefcase', screen: 'Jobs' },
    { label: 'Earnings', icon: 'wallet', screen: 'Earnings' },
    { label: 'Calendar', icon: 'calendar', screen: 'Calendar' },
    { label: 'Availability', icon: 'time', screen: 'Availability' },
  ];

  const otherMenuItems: MenuItem[] = [
    {
      label: 'Credits',
      icon: 'flash',
      screen: 'Credits',
      badge: formatCurrency(creditBalance),
      color: creditBalance < 3000 ? Colors.error : Colors.primary,
    },
    { label: 'Training', icon: 'school', screen: 'Training' },
    { label: 'My Hub', icon: 'stats-chart', screen: 'MyHub' },
    { label: 'Notifications', icon: 'notifications', screen: 'Notifications' },
    { label: 'Help Center', icon: 'help-circle', screen: 'HelpCenter' },
  ];

  const settingsItems: MenuItem[] = [
    { label: 'Profile', icon: 'person', screen: 'Profile' },
    { label: 'Privacy Policy', icon: 'shield-checkmark', onPress: () => {} },
    { label: 'Terms of Service', icon: 'document-text', onPress: () => {} },
  ];

  const navigateTo = (screen?: string, callback?: () => void) => {
    props.navigation.closeDrawer();
    if (callback) {
      callback();
    } else if (screen) {
      props.navigation.navigate(screen as any);
    }
  };

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();
  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.profileSection}>
          {user?.profilePicture ? (
            <Image source={{ uri: user.profilePicture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{fullName || 'Professional Partner'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>

        {/* Credit Balance Card */}
        <TouchableOpacity
          style={styles.creditCard}
          onPress={() => navigateTo('Credits')}
          activeOpacity={0.7}
        >
          <View style={styles.creditLeft}>
            <Ionicons name="flash" size={20} color={Colors.primary} />
            <Text style={styles.creditLabel}>Available Credits</Text>
          </View>
          <Text style={[styles.creditAmount, creditBalance < 3000 && { color: Colors.error }]}>
            {formatCurrency(creditBalance)}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Menu Items */}
      <ScrollView
        style={styles.menuScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.menuContent}
      >
        {/* Main Menu */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>MAIN MENU</Text>
          {menuItems.map((item, index) => (
            <MenuItem
              key={index}
              item={item}
              onPress={() => navigateTo(item.screen, item.onPress)}
              isActive={false}
            />
          ))}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Other Options */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>OTHER</Text>
          {otherMenuItems.map((item, index) => (
            <MenuItem
              key={index}
              item={item}
              onPress={() => navigateTo(item.screen, item.onPress)}
              isActive={false}
            />
          ))}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Settings */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>SETTINGS</Text>
          {settingsItems.map((item, index) => (
            <MenuItem
              key={index}
              item={item}
              onPress={() => navigateTo(item.screen, item.onPress)}
              isActive={false}
            />
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>Homelyo Pro v1.0.0</Text>
      </ScrollView>
    </View>
  );
};

interface MenuItemProps {
  item: MenuItem;
  onPress: () => void;
  isActive: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ item, onPress, isActive }) => (
  <TouchableOpacity
    style={[styles.menuItem, isActive && styles.menuItemActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Ionicons
      name={item.icon as any}
      size={22}
      color={isActive ? Colors.primary : item.color || Colors.textSecondary}
    />
    <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
      {item.label}
    </Text>
    {item.badge && (
      <View style={[styles.badge, item.color && { backgroundColor: item.color + '20' }]}>
        <Text style={[styles.badgeText, item.color && { color: item.color }]}>
          {item.badge}
        </Text>
      </View>
    )}
    <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 50,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: Spacing.md,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  creditCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  creditLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  creditLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  creditAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  menuScroll: {
    flex: 1,
  },
  menuContent: {
    paddingVertical: Spacing.md,
  },
  menuSection: {
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 0.8,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: 2,
  },
  menuItemActive: {
    backgroundColor: Colors.primaryBg,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  menuLabelActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.errorBg,
    borderRadius: BorderRadius.md,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.error,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
});
