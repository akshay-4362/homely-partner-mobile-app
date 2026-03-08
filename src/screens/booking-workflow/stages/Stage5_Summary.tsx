/**
 * Stage 5: Job Summary (Completion)
 * Display job summary, media, payment details, and rating option
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, Typography } from '../../../theme/colors';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { formatCurrency, formatDate, formatDateOnly } from '../../../utils/format';
import { StageComponentProps } from '../types';
import { RateCustomerModal } from '../../../components/RateCustomerModal';
import { bookingApi } from '../../../api/bookingApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const Stage5_Summary: React.FC<StageComponentProps> = ({
  booking,
  charges,
}) => {
  const navigation = useNavigation<any>();

  const [showRatingModal, setShowRatingModal] = useState(false);
  const [fullImageUri, setFullImageUri] = useState<string | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  // Calculate earnings
  const baseCharge = booking.total;
  const approvedChargesTotal = charges.approved.reduce((sum, c) => sum + c.amount, 0);
  const totalEarnings = booking.finalTotal || (baseCharge + approvedChargesTotal);
  const platformFee = booking.creditDeducted || 0;
  const netPayout = totalEarnings - platformFee;

  /**
   * View full-screen image
   */
  const viewFullImage = (uri: string) => {
    setFullImageUri(uri);
  };

  /**
   * Fetch and display invoice
   */
  const viewInvoice = async () => {
    setShowInvoice(true);
    if (invoiceData) return; // already loaded
    setInvoiceLoading(true);
    try {
      const data = await bookingApi.getInvoice(booking.id);
      setInvoiceData(data);
    } catch (err: any) {
      setShowInvoice(false);
      Alert.alert('Error', err?.response?.data?.message || 'Could not load invoice');
    } finally {
      setInvoiceLoading(false);
    }
  };

  /**
   * Navigate back to jobs list
   */
  const goBackToJobs = () => {
    navigation.navigate('MainTabs', { screen: 'Jobs' });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Success Banner */}
      <View style={styles.successBanner}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
        </View>
        <Text style={styles.successTitle}>Job Completed!</Text>
        <Text style={styles.successSubtitle}>Invoice has been generated</Text>
      </View>

      {/* Job Details Card */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Job Details</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Service:</Text>
          <Text style={styles.detailValue}>{booking.serviceName}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Customer:</Text>
          <Text style={styles.detailValue}>{booking.customerName}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Completed:</Text>
          <Text style={styles.detailValue}>{formatDate(booking.scheduledAt)}</Text>
        </View>

        <View style={styles.divider} />

        {/* Earnings Breakdown */}
        <View style={styles.earningsBox}>
          <View style={styles.earningsRow}>
            <Text style={styles.earningsLabel}>Total Earnings:</Text>
            <Text style={styles.earningsValue}>{formatCurrency(totalEarnings)}</Text>
          </View>

          {platformFee > 0 && (
            <View style={styles.earningsRow}>
              <Text style={styles.earningsLabel}>Platform Fee:</Text>
              <Text style={[styles.earningsValue, { color: Colors.error }]}>
                -{formatCurrency(platformFee)}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.earningsRow}>
            <Text style={styles.netPayoutLabel}>Net Payout:</Text>
            <Text style={styles.netPayoutValue}>{formatCurrency(netPayout)}</Text>
          </View>
        </View>
      </Card>

      {/* Media Gallery Card */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Before & After Photos</Text>

        {/* Before Photos */}
        {booking.beforeMedia && booking.beforeMedia.length > 0 && (
          <View style={styles.mediaSection}>
            <View style={styles.mediaSectionHeader}>
              <Text style={styles.mediaSectionTitle}>
                Before ({booking.beforeMedia.length} photos)
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.mediaScroll}
            >
              {booking.beforeMedia.map((media, index) => (
                <TouchableOpacity
                  key={`before-${index}`}
                  style={styles.mediaThumbnail}
                  onPress={() => viewFullImage(media.dataUrl)}
                >
                  <Image source={{ uri: media.dataUrl }} style={styles.thumbnailImage} />
                  <View style={styles.mediaTypeIndicator}>
                    <Text>{media.type === 'video' ? '🎥' : '📷'}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* After Photos */}
        {booking.afterMedia && booking.afterMedia.length > 0 && (
          <View style={styles.mediaSection}>
            <View style={styles.mediaSectionHeader}>
              <Text style={styles.mediaSectionTitle}>
                After ({booking.afterMedia.length} photos)
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.mediaScroll}
            >
              {booking.afterMedia.map((media, index) => (
                <TouchableOpacity
                  key={`after-${index}`}
                  style={styles.mediaThumbnail}
                  onPress={() => viewFullImage(media.dataUrl)}
                >
                  <Image source={{ uri: media.dataUrl }} style={styles.thumbnailImage} />
                  <View style={styles.mediaTypeIndicator}>
                    <Text>{media.type === 'video' ? '🎥' : '📷'}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </Card>

      {/* Payment Details Card */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Payment Details</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Method:</Text>
          <Text style={styles.detailValue}>
            {booking.paymentMethod === 'pay_now' ? 'Online (UPI)' : 'Cash / Pay Later'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount:</Text>
          <Text style={styles.detailValue}>{formatCurrency(totalEarnings)}</Text>
        </View>

        {booking.paidAt && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Paid at:</Text>
            <Text style={styles.detailValue}>{formatDate(booking.paidAt)}</Text>
          </View>
        )}

        <View style={styles.paymentStatus}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
          <Text style={styles.paymentStatusText}>Payment Received</Text>
        </View>
      </Card>

      {/* Warranty Card */}
      {booking.warrantyExpiresAt && !booking.warrantyClaimed && (
        <Card style={styles.warrantyCard}>
          <View style={styles.warrantyRow}>
            <Ionicons name="shield-checkmark" size={24} color={Colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.warrantyTitle}>30-Day Warranty Active</Text>
              <Text style={styles.warrantySubtitle}>
                Valid till: {formatDateOnly(booking.warrantyExpiresAt)}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          label="Rate This Customer"
          icon="star"
          variant="primary"
          onPress={() => setShowRatingModal(true)}
          fullWidth
          style={{ marginBottom: Spacing.md }}
        />

        <Button
          label="View Invoice"
          icon="document-text"
          variant="outline"
          onPress={viewInvoice}
          fullWidth
          style={{ marginBottom: Spacing.md }}
        />

        <Button
          label="Back to Jobs"
          icon="arrow-back"
          variant="ghost"
          onPress={goBackToJobs}
          fullWidth
        />
      </View>

      {/* Invoice Modal */}
      <Modal
        visible={showInvoice}
        animationType="slide"
        transparent
        onRequestClose={() => setShowInvoice(false)}
      >
        <View style={styles.invoiceOverlay}>
          <View style={styles.invoiceSheet}>
            {/* Header */}
            <View style={styles.invoiceHeader}>
              <Text style={styles.invoiceHeaderTitle}>Invoice</Text>
              <TouchableOpacity onPress={() => setShowInvoice(false)} style={styles.invoiceCloseBtn}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {invoiceLoading ? (
              <View style={styles.invoiceLoader}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.invoiceLoaderText}>Loading invoice...</Text>
              </View>
            ) : invoiceData ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.invoiceContent}>
                {/* Invoice Number & Date */}
                <View style={styles.invoiceMeta}>
                  <Text style={styles.invoiceNumber}>#{invoiceData.invoiceNumber}</Text>
                  <Text style={styles.invoiceDate}>{invoiceData.invoiceDate}</Text>
                </View>

                {/* From / To */}
                <View style={styles.invoiceParties}>
                  <View style={styles.invoiceParty}>
                    <Text style={styles.invoicePartyLabel}>FROM</Text>
                    <Text style={styles.invoicePartyName}>{invoiceData.business?.name}</Text>
                    <Text style={styles.invoicePartyDetail}>{invoiceData.professional?.name}</Text>
                    <Text style={styles.invoicePartyDetail}>{invoiceData.professional?.phone}</Text>
                  </View>
                  <View style={[styles.invoiceParty, { alignItems: 'flex-end' }]}>
                    <Text style={styles.invoicePartyLabel}>TO</Text>
                    <Text style={styles.invoicePartyName}>{invoiceData.customer?.name}</Text>
                    <Text style={styles.invoicePartyDetail}>{invoiceData.customer?.phone}</Text>
                    <Text style={styles.invoicePartyDetail}>{invoiceData.customer?.address?.city}</Text>
                  </View>
                </View>

                {/* Service Info */}
                <View style={styles.invoiceSection}>
                  <Text style={styles.invoiceSectionTitle}>Service Details</Text>
                  <View style={styles.invoiceRow}>
                    <Text style={styles.invoiceRowLabel}>Service</Text>
                    <Text style={styles.invoiceRowValue}>{invoiceData.booking?.serviceName}</Text>
                  </View>
                  <View style={styles.invoiceRow}>
                    <Text style={styles.invoiceRowLabel}>Booking #</Text>
                    <Text style={styles.invoiceRowValue}>{invoiceData.booking?.bookingNumber}</Text>
                  </View>
                  <View style={styles.invoiceRow}>
                    <Text style={styles.invoiceRowLabel}>Completed</Text>
                    <Text style={styles.invoiceRowValue}>{invoiceData.booking?.completedAt}</Text>
                  </View>
                </View>

                {/* Line Items */}
                <View style={styles.invoiceSection}>
                  <Text style={styles.invoiceSectionTitle}>Items</Text>
                  {(invoiceData.items || []).map((item: any, i: number) => (
                    <View key={i} style={styles.invoiceItem}>
                      <Text style={styles.invoiceItemDesc} numberOfLines={2}>{item.description}</Text>
                      <Text style={styles.invoiceItemAmt}>{formatCurrency(item.total)}</Text>
                    </View>
                  ))}
                </View>

                {/* Totals */}
                <View style={styles.invoiceTotals}>
                  <View style={styles.invoiceRow}>
                    <Text style={styles.invoiceRowLabel}>Subtotal</Text>
                    <Text style={styles.invoiceRowValue}>{formatCurrency(invoiceData.subtotal)}</Text>
                  </View>
                  {invoiceData.tax > 0 && (
                    <View style={styles.invoiceRow}>
                      <Text style={styles.invoiceRowLabel}>Tax ({invoiceData.taxRate}%)</Text>
                      <Text style={styles.invoiceRowValue}>{formatCurrency(invoiceData.tax)}</Text>
                    </View>
                  )}
                  <View style={styles.invoiceDivider} />
                  <View style={styles.invoiceRow}>
                    <Text style={styles.invoiceTotalLabel}>Total</Text>
                    <Text style={styles.invoiceTotalValue}>{formatCurrency(invoiceData.grandTotal)}</Text>
                  </View>
                </View>

                {/* Payment Status */}
                <View style={styles.invoicePaymentRow}>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                  <Text style={styles.invoicePaymentText}>
                    Paid via {invoiceData.payment?.method || 'Cash'}
                  </Text>
                </View>

                {invoiceData.notes && (
                  <Text style={styles.invoiceNotes}>{invoiceData.notes}</Text>
                )}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Rate Customer Modal */}
      <RateCustomerModal
        visible={showRatingModal}
        bookingId={booking.id}
        customerName={booking.customerName}
        onClose={() => setShowRatingModal(false)}
        onSuccess={() => {
          setShowRatingModal(false);
          goBackToJobs();
        }}
      />

      {/* Full-Screen Image Viewer */}
      <Modal
        visible={!!fullImageUri}
        transparent
        animationType="fade"
        onRequestClose={() => setFullImageUri(null)}
      >
        <View style={styles.imageViewerOverlay}>
          <TouchableOpacity
            style={styles.imageViewerClose}
            onPress={() => setFullImageUri(null)}
          >
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>
          {fullImageUri && (
            <Image
              source={{ uri: fullImageUri }}
              style={styles.imageViewerImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  successBanner: {
    alignItems: 'center',
    padding: Spacing.xxl,
    backgroundColor: Colors.successBg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },

  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  successTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },

  successSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },

  card: {
    marginBottom: Spacing.md,
  },

  sectionTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },

  detailLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
  },

  detailValue: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'right',
    flex: 1,
    marginLeft: Spacing.md,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.md,
  },

  earningsBox: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },

  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },

  earningsLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
  },

  earningsValue: {
    ...Typography.h4,
    color: Colors.textPrimary,
  },

  netPayoutLabel: {
    ...Typography.h4,
    color: Colors.textPrimary,
  },

  netPayoutValue: {
    ...Typography.h3,
    color: Colors.success,
  },

  mediaSection: {
    marginTop: Spacing.md,
  },

  mediaSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },

  mediaSectionTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  mediaScroll: {
    marginHorizontal: -Spacing.md,
    paddingHorizontal: Spacing.md,
  },

  mediaThumbnail: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginRight: Spacing.sm,
    backgroundColor: Colors.gray100,
    position: 'relative',
  },

  thumbnailImage: {
    width: '100%',
    height: '100%',
  },

  mediaTypeIndicator: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    fontSize: 16,
  },

  paymentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.successBg,
    borderRadius: BorderRadius.md,
  },

  paymentStatusText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.success,
  },

  warrantyCard: {
    backgroundColor: Colors.primaryBg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },

  warrantyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },

  warrantyTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  warrantySubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  actionButtons: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xxl,
  },

  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  imageViewerClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },

  imageViewerImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },

  // ── Invoice Modal
  invoiceOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  invoiceSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  invoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  invoiceHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  invoiceCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceLoader: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: Spacing.md,
  },
  invoiceLoaderText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  invoiceContent: {
    padding: Spacing.xl,
    paddingBottom: 40,
  },
  invoiceMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  invoiceNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  invoiceDate: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  invoiceParties: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  invoiceParty: {
    flex: 1,
    gap: 2,
  },
  invoicePartyLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  invoicePartyName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  invoicePartyDetail: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  invoiceSection: {
    marginBottom: Spacing.lg,
  },
  invoiceSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  invoiceRowLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  invoiceRowValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
    textAlign: 'right',
    flex: 1,
    marginLeft: Spacing.md,
  },
  invoiceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: Spacing.md,
  },
  invoiceItemDesc: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  invoiceItemAmt: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  invoiceTotals: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  invoiceDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.sm,
  },
  invoiceTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  invoiceTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  invoicePaymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.successBg,
    borderRadius: BorderRadius.md,
  },
  invoicePaymentText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
  },
  invoiceNotes: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
