/**
 * Stage Utilities
 * Core logic for determining current stage and validations
 */

import { ProBooking } from '../../../types';
import { WorkflowStage, ChargesData, ValidationResult, MediaItem } from '../types';

/**
 * Determine current workflow stage based on booking state
 *
 * Stage determination logic:
 * - Stage 1: Job not started (status: confirmed)
 * - Stage 2: Job started, before media not uploaded (status: in_progress, no before media)
 * - Stage 3: Before media uploaded, after media not uploaded (has before media, no after media)
 * - Stage 4: After media uploaded, not paid (has after media, no paidAt)
 * - Stage 5: Job completed (status: completed OR paidAt exists)
 */
export const getCurrentStage = (
  booking: ProBooking,
  charges: ChargesData
): WorkflowStage => {
  // Stage 5: Job completed
  if (booking.status === 'completed') {
    return 5;
  }

  // Stage 5: Payment completed (even if status not updated yet)
  if (booking.paidAt) {
    return 5;
  }

  // Stage 4: Ready for payment (after media uploaded, charges approved)
  const hasAfterMedia = (booking.afterMedia?.length || 0) > 0;
  const noPendingCharges = (charges.pending?.length || 0) === 0;
  if (hasAfterMedia && noPendingCharges) {
    return 4;
  }

  // Stage 3: Before media uploaded, ready for after media
  const hasBeforeMedia = (booking.beforeMedia?.length || 0) > 0;
  if (hasBeforeMedia) {
    return 3;
  }

  // Stage 2: Job started, needs before media
  if (booking.status === 'in_progress') {
    return 2;
  }

  // Stage 1: Job not started yet
  return 1;
};

/**
 * Check if can proceed to next stage
 */
export const canProceedToNextStage = (
  currentStage: WorkflowStage,
  booking: ProBooking,
  charges: ChargesData
): ValidationResult => {
  switch (currentStage) {
    case 1:
      // Stage 1 → 2: Need to enter OTP and start job
      // This is handled by the start job API, not here
      return { valid: false, error: 'Enter OTP to start job' };

    case 2:
      // Stage 2 → 3: Need at least 1 before media
      return validateBeforeMediaStage(booking);

    case 3:
      // Stage 3 → 4: Need after media + all charges approved
      return validateAfterMediaStage(booking, charges);

    case 4:
      // Stage 4 → 5: Need payment completed
      return validatePaymentStage(booking);

    case 5:
      // Already at final stage
      return { valid: true };

    default:
      return { valid: false, error: 'Invalid stage' };
  }
};

/**
 * Validate Stage 2 (Before Media) completion
 */
export const validateBeforeMediaStage = (booking: ProBooking): ValidationResult => {
  const beforeMediaCount = booking.beforeMedia?.length || 0;

  if (beforeMediaCount === 0) {
    return {
      valid: false,
      error: 'Upload at least 1 before photo or video to continue',
    };
  }

  return { valid: true };
};

/**
 * Validate Stage 3 (After Media) completion
 */
export const validateAfterMediaStage = (
  booking: ProBooking,
  charges: ChargesData
): ValidationResult => {
  const afterMediaCount = booking.afterMedia?.length || 0;

  if (afterMediaCount === 0) {
    return {
      valid: false,
      error: 'Upload at least 1 after photo or video to continue',
    };
  }

  const pendingChargesCount = charges.pending?.length || 0;
  if (pendingChargesCount > 0) {
    return {
      valid: false,
      error: 'Wait for customer to approve additional charges before proceeding',
    };
  }

  return { valid: true };
};

/**
 * Validate Stage 4 (Payment) completion
 */
export const validatePaymentStage = (booking: ProBooking): ValidationResult => {
  if (!booking.paidAt) {
    return {
      valid: false,
      error: 'Payment must be completed before finishing job',
    };
  }

  return { valid: true };
};

/**
 * Validate media upload (before or after)
 */
export const validateMediaUpload = (media: MediaItem[]): ValidationResult => {
  if (media.length === 0) {
    return {
      valid: false,
      error: 'Add at least 1 photo or video',
    };
  }

  if (media.length > 10) {
    return {
      valid: false,
      error: 'Maximum 10 media items allowed',
    };
  }

  return { valid: true };
};

/**
 * Validate cash payment amount
 */
export const validateCashPayment = (
  amount: number,
  expectedAmount: number
): ValidationResult => {
  if (amount !== expectedAmount) {
    return {
      valid: false,
      error: `Amount mismatch. Expected ₹${expectedAmount}`,
    };
  }

  if (amount <= 0) {
    return {
      valid: false,
      error: 'Invalid payment amount',
    };
  }

  return { valid: true };
};

/**
 * Get user-friendly stage name
 */
export const getStageName = (stage: WorkflowStage): string => {
  const stageNames: Record<WorkflowStage, string> = {
    1: 'Job Details',
    2: 'Before Service',
    3: 'After Service',
    4: 'Payment',
    5: 'Completed',
  };

  return stageNames[stage] || 'Unknown';
};

/**
 * Get stage description
 */
export const getStageDescription = (stage: WorkflowStage): string => {
  const descriptions: Record<WorkflowStage, string> = {
    1: 'Enter OTP to start job',
    2: 'Upload before photos and add charges',
    3: 'Upload after photos',
    4: 'Collect payment from customer',
    5: 'Job completed successfully',
  };

  return descriptions[stage] || '';
};

/**
 * Check if stage is completed
 */
export const isStageCompleted = (
  stage: WorkflowStage,
  currentStage: WorkflowStage
): boolean => {
  return stage < currentStage;
};

/**
 * Get next stage number
 */
export const getNextStage = (currentStage: WorkflowStage): WorkflowStage => {
  if (currentStage >= 5) return 5;
  return (currentStage + 1) as WorkflowStage;
};

/**
 * Get previous stage number
 */
export const getPreviousStage = (currentStage: WorkflowStage): WorkflowStage => {
  if (currentStage <= 1) return 1;
  return (currentStage - 1) as WorkflowStage;
};
