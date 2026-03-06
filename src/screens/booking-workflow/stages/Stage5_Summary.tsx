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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, Typography } from '../../../theme/colors';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { formatCurrency, formatDate, formatDateOnly } from '../../../utils/format';
import { StageComponentProps } from '../types';
import { RateCustomerModal } from '../../../components/RateCustomerModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const Stage5_Summary: React.FC<StageComponentProps> = ({
  booking,
  charges,
}) => {
  const navigation = useNavigation<any>();

  const [showRatingModal, setShowRatingModal] = useState(false);
  const [fullImageUri, setFullImageUri] = useState<string | null>(null);

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
   * View invoice (placeholder)
   */
  const viewInvoice = () => {
    // TODO: Implement invoice download/view
    console.log('View invoice for booking:', booking.id);
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
});
