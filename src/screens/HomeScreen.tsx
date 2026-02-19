import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { fetchProBookings } from '../store/bookingSlice';
import { fetchPayouts } from '../store/payoutSlice';
import { logout } from '../store/authSlice';
import { accountingApi } from '../api/accountingApi';
import { notificationApi } from '../api/notificationApi';
import { Colors, Spacing, BorderRadius, Typography } from '../theme/colors';
import { formatCurrency, formatDate } from '../utils/format';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';
import { SectionHeader } from '../components/common/SectionHeader';
import { TodayBooking, ProfessionalAccountingSummary, Notification } from '../types';

export const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const { items: bookings, status } = useAppSelector((s) => s.bookings);
  const [summary, setSummary] = useState<ProfessionalAccountingSummary | null>(null);
  const [todayJobs, setTodayJobs] = useState<TodayBooking[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    dispatch(fetchProBookings());
    dispatch(fetchPayouts());
    try {
      const [sumData, todayData, notifData] = await Promise.all([
        accountingApi.getSummary(),
        accountingApi.getTodayBookings(),
        notificationApi.list(5),
      ]);
      setSummary(sumData?.data || sumData);
      const today = todayData?.data || todayData || [];
      setTodayJobs(Array.isArray(today) ? today : []);
      const notifs = notifData?.data || notifData || [];
      setNotifications(Array.isArray(notifs) ? notifs.slice(0, 5) : []);
    } catch {}
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length;
  const inProgressCount = bookings.filter((b) => b.status === 'in_progress').length;
  const todayStr = new Date().toDateString();
  const todayBookings = bookings.filter(
    (b) => new Date(b.scheduledAt).toDateString() === todayStr
  );

  const unreadNotifs = notifications.filter((n) => !n.read).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning,</Text>
          <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        </View>
        <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')}>
          <Ionicons name="notifications-outline" size={24} color={Colors.textPrimary} />
          {unreadNotifs > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadNotifs}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        contentContainerStyle={styles.scroll}
      >
        {/* Status Banner */}
        <View style={[styles.statusBanner, inProgressCount > 0 ? styles.bannerActive : styles.bannerIdle]}>
          <Ionicons
            name={inProgressCount > 0 ? 'radio-button-on' : 'checkmark-circle-outline'}
            size={20}
            color={inProgressCount > 0 ? Colors.warning : Colors.success}
          />
          <Text style={styles.statusText}>
            {inProgressCount > 0
              ? `${inProgressCount} job${inProgressCount > 1 ? 's' : ''} in progress`
              : confirmedCount > 0
              ? `${confirmedCount} upcoming job${confirmedCount > 1 ? 's' : ''}`
              : 'No active jobs right now'}
          </Text>
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiRow}>
          <KpiCard
            label="Today's Jobs"
            value={String(todayBookings.length)}
            icon="calendar-outline"
            color={Colors.primary}
            bg={Colors.primaryBg}
          />
          <KpiCard
            label="Total Earned"
            value={summary ? formatCurrency(summary.totalEarnings) : '—'}
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

        {/* Today's Jobs */}
        {todayJobs.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Today's Schedule"
              action="View All"
              onAction={() => navigation.navigate('Jobs')}
            />
            {todayJobs.map((job) => (
              <TodayJobCard key={job.bookingId} job={job} onPress={() => navigation.navigate('Jobs')} />
            ))}
          </View>
        )}

        {/* Recent Bookings */}
        <View style={styles.section}>
          <SectionHeader
            title="Recent Jobs"
            action="View All"
            onAction={() => navigation.navigate('Jobs')}
          />
          {bookings.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="briefcase-outline" size={32} color={Colors.gray300} />
              <Text style={styles.emptyText}>No bookings yet</Text>
            </View>
          ) : (
            bookings.slice(0, 5).map((b) => (
              <TouchableOpacity
                key={b.id}
                style={styles.bookingRow}
                onPress={() => navigation.navigate('Jobs', { screen: 'BookingDetail', params: { booking: b } })}
                activeOpacity={0.7}
              >
                <View style={styles.bookingLeft}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{b.customerName[0]}</Text>
                  </View>
                  <View style={styles.bookingInfo}>
                    <Text style={styles.bookingName}>{b.customerName}</Text>
                    <Text style={styles.bookingService}>{b.serviceName}</Text>
                    <Text style={styles.bookingDate}>{formatDate(b.scheduledAt)}</Text>
                  </View>
                </View>
                <View style={styles.bookingRight}>
                  <Text style={styles.bookingAmount}>{formatCurrency(b.total)}</Text>
                  <Badge status={b.status} label={b.status} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <SectionHeader title="Quick Actions" />
          <View style={styles.quickActions}>
            {[
              { icon: 'calendar', label: 'Calendar', screen: 'Calendar' },
              { icon: 'time', label: 'Availability', screen: 'Availability' },
              { icon: 'card', label: 'Payouts', screen: 'Payouts' },
              { icon: 'stats-chart', label: 'My Hub', screen: 'MyHub' },
            ].map((a) => (
              <TouchableOpacity
                key={a.screen}
                style={styles.quickBtn}
                onPress={() => navigation.navigate(a.screen)}
                activeOpacity={0.7}
              >
                <View style={styles.quickIcon}>
                  <Ionicons name={a.icon as any} size={22} color={Colors.primary} />
                </View>
                <Text style={styles.quickLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Pending Tasks placeholder */}
        {confirmedCount > 0 && (
          <Card style={styles.pendingCard}>
            <View style={styles.pendingRow}>
              <Ionicons name="alert-circle" size={20} color={Colors.warning} />
              <Text style={styles.pendingText}>
                {confirmedCount} job{confirmedCount > 1 ? 's' : ''} need your attention
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Jobs')}>
              <Text style={styles.pendingAction}>View Jobs →</Text>
            </TouchableOpacity>
          </Card>
        )}
      </ScrollView>
    </View>
  );
};

const KpiCard = ({ label, value, icon, color, bg }: { label: string; value: string; icon: any; color: string; bg: string }) => (
  <View style={[styles.kpiCard, { backgroundColor: bg }]}>
    <Ionicons name={icon} size={20} color={color} style={{ marginBottom: 6 }} />
    <Text style={[styles.kpiValue, { color }]}>{value}</Text>
    <Text style={styles.kpiLabel}>{label}</Text>
  </View>
);

const TodayJobCard = ({ job, onPress }: { job: TodayBooking; onPress: () => void }) => (
  <TouchableOpacity style={styles.todayCard} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.todayLeft}>
      <Text style={styles.todayTime}>{new Date(job.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
      <Badge status={job.status} label={job.status} />
    </View>
    <View style={styles.todayMid}>
      <Text style={styles.todayName}>{job.customerName}</Text>
      <Text style={styles.todayService}>{job.serviceName}</Text>
      {job.startOtp && job.status === 'confirmed' && (
        <View style={styles.otpBadge}>
          <Text style={styles.otpLabel}>Start OTP: </Text>
          <Text style={styles.otpValue}>{job.startOtp}</Text>
        </View>
      )}
    </View>
    <Text style={styles.todayAmt}>{formatCurrency(job.earnings)}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingTop: 56, paddingBottom: Spacing.lg,
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
  scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 24 },
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderRadius: BorderRadius.md, marginBottom: Spacing.lg, gap: 8,
  },
  bannerActive: { backgroundColor: Colors.warningBg },
  bannerIdle: { backgroundColor: Colors.successBg },
  statusText: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  kpiRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  kpiCard: {
    flex: 1, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center',
  },
  kpiValue: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  kpiLabel: { fontSize: 10, color: Colors.textSecondary, textAlign: 'center', fontWeight: '500' },
  section: { marginBottom: Spacing.xl },
  bookingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  bookingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  avatarCircle: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primaryBg,
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md,
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  bookingInfo: { flex: 1 },
  bookingName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  bookingService: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  bookingDate: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  bookingRight: { alignItems: 'flex-end', gap: 4 },
  bookingAmount: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  emptyBox: {
    alignItems: 'center', padding: 32, backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, gap: 8,
  },
  emptyText: { fontSize: 14, color: Colors.textTertiary },
  quickActions: { flexDirection: 'row', gap: Spacing.md },
  quickBtn: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  quickIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryBg,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  quickLabel: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary },
  todayCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm,
    borderLeftWidth: 3, borderLeftColor: Colors.primary,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  todayLeft: { width: 80, marginRight: Spacing.md, gap: 4 },
  todayTime: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  todayMid: { flex: 1 },
  todayName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  todayService: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  todayAmt: { fontSize: 14, fontWeight: '700', color: Colors.success },
  otpBadge: {
    flexDirection: 'row', marginTop: 4, backgroundColor: Colors.primaryBg,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start',
  },
  otpLabel: { fontSize: 10, color: Colors.textSecondary },
  otpValue: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  pendingCard: { borderWidth: 1, borderColor: Colors.warningBg },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  pendingText: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500', flex: 1 },
  pendingAction: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
});
