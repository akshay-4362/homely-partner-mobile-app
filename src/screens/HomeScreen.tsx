import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, StatusBar, AppState, AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { fetchCreditBalance } from '../store/creditSlice';
import { fetchAccountingSummary, fetchTodayBookings } from '../store/accountingSlice';
import { fetchProBookings } from '../store/bookingSlice';
import { notificationApi } from '../api/notificationApi';
import { formatCurrency } from '../utils/format';
import { addISTDays, formatTimeIST, toISTDateKey } from '../utils/dateTime';
import { Badge } from '../components/common/Badge';
import { SectionHeader } from '../components/common/SectionHeader';
import { useDebouncedRefresh } from '../hooks/useDebouncedRefresh';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { CreditBalanceWidget } from '../components/CreditBalanceWidget';
import { PendingTasksWidget } from '../components/PendingTasksWidget';
import { CalendarWidget } from '../components/CalendarWidget';
import { Notification } from '../types';
import { usePayoutAccountCheck } from '../hooks/usePayoutAccountCheck';
import { agreementApi } from '../api/agreementApi';
import { useSocket, getSocket } from '../hooks/useSocket';
import { NewBookingAlert, BookingAlertData } from '../components/NewBookingAlert';

export const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const { balance: creditBalance } = useAppSelector((s) => s.credit);
  const { summary, todayBookings: todayJobs } = useAppSelector((s) => s.accounting);
  const { items: allBookings } = useAppSelector((s) => s.bookings);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [socketAlertVisible, setSocketAlertVisible] = useState(false);
  const [socketAlertData, setSocketAlertData] = useState<BookingAlertData | null>(null);

  // Track known confirmed booking IDs to detect new arrivals via polling
  const knownBookingIdsRef = useRef<Set<string> | null>(null);
  const isPollingActiveRef = useRef(false);

  // Get upcoming confirmed bookings (next 7 days)
  const upcomingJobs = allBookings
    .filter((b) => {
      if (b.status !== 'confirmed') return false;
      const scheduledDateKey = toISTDateKey(b.scheduledAt);
      const todayKey = toISTDateKey(new Date());
      const nextWeekKey = toISTDateKey(addISTDays(new Date(), 7));
      return scheduledDateKey >= todayKey && scheduledDateKey <= nextWeekKey;
    })
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 3); // Show max 3 upcoming jobs

  // Initialize socket connection so getSocket() is non-null on this screen
  useSocket();

  // Check for payout account on mount
  const { hasPayoutAccount, recheckPayoutAccount } = usePayoutAccountCheck();

  // Listen for real-time booking notifications via Socket.io
  useFocusEffect(
    useCallback(() => {
      const handleSocketNotification = (notification: any) => {
        if (notification?.type === 'booking' && notification?.data?.bookingId) {
          // Mark this booking as known so polling doesn't fire a duplicate alert
          const bookingId = notification.data.bookingId as string;
          if (knownBookingIdsRef.current) {
            knownBookingIdsRef.current.add(bookingId);
          }

          // Immediately refresh data
          loadData();

          // Show in-app alert with sound
          setSocketAlertData({
            title: notification.title || 'New Job Assigned!',
            message: notification.message || 'You have a new booking.',
            bookingId,
          });
          setSocketAlertVisible(true);
        }
      };

      const attachListener = () => {
        const socket = getSocket();
        if (!socket) return;
        socket.off('notification', handleSocketNotification);
        socket.on('notification', handleSocketNotification);
      };

      // Attach now if socket already connected
      attachListener();

      // Also attach once socket connects (handles race where socket not yet ready)
      const socket = getSocket();
      socket?.on('connect', attachListener);

      return () => {
        const s = getSocket();
        if (s) {
          s.off('notification', handleSocketNotification);
          s.off('connect', attachListener);
        }
      };
    }, [])
  );

  const loadData = async () => {
    // Fetch from Redux (with caching)
    dispatch(fetchCreditBalance());
    dispatch(fetchAccountingSummary(false));
    dispatch(fetchTodayBookings());
    dispatch(fetchProBookings(true)); // Fetch all bookings to show upcoming jobs

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
    dispatch(fetchAccountingSummary(true));
    dispatch(fetchTodayBookings());
    dispatch(fetchProBookings(true));

    try {
      const notifData = await notificationApi.list(5);
      const notifs = notifData?.data || notifData || [];
      setNotifications(Array.isArray(notifs) ? notifs.slice(0, 5) : []);
    } catch {}
  };

  // Check agreement on mount — redirect to gate if not accepted or version mismatch
  useEffect(() => {
    agreementApi.getMy().then((status) => {
      if (status.active && !status.isCurrentVersion) {
        navigation.replace('AgreementGate');
      }
    }).catch(() => { /* ignore — network issues shouldn't block the home screen */ });
  }, []);

  // Detect new confirmed bookings from polling and trigger alert + sound
  useEffect(() => {
    const confirmedIds = new Set(
      allBookings.filter((b) => b.status === 'confirmed').map((b) => b.id)
    );

    if (knownBookingIdsRef.current === null) {
      // First load — just seed the known set, no alert
      knownBookingIdsRef.current = confirmedIds;
      return;
    }

    if (!isPollingActiveRef.current) return;

    const newBookings = allBookings.filter(
      (b) => b.status === 'confirmed' && !knownBookingIdsRef.current!.has(b.id)
    );

    if (newBookings.length > 0) {
      const newest = newBookings[0];
      setSocketAlertData({
        title: 'New Job Assigned!',
        message: `You have a new booking.`,
        bookingId: newest.id,
      });
      setSocketAlertVisible(true);
    }

    knownBookingIdsRef.current = confirmedIds;
    isPollingActiveRef.current = false;
  }, [allBookings]);

  useEffect(() => { loadData(); }, []);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
      recheckPayoutAccount();
    }, [])
  );

  // Reload notifications when app comes back to foreground
  // (redux jobs are already refreshed by App.tsx AppState listener)
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        notificationApi.list(5).then((notifData) => {
          const notifs = notifData?.data || notifData || [];
          setNotifications(Array.isArray(notifs) ? notifs.slice(0, 5) : []);
        }).catch(() => {});
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  // Real-time polling - refresh every 30 seconds when screen is focused
  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(() => {
        console.log('🔄 Auto-refreshing home screen data...');
        isPollingActiveRef.current = true;
        loadData(); // Silent refresh (no loading indicators)
      }, 30000); // 30 seconds

      return () => {
        clearInterval(interval);
        isPollingActiveRef.current = false;
      };
    }, [])
  );

  const debouncedRefresh = useDebouncedRefresh(loadDataForced);

  const onRefresh = async () => {
    setRefreshing(true);
    await debouncedRefresh();
    setRefreshing(false);
  };

  const unreadNotifs = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
        {/* Calendar Widget */}
        <CalendarWidget />

        {/* Pending Tasks */}
        <PendingTasksWidget />

        {/* Payout Account Setup Banner */}
        {hasPayoutAccount === false && (
          <View style={styles.pausedBanner}>
            <Ionicons name="card-outline" size={24} color={Colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.pausedTitle}>Setup Payment Account</Text>
              <Text style={styles.pausedSubtitle}>Add your bank account or UPI to receive payments and job assignments</Text>
            </View>
            <TouchableOpacity
              style={[styles.pausedBtn, { backgroundColor: Colors.warning }]}
              onPress={() => navigation.navigate('BankAccountSetup')}
              activeOpacity={0.7}
            >
              <Text style={styles.pausedBtnText}>Setup</Text>
            </TouchableOpacity>
          </View>
        )}

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

        {/* KPI Cards */}
        <View style={styles.kpiRow}>
          <KpiCard
            label="Customer Paid"
            value={summary ? formatCurrency(summary.totalPaid) : '—'}
            icon="wallet-outline"
            color={Colors.success}
            bg={Colors.successBg}
          />
          <KpiCard
            label="Rating"
            value={summary ? `${summary.rating.toFixed(1)}★` : '—'}
            icon="star-outline"
            color={Colors.warning}
            bg={Colors.warningBg}
          />
        </View>

        {/* Upcoming Jobs Section */}
        <View style={styles.section}>
          {upcomingJobs && upcomingJobs.length > 0 ? (
            <>
              <SectionHeader
                title="Upcoming Jobs"
                action="View All"
                onAction={() => navigation.navigate('Jobs')}
              />
              {upcomingJobs.map((job) => (
                <TodayJobCard
                  key={job.id}
                  job={job}
                  onPress={() => navigation.navigate('Jobs', {
                    screen: 'BookingDetail',
                    params: { booking: job, fromScreen: 'Home' }
                  })}
                />
              ))}
            </>
          ) : (
            <TouchableOpacity
              style={styles.emptyCard}
              onPress={() => navigation.navigate('Jobs')}
              activeOpacity={0.7}
            >
              <Text style={styles.emptyTitle}>No new jobs</Text>
              <Ionicons name="chevron-forward" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Today's Schedule */}
        <View style={styles.section}>
          {todayJobs && todayJobs.length > 0 ? (
            <>
              <SectionHeader
                title="Today's Schedule"
                action="View All"
                onAction={() => navigation.navigate('Jobs')}
              />
              {todayJobs.map((job) => (
                <TodayJobCard
                  key={job.bookingId}
                  job={job}
                  onPress={() => navigation.navigate('Jobs', {
                    screen: 'BookingDetail',
                    params: { booking: job, fromScreen: 'Home' }
                  })}
                />
              ))}
            </>
          ) : (
            <TouchableOpacity
              style={styles.emptyCard}
              onPress={() => navigation.navigate('Jobs')}
              activeOpacity={0.7}
            >
              <Text style={styles.emptyTitle}>No jobs today</Text>
              <Ionicons name="chevron-forward" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Real-time booking alert triggered via Socket.io */}
      <NewBookingAlert
        visible={socketAlertVisible}
        data={socketAlertData}
        onViewBooking={(bookingId) => {
          setSocketAlertVisible(false);
          setSocketAlertData(null);
          navigation.navigate('Jobs', {
            screen: 'BookingDetail',
            params: { bookingId },
          });
        }}
        onDismiss={() => {
          setSocketAlertVisible(false);
          setSocketAlertData(null);
        }}
      />
    </SafeAreaView>
  );
};

const KpiCard = ({ label, value, icon, color, bg }: { label: string; value: string; icon: any; color: string; bg: string }) => (
  <View style={[styles.kpiCard, { backgroundColor: bg }]}>
    <Ionicons name={icon} size={20} color={color} style={{ marginBottom: 6 }} />
    <Text style={[styles.kpiValue, { color }]}>{value}</Text>
    <Text style={styles.kpiLabel}>{label}</Text>
  </View>
);

const TodayJobCard = ({ job, onPress }: { job: any; onPress: () => void }) => {
  // Handle different data structures from todayBookings vs allBookings
  const earnings = job.earnings || job.lockedPricing?.payout || job.payout || 0;
  const customerName = job.customerName || (job.customer?.firstName + ' ' + job.customer?.lastName) || 'Customer';
  const serviceName = job.serviceName || job.service?.name || 'Service';

  return (
    <TouchableOpacity style={styles.todayCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.todayLeft}>
        <Text style={styles.todayTime}>{formatTimeIST(job.scheduledAt, { hour: '2-digit', minute: '2-digit' })}</Text>
        <Badge status={job.status} label={job.status} />
      </View>
      <View style={styles.todayMid}>
        <Text style={styles.todayName} numberOfLines={2}>{customerName}</Text>
        <Text style={styles.todayService} numberOfLines={2}>{serviceName}</Text>
      </View>
      <View style={styles.todayRight}>
        <Text style={styles.todayAmt}>{formatCurrency(earnings)}</Text>
      </View>
    </TouchableOpacity>
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
  kpiRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  kpiCard: {
    flex: 1, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center',
  },
  kpiValue: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  kpiLabel: { fontSize: 10, color: Colors.textSecondary, textAlign: 'center', fontWeight: '500' },
  section: { marginBottom: Spacing.xl },
  todayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 88,
  },
  todayLeft: {
    width: 90,
    marginRight: Spacing.lg,
    gap: 6,
    alignItems: 'flex-start',
  },
  todayTime: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  todayMid: {
    flex: 1,
    marginRight: Spacing.md,
    justifyContent: 'center',
  },
  todayName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    lineHeight: 20,
    marginBottom: 4,
  },
  todayService: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  todayRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  todayAmt: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.success,
    letterSpacing: 0.2,
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
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});
