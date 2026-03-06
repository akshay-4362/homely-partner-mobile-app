/**
 * Stage Utils Tests
 * Unit tests for stage determination and validation logic
 */

import {
  getCurrentStage,
  canProceedToNextStage,
  validateBeforeMediaStage,
  validateAfterMediaStage,
  validatePaymentStage,
  validateMediaUpload,
  validateCashPayment,
  getStageName,
  isStageCompleted,
} from '../utils/stageUtils';
import { ProBooking } from '../../../types';
import { ChargesData, MediaItem } from '../types';

// Mock booking data
const createMockBooking = (overrides?: Partial<ProBooking>): ProBooking => ({
  id: 'booking-123',
  bookingNumber: 'B-2024-001',
  serviceName: 'AC Repair',
  customerName: 'John Doe',
  customerPhone: '+1234567890',
  scheduledAt: new Date('2024-03-07T14:00:00Z'),
  status: 'confirmed',
  city: 'Bangalore',
  paymentMethod: 'pay_later',
  paymentStatus: 'pending',
  paidAt: null,
  paymentAmount: 0,
  paymentIntentId: null,
  addressLine: '123 Main St',
  addressFull: '123 Main St, Bangalore, Karnataka',
  lat: 12.9716,
  lng: 77.5946,
  total: 1500,
  additionalChargesTotal: 0,
  finalTotal: 1500,
  creditDeducted: 300,
  beforeMedia: [],
  afterMedia: [],
  warrantyExpiresAt: null,
  warrantyClaimed: false,
  warrantyClaimReason: null,
  startOtp: '123456',
  completionOtp: '654321',
  ...overrides,
});

const createMockCharges = (overrides?: Partial<ChargesData>): ChargesData => ({
  pending: [],
  approved: [],
  total: 0,
  ...overrides,
});

describe('Stage Utils', () => {
  describe('getCurrentStage', () => {
    it('should return stage 1 for confirmed booking with no progress', () => {
      const booking = createMockBooking();
      const charges = createMockCharges();
      expect(getCurrentStage(booking, charges)).toBe(1);
    });

    it('should return stage 2 for in_progress booking with no before media', () => {
      const booking = createMockBooking({ status: 'in_progress' });
      const charges = createMockCharges();
      expect(getCurrentStage(booking, charges)).toBe(2);
    });

    it('should return stage 3 for booking with before media but no after media', () => {
      const booking = createMockBooking({
        status: 'in_progress',
        beforeMedia: [{ dataUrl: 'data:image/jpeg;base64,xxx', type: 'photo', label: 'Before' }],
      });
      const charges = createMockCharges();
      expect(getCurrentStage(booking, charges)).toBe(3);
    });

    it('should return stage 4 for booking with after media and no pending charges', () => {
      const booking = createMockBooking({
        status: 'in_progress',
        beforeMedia: [{ dataUrl: 'data:image/jpeg;base64,xxx', type: 'photo', label: 'Before' }],
        afterMedia: [{ dataUrl: 'data:image/jpeg;base64,yyy', type: 'photo', label: 'After' }],
      });
      const charges = createMockCharges();
      expect(getCurrentStage(booking, charges)).toBe(4);
    });

    it('should return stage 3 if after media uploaded but charges still pending', () => {
      const booking = createMockBooking({
        status: 'in_progress',
        beforeMedia: [{ dataUrl: 'data:image/jpeg;base64,xxx', type: 'photo', label: 'Before' }],
        afterMedia: [{ dataUrl: 'data:image/jpeg;base64,yyy', type: 'photo', label: 'After' }],
      });
      const charges = createMockCharges({
        pending: [
          {
            _id: '1',
            description: 'Parts',
            amount: 500,
            addedBy: 'pro-123' as any,
            addedAt: new Date(),
            approved: false,
            category: 'materials',
          },
        ],
      });
      expect(getCurrentStage(booking, charges)).toBe(3);
    });

    it('should return stage 5 for completed booking', () => {
      const booking = createMockBooking({ status: 'completed' });
      const charges = createMockCharges();
      expect(getCurrentStage(booking, charges)).toBe(5);
    });

    it('should return stage 5 if payment completed even if status not updated', () => {
      const booking = createMockBooking({
        status: 'in_progress',
        paidAt: new Date(),
      });
      const charges = createMockCharges();
      expect(getCurrentStage(booking, charges)).toBe(5);
    });
  });

  describe('validateBeforeMediaStage', () => {
    it('should pass validation if before media exists', () => {
      const booking = createMockBooking({
        beforeMedia: [{ dataUrl: 'data:image/jpeg;base64,xxx', type: 'photo', label: 'Before' }],
      });
      const result = validateBeforeMediaStage(booking);
      expect(result.valid).toBe(true);
    });

    it('should fail validation if no before media', () => {
      const booking = createMockBooking({ beforeMedia: [] });
      const result = validateBeforeMediaStage(booking);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('before photo or video');
    });
  });

  describe('validateAfterMediaStage', () => {
    it('should pass validation if after media exists and no pending charges', () => {
      const booking = createMockBooking({
        afterMedia: [{ dataUrl: 'data:image/jpeg;base64,yyy', type: 'photo', label: 'After' }],
      });
      const charges = createMockCharges();
      const result = validateAfterMediaStage(booking, charges);
      expect(result.valid).toBe(true);
    });

    it('should fail validation if no after media', () => {
      const booking = createMockBooking({ afterMedia: [] });
      const charges = createMockCharges();
      const result = validateAfterMediaStage(booking, charges);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('after photo or video');
    });

    it('should fail validation if charges still pending', () => {
      const booking = createMockBooking({
        afterMedia: [{ dataUrl: 'data:image/jpeg;base64,yyy', type: 'photo', label: 'After' }],
      });
      const charges = createMockCharges({
        pending: [
          {
            _id: '1',
            description: 'Parts',
            amount: 500,
            addedBy: 'pro-123' as any,
            addedAt: new Date(),
            approved: false,
            category: 'materials',
          },
        ],
      });
      const result = validateAfterMediaStage(booking, charges);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('approve additional charges');
    });
  });

  describe('validatePaymentStage', () => {
    it('should pass validation if payment completed', () => {
      const booking = createMockBooking({ paidAt: new Date() });
      const result = validatePaymentStage(booking);
      expect(result.valid).toBe(true);
    });

    it('should fail validation if payment not completed', () => {
      const booking = createMockBooking({ paidAt: null });
      const result = validatePaymentStage(booking);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Payment must be completed');
    });
  });

  describe('validateMediaUpload', () => {
    it('should pass validation for 1-10 media items', () => {
      const media: MediaItem[] = [
        { dataUrl: 'data:image/jpeg;base64,xxx', type: 'photo', label: 'Photo 1' },
      ];
      const result = validateMediaUpload(media);
      expect(result.valid).toBe(true);
    });

    it('should fail validation for 0 media items', () => {
      const result = validateMediaUpload([]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 1');
    });

    it('should fail validation for more than 10 media items', () => {
      const media: MediaItem[] = Array.from({ length: 11 }, (_, i) => ({
        dataUrl: `data:image/jpeg;base64,xxx${i}`,
        type: 'photo' as const,
        label: `Photo ${i + 1}`,
      }));
      const result = validateMediaUpload(media);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Maximum 10');
    });
  });

  describe('validateCashPayment', () => {
    it('should pass validation if amounts match', () => {
      const result = validateCashPayment(1500, 1500);
      expect(result.valid).toBe(true);
    });

    it('should fail validation if amounts do not match', () => {
      const result = validateCashPayment(1000, 1500);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Amount mismatch');
    });

    it('should fail validation for zero or negative amount', () => {
      const result = validateCashPayment(0, 0);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid payment amount');
    });
  });

  describe('getStageName', () => {
    it('should return correct stage names', () => {
      expect(getStageName(1)).toBe('Job Details');
      expect(getStageName(2)).toBe('Before Service');
      expect(getStageName(3)).toBe('After Service');
      expect(getStageName(4)).toBe('Payment');
      expect(getStageName(5)).toBe('Completed');
    });
  });

  describe('isStageCompleted', () => {
    it('should return true for stages before current', () => {
      expect(isStageCompleted(1, 3)).toBe(true);
      expect(isStageCompleted(2, 3)).toBe(true);
    });

    it('should return false for current stage and after', () => {
      expect(isStageCompleted(3, 3)).toBe(false);
      expect(isStageCompleted(4, 3)).toBe(false);
    });
  });
});
