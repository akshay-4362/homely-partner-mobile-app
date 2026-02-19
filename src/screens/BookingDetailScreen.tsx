import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, FlatList, Image, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { updateProBookingStatus } from '../store/bookingSlice';
import { bookingApi } from '../api/bookingApi';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { formatCurrency, formatDate, formatDateOnly } from '../utils/format';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { ProBooking, AdditionalCharge, MediaItem } from '../types';

const CHARGE_CATEGORIES = ['materials', 'extra_work', 'transport', 'other'];

export const BookingDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const booking: ProBooking = route.params?.booking;

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Charges
  const [charges, setCharges] = useState<{ pending: AdditionalCharge[]; approved: AdditionalCharge[]; total: number } | null>(null);
  const [chargesModal, setChargesModal] = useState(false);
  const [addChargeModal, setAddChargeModal] = useState(false);
  const [newCharges, setNewCharges] = useState([{ description: '', amount: '', category: 'materials' }]);

  // Media
  const [mediaModal, setMediaModal] = useState(false);
  const [mediaPhase, setMediaPhase] = useState<'before' | 'after'>('before');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem[]>([]);
  const [mediaLabel, setMediaLabel] = useState('');

  useEffect(() => {
    if (booking.status === 'in_progress' || booking.status === 'completed') {
      loadCharges();
    }
  }, []);

  const loadCharges = async () => {
    try {
      const data = await bookingApi.getCharges(booking.id);
      setCharges(data?.data || data);
    } catch {}
  };

  const handleStatusChange = async (newStatus: string) => {
    setError('');
    if ((newStatus === 'in_progress' || newStatus === 'completed') && !otp.trim()) {
      setError('Please enter the OTP');
      return;
    }
    setLoading(true);
    const res = await dispatch(updateProBookingStatus({ bookingId: booking.id, status: newStatus, otp: otp || undefined }));
    setLoading(false);
    if (res.meta.requestStatus === 'fulfilled') {
      Alert.alert('Success', `Job updated to ${newStatus.replace('_', ' ')}`);
      navigation.goBack();
    } else {
      setError((res.payload as string) || 'Failed to update status');
    }
  };

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.7,
      base64: true,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const isVideo = asset.type === 'video';
      setSelectedMedia((prev) => [
        ...prev,
        {
          dataUrl: `data:${isVideo ? 'video/mp4' : 'image/jpeg'};base64,${asset.base64}`,
          type: isVideo ? 'video' : 'photo',
          label: mediaLabel || 'Photo',
        },
      ]);
    }
  };

  const submitMedia = async () => {
    if (selectedMedia.length === 0) { Alert.alert('Add at least one photo'); return; }
    setLoading(true);
    try {
      await bookingApi.addMedia(booking.id, mediaPhase, selectedMedia);
      Alert.alert('Success', `${mediaPhase === 'before' ? 'Before' : 'After'} photos uploaded`);
      setMediaModal(false);
      setSelectedMedia([]);
    } catch {
      Alert.alert('Error', 'Failed to upload media');
    }
    setLoading(false);
  };

  const submitCharges = async () => {
    const valid = newCharges.filter((c) => c.description && parseFloat(c.amount) > 0);
    if (valid.length === 0) { Alert.alert('Add at least one valid charge'); return; }
    setLoading(true);
    try {
      await bookingApi.addCharges(booking.id, valid.map((c) => ({
        description: c.description,
        amount: parseFloat(c.amount),
        category: c.category,
      })));
      Alert.alert('Success', 'Charges added. Customer will be notified for approval.');
      setAddChargeModal(false);
      setNewCharges([{ description: '', amount: '', category: 'materials' }]);
      loadCharges();
    } catch {
      Alert.alert('Error', 'Failed to add charges');
    }
    setLoading(false);
  };

  const openMap = () => {
    const url = booking.lat && booking.lng
      ? `https://maps.google.com/?q=${booking.lat},${booking.lng}`
      : `https://maps.google.com/?q=${encodeURIComponent(booking.addressFull || '')}`;
    Linking.openURL(url);
  };

  const isConfirmed = booking.status === 'confirmed';
  const isInProgress = booking.status === 'in_progress';
  const isCompleted = booking.status === 'completed';
  const isCancelled = booking.status === 'cancelled' || booking.status === 'cancellation_pending';

  return (
    <View style={styles.container}>
      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Job Detail</Text>
        {(isConfirmed || isInProgress) && (
          <TouchableOpacity onPress={() => navigation.navigate('Chat', { booking })} style={styles.chatBtn}>
            <Ionicons name="chatbubble-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header Card */}
        <Card style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.bookingNum}>#{booking.bookingNumber}</Text>
              <Text style={styles.serviceName}>{booking.serviceName}</Text>
            </View>
            <Badge status={booking.status} label={booking.status} />
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.infoText}>{booking.customerName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.infoText}>{formatDate(booking.scheduledAt)}</Text>
          </View>
          {booking.addressLine && (
            <TouchableOpacity style={styles.infoRow} onPress={openMap}>
              <Ionicons name="location-outline" size={16} color={Colors.primary} />
              <Text style={[styles.infoText, { color: Colors.primary, flex: 1 }]}>
                {booking.addressFull || booking.addressLine}
              </Text>
              <Ionicons name="open-outline" size={14} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </Card>

        {/* OTP Section */}
        {isConfirmed && (
          <Card style={styles.otpCard}>
            <Text style={styles.sectionTitle}>Start OTP</Text>
            <Text style={styles.otpHint}>Share this OTP with customer to start the job</Text>
            <View style={styles.otpDisplay}>
              <Text style={styles.otpBig}>{booking.startOtp || '——'}</Text>
            </View>
            <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Enter Customer OTP to Start</Text>
            <TextInput
              style={styles.otpInput}
              placeholder="Enter 6-digit OTP"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
              placeholderTextColor={Colors.textTertiary}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Button
              label="Start Job"
              onPress={() => handleStatusChange('in_progress')}
              loading={loading}
              fullWidth
              style={{ marginTop: Spacing.md }}
            />
          </Card>
        )}

        {isInProgress && (
          <>
            <Card style={styles.otpCard}>
              <Text style={styles.sectionTitle}>Completion OTP</Text>
              <Text style={styles.otpHint}>Share this OTP with customer to complete the job</Text>
              <View style={styles.otpDisplay}>
                <Text style={styles.otpBig}>{booking.completionOtp || '——'}</Text>
              </View>
              <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Enter OTP to Complete</Text>
              <TextInput
                style={styles.otpInput}
                placeholder="Enter 6-digit OTP"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
                placeholderTextColor={Colors.textTertiary}
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <Button
                label="Complete Job"
                onPress={() => handleStatusChange('completed')}
                loading={loading}
                fullWidth
                style={{ marginTop: Spacing.md }}
              />
            </Card>

            {/* Media Upload */}
            <Card>
              <Text style={styles.sectionTitle}>Job Photos</Text>
              <View style={styles.mediaRow}>
                <TouchableOpacity
                  style={styles.mediaBtn}
                  onPress={() => { setMediaPhase('before'); setMediaModal(true); }}
                >
                  <Ionicons name="camera" size={20} color={Colors.primary} />
                  <Text style={styles.mediaBtnText}>Before Photos ({booking.beforeMedia?.length || 0})</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.mediaBtn}
                  onPress={() => { setMediaPhase('after'); setMediaModal(true); }}
                >
                  <Ionicons name="camera" size={20} color={Colors.success} />
                  <Text style={[styles.mediaBtnText, { color: Colors.success }]}>After Photos ({booking.afterMedia?.length || 0})</Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* Additional Charges */}
            <Card>
              <View style={styles.chargesHeader}>
                <Text style={styles.sectionTitle}>Additional Charges</Text>
                <TouchableOpacity onPress={() => setChargesModal(true)}>
                  <Text style={styles.viewCharges}>View</Text>
                </TouchableOpacity>
              </View>
              {charges && (
                <View style={styles.chargesSummary}>
                  <Text style={styles.chargesStat}>
                    {charges.pending.length} pending • {charges.approved.length} approved
                  </Text>
                  {charges.total > 0 && (
                    <Text style={styles.chargesTotal}>Total: {formatCurrency(charges.total)}</Text>
                  )}
                </View>
              )}
              <Text style={styles.chargesNote}>Customer approves before payment is charged</Text>
              <Button
                label="Add Charges"
                onPress={() => setAddChargeModal(true)}
                variant="outline"
                size="sm"
                style={{ marginTop: Spacing.sm }}
              />
            </Card>
          </>
        )}

        {/* Completed */}
        {isCompleted && (
          <Card style={{ borderLeftWidth: 3, borderLeftColor: Colors.success }}>
            <View style={styles.completedRow}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
              <Text style={styles.completedText}>Job Completed</Text>
            </View>
            {booking.warrantyExpiresAt && (
              <View style={styles.warrantyRow}>
                <Ionicons name="shield-checkmark-outline" size={16} color={Colors.primary} />
                <Text style={styles.warrantyText}>
                  {booking.warrantyClaimed
                    ? 'Warranty Claimed'
                    : `Warranty till ${formatDateOnly(booking.warrantyExpiresAt)}`}
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Cancelled */}
        {isCancelled && (
          <Card style={{ borderLeftWidth: 3, borderLeftColor: Colors.error }}>
            <View style={styles.completedRow}>
              <Ionicons name="close-circle" size={24} color={Colors.error} />
              <Text style={[styles.completedText, { color: Colors.error }]}>Job Cancelled</Text>
            </View>
          </Card>
        )}

        {/* Payment Summary */}
        <Card>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          <View style={styles.payRow}>
            <Text style={styles.payLabel}>Job Value</Text>
            <Text style={styles.payValue}>{formatCurrency(booking.total)}</Text>
          </View>
          {booking.additionalChargesTotal > 0 && (
            <View style={styles.payRow}>
              <Text style={styles.payLabel}>Additional Charges</Text>
              <Text style={styles.payValue}>{formatCurrency(booking.additionalChargesTotal)}</Text>
            </View>
          )}
          <View style={[styles.payRow, styles.payTotal]}>
            <Text style={styles.payTotalLabel}>Total</Text>
            <Text style={styles.payTotalValue}>{formatCurrency(booking.finalTotal || booking.total)}</Text>
          </View>
          <View style={styles.payMethodRow}>
            <Text style={styles.payLabel}>Payment</Text>
            <Text style={styles.payValue}>
              {booking.paymentMethod === 'pay_later' ? 'Cash / Pay Later' : 'Paid Online'}
            </Text>
          </View>
        </Card>
      </ScrollView>

      {/* Media Upload Modal */}
      <Modal visible={mediaModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{mediaPhase === 'before' ? 'Before' : 'After'} Photos</Text>
            <Text style={styles.modalSubtitle}>Upload up to 3 photos/videos</Text>

            {selectedMedia.map((m, i) => (
              <View key={i} style={styles.mediaPreview}>
                <Image source={{ uri: m.dataUrl }} style={styles.mediaThumb} />
                <Text style={styles.mediaPreviewLabel}>{m.label}</Text>
                <TouchableOpacity onPress={() => setSelectedMedia((prev) => prev.filter((_, idx) => idx !== i))}>
                  <Ionicons name="close-circle" size={20} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ))}

            {selectedMedia.length < 3 && (
              <>
                <TextInput
                  style={styles.otpInput}
                  placeholder="Photo label (e.g. Kitchen sink)"
                  value={mediaLabel}
                  onChangeText={setMediaLabel}
                  placeholderTextColor={Colors.textTertiary}
                />
                <Button label="Pick Photo/Video" onPress={pickMedia} variant="outline" fullWidth />
              </>
            )}

            <View style={styles.modalActions}>
              <Button label="Cancel" onPress={() => { setMediaModal(false); setSelectedMedia([]); }} variant="ghost" />
              <Button label="Upload" onPress={submitMedia} loading={loading} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Charge Modal */}
      <Modal visible={addChargeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Add Charges</Text>
              {newCharges.map((c, i) => (
                <View key={i} style={styles.chargeItem}>
                  <TextInput
                    style={styles.otpInput}
                    placeholder="Description (e.g. Extra parts)"
                    value={c.description}
                    onChangeText={(v) => setNewCharges((prev) => prev.map((x, idx) => idx === i ? { ...x, description: v } : x))}
                    placeholderTextColor={Colors.textTertiary}
                  />
                  <TextInput
                    style={styles.otpInput}
                    placeholder="Amount (₹)"
                    keyboardType="decimal-pad"
                    value={c.amount}
                    onChangeText={(v) => setNewCharges((prev) => prev.map((x, idx) => idx === i ? { ...x, amount: v } : x))}
                    placeholderTextColor={Colors.textTertiary}
                  />
                  <View style={styles.categoryRow}>
                    {CHARGE_CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.catChip, c.category === cat && styles.catChipActive]}
                        onPress={() => setNewCharges((prev) => prev.map((x, idx) => idx === i ? { ...x, category: cat } : x))}
                      >
                        <Text style={[styles.catText, c.category === cat && styles.catTextActive]}>
                          {cat.replace('_', ' ')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
              {newCharges.length < 5 && (
                <TouchableOpacity
                  onPress={() => setNewCharges((prev) => [...prev, { description: '', amount: '', category: 'materials' }])}
                  style={styles.addMoreBtn}
                >
                  <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                  <Text style={styles.addMoreText}>Add Another</Text>
                </TouchableOpacity>
              )}
              <View style={styles.modalActions}>
                <Button label="Cancel" onPress={() => setAddChargeModal(false)} variant="ghost" />
                <Button label="Submit" onPress={submitCharges} loading={loading} />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* View Charges Modal */}
      <Modal visible={chargesModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Charges Breakdown</Text>
            {charges && (
              <>
                {charges.pending.length > 0 && (
                  <View>
                    <Text style={styles.chargesGroup}>Pending Approval</Text>
                    {charges.pending.map((c) => (
                      <View key={c._id} style={styles.chargeRow}>
                        <Text style={styles.chargeName}>{c.description}</Text>
                        <Text style={styles.chargeAmt}>{formatCurrency(c.amount)}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {charges.approved.length > 0 && (
                  <View>
                    <Text style={[styles.chargesGroup, { color: Colors.success }]}>Approved</Text>
                    {charges.approved.map((c) => (
                      <View key={c._id} style={styles.chargeRow}>
                        <Text style={styles.chargeName}>{c.description}</Text>
                        <Text style={[styles.chargeAmt, { color: Colors.success }]}>{formatCurrency(c.amount)}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <View style={[styles.chargeRow, { borderTopWidth: 1, borderTopColor: Colors.divider, marginTop: 8, paddingTop: 8 }]}>
                  <Text style={{ fontWeight: '700', color: Colors.textPrimary }}>Total</Text>
                  <Text style={{ fontWeight: '800', fontSize: 16, color: Colors.textPrimary }}>{formatCurrency(charges.total)}</Text>
                </View>
              </>
            )}
            <Button label="Close" onPress={() => setChargesModal(false)} variant="outline" fullWidth style={{ marginTop: Spacing.lg }} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingTop: 56, paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  backBtn: { padding: 4 },
  navTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  chatBtn: { padding: 4 },
  scroll: { padding: Spacing.xl, gap: Spacing.md, paddingBottom: 40 },
  headerCard: {},
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  bookingNum: { fontSize: 11, color: Colors.textTertiary, marginBottom: 2 },
  serviceName: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  infoText: { fontSize: 14, color: Colors.textSecondary, flex: 1 },
  otpCard: {},
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  otpHint: { fontSize: 12, color: Colors.textSecondary, marginBottom: Spacing.md },
  otpDisplay: {
    backgroundColor: Colors.primaryBg, borderRadius: BorderRadius.md,
    padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.md,
  },
  otpBig: { fontSize: 32, fontWeight: '800', color: Colors.primary, letterSpacing: 6 },
  otpInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: 12, fontSize: 16,
    color: Colors.textPrimary, marginBottom: Spacing.sm, backgroundColor: Colors.surface,
  },
  errorText: { fontSize: 13, color: Colors.error, marginBottom: 8 },
  mediaRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  mediaBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primaryBg, padding: Spacing.md, borderRadius: BorderRadius.md,
  },
  mediaBtnText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  chargesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  viewCharges: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  chargesSummary: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chargesStat: { fontSize: 13, color: Colors.textSecondary },
  chargesTotal: { fontSize: 13, fontWeight: '700', color: Colors.success },
  chargesNote: { fontSize: 11, color: Colors.textTertiary, marginBottom: Spacing.sm, fontStyle: 'italic' },
  completedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  completedText: { fontSize: 16, fontWeight: '700', color: Colors.success },
  warrantyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm },
  warrantyText: { fontSize: 13, color: Colors.primary },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  payLabel: { fontSize: 14, color: Colors.textSecondary },
  payValue: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  payTotal: { borderTopWidth: 1, borderTopColor: Colors.divider, marginTop: 4 },
  payTotalLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  payTotalValue: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  payMethodRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6, marginTop: 4, borderTopWidth: 1, borderTopColor: Colors.divider },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.xl, paddingBottom: 40, minHeight: 300,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: Colors.gray300, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.lg },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md, marginTop: Spacing.lg },
  mediaPreview: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Spacing.sm },
  mediaThumb: { width: 60, height: 60, borderRadius: 8, backgroundColor: Colors.gray100 },
  mediaPreviewLabel: { flex: 1, fontSize: 13, color: Colors.textPrimary },
  chargeItem: { marginBottom: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.sm },
  catChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100, borderWidth: 1, borderColor: Colors.border,
  },
  catChipActive: { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
  catText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600' },
  catTextActive: { color: Colors.primary },
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.md },
  addMoreText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  chargesGroup: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6, marginTop: Spacing.sm },
  chargeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  chargeName: { fontSize: 14, color: Colors.textPrimary, flex: 1 },
  chargeAmt: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
});
