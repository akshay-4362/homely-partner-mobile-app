/**
 * Progress Indicator Component
 * Shows current stage in the workflow with visual progress bar
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../../../theme/colors';
import { WorkflowStage } from '../types';

interface ProgressIndicatorProps {
  currentStage: WorkflowStage;
  stages?: string[];
}

const DEFAULT_STAGES = ['Started', 'Media', 'Payment', 'Complete'];

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStage,
  stages = DEFAULT_STAGES,
}) => {
  const totalSteps = 5; // Total workflow steps (1-5)

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressBar}>
        {Array.from({ length: totalSteps }, (_, index) => {
          const step = index + 1;
          const isActive = step <= currentStage;
          const isCompleted = step < currentStage;
          const isLast = index === totalSteps - 1;

          return (
            <React.Fragment key={step}>
              {/* Progress Dot */}
              <View
                style={[
                  styles.dot,
                  isActive && styles.dotActive,
                  isCompleted && styles.dotCompleted,
                ]}
              >
                {isCompleted ? (
                  // Checkmark for completed stages
                  <Text style={styles.checkmark}>✓</Text>
                ) : isActive ? (
                  // Filled dot for current stage
                  <View style={styles.dotInner} />
                ) : null}
              </View>

              {/* Connecting Line */}
              {!isLast && (
                <View
                  style={[
                    styles.line,
                    isCompleted && styles.lineCompleted,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Stage Labels */}
      <View style={styles.labelsContainer}>
        {stages.map((label, index) => {
          // Map stages array (4 items) to step numbers
          // Stage 1 is implicit (not shown in labels)
          const step = index + 2; // Labels start from step 2
          const isActive = step <= currentStage;

          return (
            <Text
              key={index}
              style={[
                styles.label,
                isActive && styles.labelActive,
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },

  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.gray300,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dotActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },

  dotCompleted: {
    borderColor: Colors.success,
    backgroundColor: Colors.success,
  },

  dotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },

  checkmark: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  line: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.gray300,
    marginHorizontal: 4,
  },

  lineCompleted: {
    backgroundColor: Colors.success,
  },

  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
  },

  label: {
    ...Typography.small,
    color: Colors.textTertiary,
    flex: 1,
    textAlign: 'center',
  },

  labelActive: {
    ...Typography.captionBold,
    color: Colors.primary,
  },
});
