/**
 * Upload Progress Bar
 * Shows per-file upload progress with status indicators
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../theme/colors';
import { UploadProgress } from '../utils/mediaUtils';

interface Props {
  progress: UploadProgress | null;
  visible: boolean;
}

export const UploadProgressBar: React.FC<Props> = ({ progress, visible }) => {
  if (!visible || !progress) return null;

  const statusConfig = {
    compressing: { icon: 'construct' as const, color: Colors.warning, label: 'Compressing...' },
    uploading: { icon: 'cloud-upload' as const, color: Colors.primary, label: 'Uploading...' },
    done: { icon: 'checkmark-circle' as const, color: Colors.success, label: 'Done' },
    error: { icon: 'alert-circle' as const, color: Colors.error, label: 'Failed' },
  };

  const config = statusConfig[progress.status];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name={config.icon} size={18} color={config.color} />
        <Text style={styles.statusText}>
          {config.label} ({progress.index + 1}/{progress.total})
        </Text>
      </View>

      {/* File name */}
      <Text style={styles.fileName} numberOfLines={1}>
        {progress.fileName}
      </Text>

      {/* Progress bar */}
      <View style={styles.trackOuter}>
        <View
          style={[
            styles.trackFill,
            {
              width: `${progress.progress}%`,
              backgroundColor: config.color,
            },
          ]}
        />
      </View>

      {/* Percentage */}
      <Text style={[styles.percentage, { color: config.color }]}>
        {progress.progress}%
      </Text>

      {/* Error message */}
      {progress.error && (
        <View style={styles.errorRow}>
          <Ionicons name="warning" size={14} color={Colors.error} />
          <Text style={styles.errorText}>{progress.error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  statusText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  fileName: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  trackOuter: {
    height: 6,
    backgroundColor: Colors.gray100,
    borderRadius: 3,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 3,
  },
  percentage: {
    ...Typography.caption,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: 4,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.errorBg,
    borderRadius: BorderRadius.sm,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    flex: 1,
  },
});
