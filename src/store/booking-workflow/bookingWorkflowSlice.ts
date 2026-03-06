/**
 * Booking Workflow Redux Slice
 * Manages state for the sequential job execution workflow
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  BookingWorkflowState,
  WorkflowStage,
  PaymentMethod,
  QRCodeData,
  MediaItem,
} from '../../screens/booking-workflow/types';

/**
 * Initial state
 */
const initialState: BookingWorkflowState = {
  currentStage: 1,
  beforeMediaPending: [],
  afterMediaPending: [],
  paymentMethod: null,
  qrCodeData: null,
  uploadProgress: 0,
  uploading: false,
};

/**
 * Booking Workflow Slice
 */
const bookingWorkflowSlice = createSlice({
  name: 'bookingWorkflow',
  initialState,
  reducers: {
    // Stage management
    setCurrentStage: (state, action: PayloadAction<WorkflowStage>) => {
      state.currentStage = action.payload;
    },

    resetWorkflow: (state) => {
      return { ...initialState };
    },

    // Before media management
    addBeforeMedia: (state, action: PayloadAction<MediaItem>) => {
      state.beforeMediaPending.push(action.payload);
    },

    removeBeforeMedia: (state, action: PayloadAction<number>) => {
      state.beforeMediaPending.splice(action.payload, 1);
    },

    clearBeforeMedia: (state) => {
      state.beforeMediaPending = [];
    },

    // After media management
    addAfterMedia: (state, action: PayloadAction<MediaItem>) => {
      state.afterMediaPending.push(action.payload);
    },

    removeAfterMedia: (state, action: PayloadAction<number>) => {
      state.afterMediaPending.splice(action.payload, 1);
    },

    clearAfterMedia: (state) => {
      state.afterMediaPending = [];
    },

    // Payment method
    setPaymentMethod: (state, action: PayloadAction<PaymentMethod>) => {
      state.paymentMethod = action.payload;
    },

    // QR code data
    setQRCodeData: (state, action: PayloadAction<QRCodeData | null>) => {
      state.qrCodeData = action.payload;
    },

    // Upload progress
    setUploadProgress: (state, action: PayloadAction<number>) => {
      state.uploadProgress = action.payload;
    },

    setUploading: (state, action: PayloadAction<boolean>) => {
      state.uploading = action.payload;
    },

    // Complete stage transition
    completeStageTransition: (state, action: PayloadAction<WorkflowStage>) => {
      state.currentStage = action.payload;

      // Clear stage-specific data
      if (action.payload === 3) {
        // Transitioned to stage 3, clear before media pending
        state.beforeMediaPending = [];
      } else if (action.payload === 4) {
        // Transitioned to stage 4, clear after media pending
        state.afterMediaPending = [];
      } else if (action.payload === 5) {
        // Job completed, reset workflow
        state.beforeMediaPending = [];
        state.afterMediaPending = [];
        state.uploadProgress = 0;
        state.uploading = false;
      }
    },
  },
});

// Export actions
export const {
  setCurrentStage,
  resetWorkflow,
  addBeforeMedia,
  removeBeforeMedia,
  clearBeforeMedia,
  addAfterMedia,
  removeAfterMedia,
  clearAfterMedia,
  setPaymentMethod,
  setQRCodeData,
  setUploadProgress,
  setUploading,
  completeStageTransition,
} = bookingWorkflowSlice.actions;

// Export reducer
export default bookingWorkflowSlice.reducer;

// Selectors
export const selectWorkflowState = (state: any): BookingWorkflowState =>
  state.bookingWorkflow;

export const selectCurrentStage = (state: any): WorkflowStage =>
  state.bookingWorkflow.currentStage;

export const selectBeforeMediaPending = (state: any): MediaItem[] =>
  state.bookingWorkflow.beforeMediaPending;

export const selectAfterMediaPending = (state: any): MediaItem[] =>
  state.bookingWorkflow.afterMediaPending;

export const selectPaymentMethod = (state: any): PaymentMethod =>
  state.bookingWorkflow.paymentMethod;

export const selectQRCodeData = (state: any): QRCodeData | null =>
  state.bookingWorkflow.qrCodeData;

export const selectUploadProgress = (state: any): number =>
  state.bookingWorkflow.uploadProgress;

export const selectUploading = (state: any): boolean =>
  state.bookingWorkflow.uploading;
