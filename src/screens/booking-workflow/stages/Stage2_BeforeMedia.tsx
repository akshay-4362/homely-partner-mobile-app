/**
 * Stage 2: Before Service — Parallel Charges + Photos
 * Technician can do charges and photos in any order.
 * Both tasks shown as a checklist. Continue when both done + no pending charges.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  Modal,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, Typography } from '../../../theme/colors';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { formatCurrency } from '../../../utils/format';
import { StageComponentProps, MediaItem } from '../types';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { bookingApi } from '../../../api/bookingApi';
import { useSocket } from '../../../hooks/useSocket';
import { updateProBookingStatus } from '../../../store/bookingSlice';
import {
  setCloseJobMode,
} from '../../../store/booking-workflow/bookingWorkflowSlice';
import { UploadableMedia } from '../../../utils/mediaUtils';

export const Stage2_BeforeMedia: React.FC<StageComponentProps> = ({
  booking,
  charges,
  onStageComplete,
  onError,
}) => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const socket = useSocket();

  const [localCharges, setLocalCharges] = useState(charges);
  const [loadingCharges, setLoadingCharges] = useState(false);
  const [mediaJustUploaded, setMediaJustUploaded] = useState(false);

  // Charge modals
  const [addChargeModal, setAddChargeModal] = useState(false);
  const [newCharges, setNewCharges] = useState([{ description: '', amount: '', category: 'materials' }]);
  const [editingCharge, setEditingCharge] = useState<any>(null);
  const [editChargeModal, setEditChargeModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Close job
  const [closeJobModal, setCloseJobModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [closingJob, setClosingJob] = useState(false);

  const CLOSE_JOB_REASONS = [
    'Service not provided by Eazyhomes4u',
    'Spare parts not available for appliance',
    'Product damaged/Unserviceable',
    'Nothing wrong with appliance',
    'Other Reason',
  ];

  // Sync charges from parent
  useEffect(() => { setLocalCharges(charges); }, [charges]);

  // Derived state
  const beforeMediaUploaded = (booking.beforeMedia?.length || 0) > 0 || mediaJustUploaded;
  const hasCharges = (localCharges.pending?.length || 0) > 0 || (localCharges.approved?.length || 0) > 0;
  const hasPendingCharges = (localCharges.pending?.length || 0) > 0;
  const allChargesApproved = hasCharges && !hasPendingCharges;

  // Can continue when: photos uploaded AND no pending charges
  const canContinue = beforeMediaUploaded && !hasPendingCharges;

  // ── Charges Logic ──

  const loadCharges = async (silent = false) => {
    if (!silent) setLoadingCharges(true);
    try {
      const data = await bookingApi.getCharges(booking.id);
      setLocalCharges(data?.data || data);
    } catch (error) {
      console.error('Failed to load charges:', error);
    }
    if (!silent) setLoadingCharges(false);
  };

  useEffect(() => {
    const hasExistingData = localCharges.pending.length > 0 || localCharges.approved.length > 0;
    loadCharges(!hasExistingData ? false : true);

    let pollInterval: NodeJS.Timeout | null = null;
    if (hasPendingCharges) {
      pollInterval = setInterval(() => loadCharges(true), 5000);
    }

    let handleChargeApproved: ((data: any) => void) | null = null;
    let handleChargeRejected: ((data: any) => void) | null = null;

    if (socket) {
      handleChargeApproved = (data: any) => {
        if (data.bookingId === booking.id) {
          loadCharges();
          Alert.alert('Charge Approved! ✅', `Customer approved ₹${data.charge?.amount} for ${data.charge?.description}`);
        }
      };
      handleChargeRejected = (data: any) => {
        if (data.bookingId === booking.id) {
          loadCharges();
          Alert.alert('Charge Rejected ❌', `Customer rejected ₹${data.charge?.amount} for ${data.charge?.description}`);
        }
      };
      socket.on('charge_approved', handleChargeApproved);
      socket.on('charge_rejected', handleChargeRejected);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (socket && handleChargeApproved) socket.off('charge_approved', handleChargeApproved);
      if (socket && handleChargeRejected) socket.off('charge_rejected', handleChargeRejected);
    };
  }, [booking.id, socket, hasPendingCharges]);

  const submitCharges = async () => {
    const valid = newCharges.filter((c) => c.description && parseFloat(c.amount) > 0);
    if (valid.length === 0) { Alert.alert('Error', 'Add at least one valid charge'); return; }
    setSubmitting(true);
    try {
      await bookingApi.addCharges(booking.id, valid.map((c) => ({
        description: c.description, amount: parseFloat(c.amount), category: c.category,
      })));
      await loadCharges();
      Alert.alert('Success', 'Charges added. Customer will be notified.');
      setAddChargeModal(false);
      setNewCharges([{ description: '', amount: '', category: 'materials' }]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to add charges');
    }
    setSubmitting(false);
  };

  const updateCharge = async () => {
    if (!editingCharge.description || parseFloat(editingCharge.amount) <= 0) {
      Alert.alert('Error', 'Provide valid description and amount'); return;
    }
    setSubmitting(true);
    try {
      await bookingApi.updateCharge(booking.id, editingCharge.id, {
        description: editingCharge.description, amount: parseFloat(editingCharge.amount), category: editingCharge.category,
      });
      await loadCharges();
      Alert.alert('Success', 'Charge updated');
      setEditChargeModal(false);
      setEditingCharge(null);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update');
    }
    setSubmitting(false);
  };

  const handleDeleteCharge = (chargeId: string, description: string) => {
    Alert.alert('Remove Charge', `Remove "${description}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          setLoadingCharges(true);
          try {
            await bookingApi.deleteCharge(booking.id, chargeId);
            await loadCharges();
          } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.message || 'Failed to remove');
          }
          setLoadingCharges(false);
        },
      },
    ]);
  };

  const handleEditCharge = (charge: any) => {
    setEditingCharge({ id: charge._id, description: charge.description, amount: charge.amount.toString(), category: charge.category || 'materials' });
    setEditChargeModal(true);
  };

  // ── Media Logic ──

  const openMediaFlow = () => {
    navigation.navigate('MediaReview', {
      phase: 'before',
      bookingId: booking.id,
      existingMedia: booking.beforeMedia || [],
      pendingMedia: [],
      onUploadComplete: () => setMediaJustUploaded(true),
    });
  };

  // ── Close Job ──

  const handleCloseJobSubmit = async () => {
    const finalReason = selectedReason === 'Other Reason' ? customReason.trim() : selectedReason;
    if (!finalReason) { Alert.alert('Reason Required', 'Select or enter a reason'); return; }
    const alreadyPaid = !!booking.paidAt;
    if (alreadyPaid) {
      setClosingJob(true);
      try {
        await bookingApi.cancelBooking(booking.id, finalReason);
        setCloseJobModal(false);
        Alert.alert('Job Closed', 'Customer will be notified.', [{ text: 'OK', onPress: () => onStageComplete(5) }]);
      } catch (error: any) {
        Alert.alert('Error', error.response?.data?.message || 'Failed to close');
      }
      setClosingJob(false);
    } else {
      dispatch(setCloseJobMode({ reason: finalReason }));
      setCloseJobModal(false);
      onStageComplete(4);
    }
  };

  // ── Render ──

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Checklist Header */}
      <View style={styles.checklistHeader}>
        <Text style={styles.checklistTitle}>Complete these before proceeding</Text>
        <Text style={styles.checklistSubtitle}>Do them in any order</Text>
      </View>

      {/* ── Task 1: Photos ── */}
      <TouchableOpacity
        style={[styles.taskCard, beforeMediaUploaded && styles.taskCardDone]}
        onPress={openMediaFlow}
        activeOpacity={0.7}
      >
        <View style={styles.taskIconWrap}>
          {beforeMediaUploaded ? (
            <Ionicons name="checkmark-circle" size={28} color={Colors.success} />
          ) : (
            <View style={styles.taskIconCircle}>
              <Ionicons name="camera" size={22} color={Colors.primary} />
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.taskTitle}>Before Service Photos</Text>
          <Text style={styles.taskSubtitle}>
            {beforeMediaUploaded
              ? `${booking.beforeMedia?.length || 0} photos uploaded ✓`
              : 'Tap to capture & upload photos'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
      </TouchableOpacity>

      {/* ── Task 2: Additional Parts ── */}
      <Card style={[styles.card, allChargesApproved && styles.cardDone]}>
        <View style={styles.chargesHeader}>
          <View style={styles.taskIconWrap}>
            {allChargesApproved ? (
              <Ionicons name="checkmark-circle" size={28} color={Colors.success} />
            ) : hasCharges ? (
              <Ionicons name="time" size={28} color={Colors.warning} />
            ) : (
              <View style={styles.taskIconCircle}>
                <Ionicons name="construct" size={22} color={Colors.primary} />
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.taskTitle}>Additional Parts</Text>
            <Text style={styles.taskSubtitle}>
              {!hasCharges
                ? 'Add parts/materials if needed'
                : hasPendingCharges
                  ? `${localCharges.pending.length} pending approval`
                  : `${localCharges.approved.length} approved`}
            </Text>
          </View>
          {hasPendingCharges && (
            <TouchableOpacity onPress={() => loadCharges(false)} style={styles.refreshBtn} disabled={loadingCharges}>
              <Ionicons name="refresh" size={18} color={loadingCharges ? Colors.textTertiary : Colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {loadingCharges ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <>
            {/* Pending Warning */}
            {hasPendingCharges && (
              <View style={styles.pendingBox}>
                <Ionicons name="time-outline" size={16} color={Colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pendingTitle}>Waiting for Customer Approval</Text>
                  <View style={styles.autoRefreshRow}>
                    <Ionicons name="sync" size={11} color={Colors.textTertiary} />
                    <Text style={styles.autoRefreshText}>Auto-checking every 5s</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Charges List */}
            {hasCharges && (
              <View style={styles.chargesList}>
                {localCharges.pending.map((charge, index) => (
                  <View key={`p-${index}`} style={styles.chargeRow}>
                    <Ionicons name="time-outline" size={14} color={Colors.warning} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.chargeDesc}>{charge.description}</Text>
                      <Text style={styles.chargeAmt}>{formatCurrency(charge.amount)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleEditCharge(charge)} style={styles.chargeAction}>
                      <Ionicons name="create-outline" size={16} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteCharge(charge._id, charge.description)} style={styles.chargeAction}>
                      <Ionicons name="trash-outline" size={16} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
                {localCharges.approved.map((charge, index) => (
                  <View key={`a-${index}`} style={styles.chargeRow}>
                    <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.chargeDesc}>{charge.description}</Text>
                      <Text style={styles.chargeAmt}>{formatCurrency(charge.amount)}</Text>
                    </View>
                    <View style={styles.approvedBadge}><Text style={styles.approvedBadgeText}>Approved</Text></View>
                  </View>
                ))}
              </View>
            )}

            {localCharges.total > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Approved:</Text>
                <Text style={styles.totalValue}>{formatCurrency(localCharges.total)}</Text>
              </View>
            )}

            <Button
              label={hasCharges ? 'Add More Parts' : 'Add Parts'}
              icon="add-circle-outline"
              variant={hasCharges ? 'outline' : 'primary'}
              onPress={() => setAddChargeModal(true)}
              fullWidth
              style={{ marginTop: Spacing.md }}
            />

            <View style={styles.infoNote}>
              <Ionicons name="information-circle-outline" size={13} color={Colors.primary} />
              <Text style={styles.infoText}>Customer must approve charges before you can proceed</Text>
            </View>
          </>
        )}
      </Card>

      {/* Navigation */}
      <View style={styles.navSection}>
        <View style={styles.navRow}>
          <Button label="Back" icon="arrow-back" onPress={() => onStageComplete(1)} variant="ghost" style={{ flex: 1 }} />
          <Button label="Next" icon="arrow-forward" onPress={() => { if (canContinue) onStageComplete(3); else {
            if (!beforeMediaUploaded) Alert.alert('Photos Required', 'Upload before photos first');
            else if (hasPendingCharges) Alert.alert('Approval Pending', 'Wait for customer to approve charges');
          }}} disabled={!canContinue} style={{ flex: 2 }} size="lg" />
        </View>
        {!canContinue && (
          <Text style={styles.navHint}>
            {!beforeMediaUploaded ? '📸 Upload before photos to continue' : '⏳ Waiting for charge approval...'}
          </Text>
        )}

        {/* No Work */}
        <View style={styles.noWorkSection}>
          <Text style={styles.noWorkHint}>If customer doesn't want to proceed:</Text>
          <TouchableOpacity style={styles.noWorkBtn} onPress={() => { setSelectedReason(''); setCustomReason(''); setCloseJobModal(true); }} activeOpacity={0.75}>
            <Ionicons name="ban-outline" size={20} color="#c0392b" />
            <Text style={styles.noWorkLabel}>No Work</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Close Job Modal ── */}
      <Modal visible={closeJobModal} animationType="slide" transparent onRequestClose={() => setCloseJobModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setCloseJobModal(false)}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Why is no work needed?</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
              {CLOSE_JOB_REASONS.map((reason) => (
                <TouchableOpacity key={reason} style={styles.reasonRow} onPress={() => setSelectedReason(reason)}>
                  <View style={styles.radioOuter}>{selectedReason === reason && <View style={styles.radioInner} />}</View>
                  <Text style={styles.reasonText}>{reason}</Text>
                </TouchableOpacity>
              ))}
              {selectedReason === 'Other Reason' && (
                <TextInput style={styles.otherInput} placeholder="Describe the reason..." value={customReason} onChangeText={setCustomReason} multiline numberOfLines={3} placeholderTextColor={Colors.textTertiary} />
              )}
            </ScrollView>
            {!booking.paidAt && (
              <View style={styles.paymentNotice}>
                <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
                <Text style={styles.paymentNoticeText}>Customer hasn't paid yet. You'll collect the visit fee first.</Text>
              </View>
            )}
            <Button
              label={closingJob ? 'Closing...' : booking.paidAt ? 'Close Job' : 'Continue to Payment'}
              icon={booking.paidAt ? 'checkmark-circle-outline' : 'card-outline'}
              onPress={handleCloseJobSubmit}
              loading={closingJob}
              disabled={!selectedReason || (selectedReason === 'Other Reason' && !customReason.trim())}
              fullWidth
              style={{ marginTop: Spacing.lg }}
            />
          </View>
        </View>
      </Modal>

      {/* ── Edit Charge Modal ── */}
      <Modal visible={editChargeModal} animationType="slide" transparent onRequestClose={() => setEditChargeModal(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView><View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Edit Charge</Text>
            <Text style={styles.fieldLabel}>Part/Material Description</Text>
            <TextInput style={styles.chargeInput} placeholder="e.g. Replaced water pump" value={editingCharge?.description || ''} onChangeText={(v) => setEditingCharge({ ...editingCharge, description: v })} placeholderTextColor={Colors.textTertiary} />
            <Text style={styles.fieldLabel}>Price</Text>
            <TextInput style={styles.chargeInput} placeholder="Amount (₹)" keyboardType="decimal-pad" value={editingCharge?.amount || ''} onChangeText={(v) => setEditingCharge({ ...editingCharge, amount: v })} placeholderTextColor={Colors.textTertiary} />
            <View style={styles.modalActions}>
              <Button label="Cancel" onPress={() => { setEditChargeModal(false); setEditingCharge(null); }} variant="ghost" />
              <Button label="Update" onPress={updateCharge} loading={submitting} />
            </View>
          </View></ScrollView>
        </View>
      </Modal>

      {/* ── Add Charge Modal ── */}
      <Modal visible={addChargeModal} animationType="slide" transparent onRequestClose={() => setAddChargeModal(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView><View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Add Parts & Materials</Text>
            {newCharges.map((c, i) => (
              <View key={i} style={styles.chargeItem}>
                <View style={styles.chargeItemHeader}>
                  <Text style={styles.fieldLabel}>Charge #{i + 1}</Text>
                  {newCharges.length > 1 && (
                    <TouchableOpacity onPress={() => setNewCharges((prev) => prev.filter((_, idx) => idx !== i))} style={styles.removeChargeBtn}>
                      <Ionicons name="trash-outline" size={16} color={Colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.fieldLabel}>Part/Material Description</Text>
                <TextInput style={styles.chargeInput} placeholder="e.g. Replaced water pump" value={c.description} onChangeText={(v) => setNewCharges((prev) => prev.map((x, idx) => idx === i ? { ...x, description: v } : x))} placeholderTextColor={Colors.textTertiary} />
                <Text style={styles.fieldLabel}>Price</Text>
                <TextInput style={styles.chargeInput} placeholder="Amount (₹)" keyboardType="decimal-pad" value={c.amount} onChangeText={(v) => setNewCharges((prev) => prev.map((x, idx) => idx === i ? { ...x, amount: v } : x))} placeholderTextColor={Colors.textTertiary} />
              </View>
            ))}
            {newCharges.length < 5 && (
              <TouchableOpacity onPress={() => setNewCharges((prev) => [...prev, { description: '', amount: '', category: 'materials' }])} style={styles.addMoreBtn}>
                <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                <Text style={styles.addMoreText}>Add Part</Text>
              </TouchableOpacity>
            )}
            <View style={styles.modalActions}>
              <Button label="Cancel" onPress={() => setAddChargeModal(false)} variant="ghost" />
              <Button label="Submit" onPress={submitCharges} loading={submitting} />
            </View>
          </View></ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Checklist header
  checklistHeader: { marginBottom: Spacing.lg },
  checklistTitle: { ...Typography.h3, color: Colors.textPrimary },
  checklistSubtitle: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },

  // Task cards
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  taskCardDone: { borderColor: Colors.success, backgroundColor: Colors.successBg },
  taskIconWrap: { width: 36, alignItems: 'center' },
  taskIconCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  taskTitle: { ...Typography.body, fontWeight: '700', color: Colors.textPrimary },
  taskSubtitle: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },

  // Card
  card: { marginBottom: Spacing.md },
  cardDone: { borderColor: Colors.success, borderWidth: 1.5 },

  // Charges header
  chargesHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  refreshBtn: { padding: Spacing.xs, borderRadius: BorderRadius.sm, backgroundColor: Colors.primaryBg },

  // Loading
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.lg },
  loadingText: { ...Typography.body, color: Colors.textSecondary },

  // Pending
  pendingBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    padding: Spacing.md, backgroundColor: Colors.warningBg,
    borderRadius: BorderRadius.md, marginBottom: Spacing.sm,
    borderLeftWidth: 3, borderLeftColor: Colors.warning,
  },
  pendingTitle: { ...Typography.body, fontWeight: '600', color: Colors.textPrimary },
  autoRefreshRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  autoRefreshText: { fontSize: 11, color: Colors.textTertiary, fontStyle: 'italic' },

  // Charges list
  chargesList: { gap: Spacing.xs, marginTop: Spacing.sm },
  chargeRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.sm, backgroundColor: Colors.background, borderRadius: BorderRadius.md,
  },
  chargeDesc: { ...Typography.body, color: Colors.textPrimary },
  chargeAmt: { ...Typography.caption, fontWeight: '600', color: Colors.textSecondary },
  chargeAction: { padding: Spacing.xs },
  approvedBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, backgroundColor: Colors.successBg, borderRadius: BorderRadius.sm },
  approvedBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.success },

  // Total
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: Spacing.md, padding: Spacing.md,
    backgroundColor: Colors.successBg, borderRadius: BorderRadius.md,
  },
  totalLabel: { ...Typography.body, fontWeight: '600', color: Colors.textPrimary },
  totalValue: { ...Typography.h4, color: Colors.success },

  // Info
  infoNote: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs, marginTop: Spacing.sm, padding: Spacing.sm, backgroundColor: Colors.primaryBg, borderRadius: BorderRadius.sm },
  infoText: { ...Typography.bodySmall, color: Colors.textSecondary, flex: 1 },

  // Navigation
  navSection: { marginTop: Spacing.lg, marginBottom: Spacing.xxl },
  navRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm },
  navHint: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm },

  // No work
  noWorkSection: {
    marginTop: Spacing.xl, padding: Spacing.md,
    backgroundColor: Colors.surfaceAlt, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  noWorkHint: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.sm },
  noWorkBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: '#e74c3c',
    backgroundColor: '#fff5f5',
  },
  noWorkLabel: { fontSize: 15, fontWeight: '700', color: '#c0392b', letterSpacing: 0.3 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.xl, paddingBottom: Platform.OS === 'ios' ? 100 : 80, minHeight: 300,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: Colors.gray300, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg },
  modalTitle: { ...Typography.h3, color: Colors.textPrimary, marginBottom: Spacing.lg },
  modalCloseBtn: { position: 'absolute', top: Spacing.lg, right: Spacing.xl, padding: 4 },
  fieldLabel: { ...Typography.caption, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.xs },
  chargeInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    fontSize: 16, color: Colors.textPrimary, backgroundColor: Colors.surface, marginBottom: Spacing.sm,
  },
  chargeItem: { marginBottom: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  chargeItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  removeChargeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm, backgroundColor: Colors.errorBg },
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  addMoreText: { ...Typography.body, color: Colors.primary, fontWeight: '600' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md, marginTop: Spacing.lg },

  // Reason modal
  reasonRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.divider, gap: Spacing.md },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 11, height: 11, borderRadius: 6, backgroundColor: Colors.primary },
  reasonText: { ...Typography.body, color: Colors.textPrimary, flex: 1 },
  otherInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    fontSize: 15, color: Colors.textPrimary, backgroundColor: Colors.surface,
    marginTop: Spacing.md, textAlignVertical: 'top',
  },
  paymentNotice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    padding: Spacing.md, backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.md, marginTop: Spacing.lg,
  },
  paymentNoticeText: { ...Typography.caption, color: Colors.primary, flex: 1, lineHeight: 18 },
});
