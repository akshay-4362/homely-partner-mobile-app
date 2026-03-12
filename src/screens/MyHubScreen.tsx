import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  Platform, Image, Dimensions, Alert, Modal, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing } from '../theme/colors';
import { Card } from '../components/common/Card';
import { Loader } from '../components/common/Loader';
import apiClient from '../api/client';
import { proApi } from '../api/proApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// MapMyIndia (Mappls) API Key
const MAPPLS_API_KEY = process.env.EXPO_PUBLIC_MAPPLS_API_KEY || '77982c1e7ce80c97d51014114a198fb2';

// Bangalore coordinates
const BANGALORE_LAT = 12.9716;
const BANGALORE_LNG = 77.5946;

// Available service hubs
const SERVICE_HUBS = [
  'Whitefield', 'HSR', 'Koramangala', 'BTM',
  'Indiranagar', 'Electronic City', 'Hebbal', 'Yelahanka'
] as const;
type Hub = typeof SERVICE_HUBS[number];

// Approximate GPS coordinates for each hub (used for map highlighting)
const HUB_COORDINATES: Record<Hub, { lat: number; lng: number }> = {
  'Whitefield':       { lat: 12.9698, lng: 77.7499 },
  'HSR':              { lat: 12.9116, lng: 77.6473 },
  'Koramangala':      { lat: 12.9352, lng: 77.6245 },
  'BTM':              { lat: 12.9166, lng: 77.6101 },
  'Indiranagar':      { lat: 12.9719, lng: 77.6412 },
  'Electronic City':  { lat: 12.8458, lng: 77.6692 },
  'Hebbal':           { lat: 13.0354, lng: 77.5970 },
  'Yelahanka':        { lat: 13.1005, lng: 77.5963 },
};

interface HubStats {
  totalJobsDelivered: number;
  repeatCustomers: number;
  avgRating: number;
  totalReviews: number;
  serviceAreas: string[];
  activeCity: string;
  monthlyEarnings: number;
  thisWeekJobs: number;
  acceptanceRate: number;
  cancellationRate: number;
  completionRate: number;
  avgResponseTime: number;
  last30DaysJobs?: number;
  last30DaysRepeatCustomers?: number;
}

export const MyHubScreen = () => {
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<HubStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Hub selection state
  const [currentHub, setCurrentHub] = useState<Hub | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [selectedRequestHub, setSelectedRequestHub] = useState<Hub | null>(null);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<{ requestedHub: string; createdAt: string } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'capturing' | 'saved' | 'error'>('idle');

  useEffect(() => { load(); }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const statsRes = await apiClient.get('/professionals/hub/stats');
      const data = statsRes.data?.data;
      if (data) setStats(data);
      else setStats(null);

      // Load current hub + any pending change request
      const [profile, requestsRes] = await Promise.all([
        proApi.fetchProfile(),
        apiClient.get('/hub-change-requests/my').catch(() => ({ data: { requests: [] } }))
      ]);
      if (profile?.hub) setCurrentHub(profile.hub as Hub);
      const pending = requestsRes.data?.requests?.find((r: any) => r.status === 'pending');
      setPendingRequest(pending ? { requestedHub: pending.requestedHub, createdAt: pending.createdAt } : null);

      // Try to update GPS location silently
      captureGPS().then(gps => {
        if (gps) {
          proApi.updateProfile({ location: { lat: gps.lat, lng: gps.lng } }).catch(() => {});
          setLocationStatus('saved');
        }
      });
    } catch (error: any) {
      console.error('Failed to load hub data:', error.response?.data || error.message);
      setStats(null);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => { setRefreshing(true); load(true); };

  /** Grab GPS coordinates — works in Expo managed workflow via navigator.geolocation */
  const captureGPS = (): Promise<{ lat: number; lng: number } | null> =>
    new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 10000, maximumAge: 60000 }
      );
    });

  /**
   * Professional selects a hub in the request modal → submits to backend.
   * Admin must approve before the hub actually changes.
   */
  const handleRequestSubmit = async () => {
    if (!selectedRequestHub) return;
    setSubmittingRequest(true);
    try {
      if (!currentHub) {
        // ── First-time setup: save hub directly, no admin approval needed ──
        const gps = await captureGPS();
        const payload: Record<string, unknown> = { hub: selectedRequestHub };
        if (gps) payload.location = { lat: gps.lat, lng: gps.lng };
        await proApi.updateProfile(payload);
        setCurrentHub(selectedRequestHub);
        setShowRequestModal(false);
        setSelectedRequestHub(null);
        Alert.alert(
          'Hub Set! 📍',
          `You're now set up for ${selectedRequestHub}. Jobs within 15 km will be dispatched to you.`,
          [{ text: 'OK' }]
        );
      } else {
        // ── Changing existing hub: submit request to admin ──
        await apiClient.post('/hub-change-requests', {
          requestedHub: selectedRequestHub,
          reason: requestReason.trim() || undefined
        });
        setShowRequestModal(false);
        setRequestReason('');
        setSelectedRequestHub(null);
        setPendingRequest({ requestedHub: selectedRequestHub, createdAt: new Date().toISOString() });
        Alert.alert(
          'Request Submitted ✅',
          `Your request to change hub to ${selectedRequestHub} has been sent to admin for approval. You'll be notified once reviewed.`,
          [{ text: 'OK' }]
        );
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to save hub. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSubmittingRequest(false);
    }
  };


  if (loading) return <Loader text="Loading My Hub..." />;

  if (!stats) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Hub</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="location-outline" size={64} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>Unable to Load Hub Data</Text>
          <Text style={styles.emptyMessage}>
            We couldn't load your hub statistics. Please try again.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => load()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const s = stats;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Hub</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={styles.scroll}
      >
        {/* Hub Name */}
        <Text style={styles.hubName}>{s.activeCity}</Text>

        {/* ── Hub & Location Setup Card ────────────────────────── */}
        <Card style={styles.hubSetupCard}>
          <View style={styles.hubSetupRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.hubSetupLabel}>Your service hub</Text>
              {currentHub ? (
                <View style={styles.hubBadgeRow}>
                  <Ionicons name="location" size={16} color={Colors.primary} />
                  <Text style={styles.hubBadgeText}>{currentHub}</Text>
                  {locationStatus === 'saved' && (
                    <View style={styles.gpsChip}>
                      <Ionicons name="navigate" size={11} color="#16a34a" />
                      <Text style={[styles.gpsChipText, { color: '#16a34a' }]}>GPS saved</Text>
                    </View>
                  )}
                  {locationStatus === 'error' && (
                    <View style={[styles.gpsChip, { backgroundColor: '#FEF2F2' }]}>
                      <Ionicons name="alert-circle" size={11} color="#dc2626" />
                      <Text style={[styles.gpsChipText, { color: '#dc2626' }]}>No GPS</Text>
                    </View>
                  )}
                </View>
              ) : (
                <Text style={styles.hubNotSet}>Not set — tap to choose your area</Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.changeHubBtn, !!pendingRequest && { opacity: 0.4 }]}
              onPress={() => !pendingRequest && setShowRequestModal(true)}
              disabled={!!pendingRequest}
              activeOpacity={0.7}
            >
              {submittingRequest ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <Ionicons name="swap-horizontal" size={14} color={Colors.primary} />
                  <Text style={styles.changeHubText}>{currentHub ? 'Request Change' : 'Set Hub'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Pending request notice */}
          {pendingRequest && (
            <View style={styles.pendingBanner}>
              <Ionicons name="time-outline" size={14} color="#92400e" />
              <Text style={styles.pendingText}>
                Change to {pendingRequest.requestedHub} pending admin approval
              </Text>
            </View>
          )}

          <Text style={styles.hubSetupHint}>
            {pendingRequest
              ? 'Your hub change request is under review. You can\'t submit another request until this one is resolved.'
              : 'Jobs within 15 km of your location in this hub will be dispatched to you. To change your hub, submit a request to admin.'}
          </Text>
        </Card>

        {/* Map Section — centered on selected hub */}
        <Card style={styles.mapCard}>
          {(() => {
            const hubCoords = currentHub ? HUB_COORDINATES[currentHub] : null;
            const mapLat = hubCoords?.lat ?? BANGALORE_LAT;
            const mapLng = hubCoords?.lng ?? BANGALORE_LNG;
            return (
              <Image
                source={{
                  uri: `https://apis.mapmyindia.com/advancedmaps/v1/${MAPPLS_API_KEY}/still_image?center=${mapLat},${mapLng}&zoom=13&size=${Math.round(SCREEN_WIDTH - 40)}x360&markers=${mapLat},${mapLng}`
                }}
                style={styles.mapImage}
                resizeMode="cover"
              />
            );
          })()}
          <View style={styles.mapOverlay}>
            <Text style={styles.mapCityName}>{currentHub || 'Bengaluru'}</Text>
            <Text style={styles.mapCityNameKannada}>{currentHub ? 'Selected hub' : 'ಬೆಂಗಳೂರು'}</Text>
          </View>
        </Card>

        {/* Stats Section */}
        <Card style={styles.statsCard}>
          <View style={styles.statRow}>
            <Ionicons name="briefcase" size={20} color={Colors.textSecondary} />
            <Text style={styles.statText}>
              {s.last30DaysJobs || s.totalJobsDelivered} jobs delivered within hub in last 30 days
            </Text>
          </View>
          <View style={styles.statRow}>
            <Ionicons name="repeat" size={20} color={Colors.textSecondary} />
            <Text style={styles.statText}>
              {s.last30DaysRepeatCustomers || s.repeatCustomers} of {s.last30DaysJobs || s.totalJobsDelivered} jobs were of repeat customers
            </Text>
          </View>
        </Card>

        {/* Need Help Section */}
        <Text style={styles.sectionTitle}>Need help?</Text>

        <Card>
          <TouchableOpacity
            style={styles.helpItem}
            onPress={() => {/* Navigate to hub info */}}
          >
            <Text style={styles.helpItemText}>What is a Hub?</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.helpDivider} />

          <TouchableOpacity
            style={styles.helpItem}
            onPress={() => {/* Navigate to rebooking info */}}
          >
            <Text style={styles.helpItemText}>Getting rebooking leads outside hub</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
          </TouchableOpacity>
        </Card>
      </ScrollView>

      {/* ── Hub Change REQUEST Modal ────────────────────────────── */}
      <Modal
        visible={showRequestModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRequestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {currentHub ? 'Request Hub Change' : 'Set Your Service Hub'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {currentHub
                ? 'Select the hub you want to move to. Admin will review and approve your request.'
                : 'Pick your primary service area. This will be saved immediately.'}
            </Text>

            {/* Hub options */}
            {SERVICE_HUBS.filter(h => h !== currentHub).map((hub) => (
              <TouchableOpacity
                key={hub}
                style={[
                  styles.hubOption,
                  selectedRequestHub === hub && styles.hubOptionActive
                ]}
                onPress={() => setSelectedRequestHub(hub)}
                activeOpacity={0.7}
              >
                <View style={styles.hubOptionLeft}>
                  <Ionicons
                    name={selectedRequestHub === hub ? 'location' : 'location-outline'}
                    size={20}
                    color={selectedRequestHub === hub ? Colors.primary : Colors.textSecondary}
                  />
                  <Text style={[
                    styles.hubOptionText,
                    selectedRequestHub === hub && styles.hubOptionTextActive
                  ]}>{hub}</Text>
                </View>
                {selectedRequestHub === hub && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}

            {/* Reason text input (only for existing hub holders) */}
            {currentHub && (
              <TextInput
                style={styles.reasonInput}
                placeholder="Why do you want to change hub? (optional)"
                placeholderTextColor={Colors.textTertiary}
                value={requestReason}
                onChangeText={setRequestReason}
                multiline
                numberOfLines={2}
                maxLength={300}
              />
            )}

            <TouchableOpacity
              style={[
                styles.submitRequestBtn,
                (!selectedRequestHub || submittingRequest) && { opacity: 0.4 }
              ]}
              onPress={handleRequestSubmit}
              disabled={!selectedRequestHub || submittingRequest}
              activeOpacity={0.8}
            >
              <Text style={styles.submitRequestText}>
                {submittingRequest ? 'Submitting...' : currentHub ? 'Submit Request' : 'Set Hub'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => { setShowRequestModal(false); setSelectedRequestHub(null); setRequestReason(''); }}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Spacing.lg, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  scroll: { padding: Spacing.xl, paddingBottom: 100, gap: Spacing.lg },

  // Hub Name
  hubName: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },

  // Map Card
  mapCard: {
    padding: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  mapImage: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.gray100,
  },
  mapOverlay: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
  },
  mapCityName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  mapCityNameKannada: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginTop: 2,
  },

  // Stats Card
  statsCard: {
    gap: Spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  statText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textPrimary,
    fontWeight: '500',
  },

  // Need Help Section
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  helpItemText: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  helpDivider: {
    height: 1,
    backgroundColor: Colors.divider,
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },

  // Hub setup card
  hubSetupCard: { marginBottom: 12 },
  hubSetupRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  hubSetupLabel: { fontSize: 11, color: Colors.textTertiary, marginBottom: 4, fontWeight: '500' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  hubBadgeRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, flexWrap: 'wrap' as const },
  hubBadgeText: { fontSize: 16, fontWeight: '700' as const, color: Colors.textPrimary },
  hubNotSet: { fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic' as const },
  hubSetupHint: { fontSize: 12, color: Colors.textTertiary, marginTop: 10, lineHeight: 17 },
  changeHubBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#f5f3ff' },
  changeHubText: { fontSize: 13, fontWeight: '600' as const, color: Colors.primary },
  gpsChip: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 3, backgroundColor: '#F0FDF4', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 },
  gpsChipText: { fontSize: 11, fontWeight: '500' as const },
  pendingBanner: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, backgroundColor: '#FFFBEB', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginTop: 10, borderWidth: 1, borderColor: '#FDE68A' },
  pendingText: { fontSize: 12, color: '#92400e', flex: 1 },

  // Request modal & inputs
  reasonInput: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: Colors.textPrimary, marginBottom: 12, minHeight: 60, textAlignVertical: 'top' as const },
  submitRequestBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' as const, marginBottom: 8 },
  submitRequestText: { fontSize: 15, fontWeight: '700' as const, color: '#fff' },

  // Hub Picker Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' as const },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36, maxHeight: '90%' },
  modalHandle: { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center' as const, marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.textPrimary, marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 16, lineHeight: 19 },
  hubOption: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, marginBottom: 8, backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0' },
  hubOptionActive: { backgroundColor: '#f5f3ff', borderColor: Colors.primary },
  hubOptionLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  hubOptionText: { fontSize: 15, color: Colors.textPrimary, fontWeight: '500' as const },
  hubOptionTextActive: { color: Colors.primary, fontWeight: '700' as const },
  modalCancelBtn: { marginTop: 8, paddingVertical: 14, alignItems: 'center' as const, borderRadius: 14, borderWidth: 1.5, borderColor: '#e2e8f0' },
  modalCancelText: { fontSize: 15, color: Colors.textSecondary, fontWeight: '500' as const },
});
