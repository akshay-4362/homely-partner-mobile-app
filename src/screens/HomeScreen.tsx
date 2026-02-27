import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { fetchCreditBalance } from '../store/creditSlice';
import { notificationApi } from '../api/notificationApi';
import { useDebouncedRefresh } from '../hooks/useDebouncedRefresh';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { CreditBalanceWidget } from '../components/CreditBalanceWidget';
import { PendingTasksWidget } from '../components/PendingTasksWidget';
import { Notification } from '../types';

export const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const { balance: creditBalance } = useAppSelector((s) => s.credit);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    // Fetch from Redux (with caching)
    dispatch(fetchCreditBalance());

    // Fetch notifications (not cached in Redux)
    try {
      const notifData = await notificationApi.list(5);
      const notifs = notifData?.data || notifData || [];
      setNotifications(Array.isArray(notifs) ? notifs.slice(0, 5) : []);
    } catch {}
  };

  const loadDataForced = async () => {
    // Force refresh all data
    dispatch(fetchCreditBalance());

    try {
      const notifData = await notificationApi.list(5);
      const notifs = notifData?.data || notifData || [];
      setNotifications(Array.isArray(notifs) ? notifs.slice(0, 5) : []);
    } catch {}
  };

  useEffect(() => { loadData(); }, []);

  const debouncedRefresh = useDebouncedRefresh(loadDataForced);

  const onRefresh = async () => {
    setRefreshing(true);
    await debouncedRefresh();
    setRefreshing(false);
  };

  const unreadNotifs = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.greeting}>Good morning,</Text>
          <Text style={styles.name} numberOfLines={1}>{user?.firstName} {user?.lastName}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <CreditBalanceWidget />
          <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')}>
            <Ionicons name="notifications-outline" size={24} color={Colors.textPrimary} />
            {unreadNotifs > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadNotifs}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        contentContainerStyle={styles.scroll}
      >
        {/* Pending Tasks */}
        <PendingTasksWidget />

        {/* New Jobs Paused Banner */}
        {creditBalance === 0 && (
          <View style={styles.pausedBanner}>
            <Ionicons name="pause-circle" size={24} color={Colors.error} />
            <View style={{ flex: 1 }}>
              <Text style={styles.pausedTitle}>New jobs are paused</Text>
              <Text style={styles.pausedSubtitle}>Recharge credits to receive new job assignments</Text>
            </View>
            <TouchableOpacity
              style={styles.pausedBtn}
              onPress={() => navigation.navigate('Credits')}
              activeOpacity={0.7}
            >
              <Text style={styles.pausedBtnText}>Recharge</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingTop: 0, paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  greeting: { fontSize: 13, color: Colors.textSecondary },
  name: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  bellBtn: { position: 'relative', padding: 4 },
  badge: {
    position: 'absolute', top: 0, right: 0, minWidth: 16, height: 16,
    backgroundColor: Colors.error, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  scroll: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 90,
  },
  pausedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorBg,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  pausedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.error,
    marginBottom: 2,
  },
  pausedSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  pausedBtn: {
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  pausedBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
});
