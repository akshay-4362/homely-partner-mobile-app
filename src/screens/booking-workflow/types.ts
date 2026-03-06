/**
 * Booking Workflow Types
 * Types for the sequential job execution workflow
 */

import { ProBooking, AdditionalCharge } from '../../types';

// Re-export MediaItem from main types
export type { MediaItem } from '../../types';

/**
 * Job execution stages (1-5)
 */
export type WorkflowStage = 1 | 2 | 3 | 4 | 5;

/**
 * Payment method selection for job completion
 */
export type PaymentMethod = 'cash' | 'online' | null;

/**
 * Workflow state interface
 */
export interface BookingWorkflowState {
  // Current stage (1-5)
  currentStage: WorkflowStage;

  // Pending media uploads (not yet submitted)
  beforeMediaPending: MediaItem[];
  afterMediaPending: MediaItem[];

  // Payment method selection
  paymentMethod: PaymentMethod;

  // QR code data (when online payment selected)
  qrCodeData: QRCodeData | null;

  // Upload progress
  uploadProgress: number;
  uploading: boolean;
}

/**
 * QR code data from Razorpay
 */
export interface QRCodeData {
  qrCodeId: string;
  qrCodeUrl: string;
  amount: number;
  expiresAt: Date;
  status: 'active' | 'credited' | 'closed';
}

/**
 * Charges data structure
 */
export interface ChargesData {
  pending: AdditionalCharge[];
  approved: AdditionalCharge[];
  total: number;
}

/**
 * Stage validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Stage transition data
 */
export interface StageTransition {
  from: WorkflowStage;
  to: WorkflowStage;
  timestamp: Date;
  booking: ProBooking;
}

/**
 * Props for stage components
 */
export interface StageComponentProps {
  booking: ProBooking;
  charges: ChargesData;
  onStageComplete: (nextStage: WorkflowStage) => void;
  onError: (error: string) => void;
}
