export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'professional';
  city?: string;
  profilePicture?: string;
  profilePictureThumbnail?: string;
}

export interface MediaItem {
  dataUrl: string;
  type: 'photo' | 'video';
  label: string;
}

export interface ProBooking {
  id: string;
  bookingNumber: string;
  serviceName: string;
  customerName: string;
  scheduledAt: string;
  status: string;
  city?: string;
  paymentMethod?: 'pay_now' | 'pay_later';
  paymentStatus?: string;
  addressLine?: string;
  addressFull?: string;
  lat?: number;
  lng?: number;
  total: number;
  additionalChargesTotal: number;
  finalTotal: number;
  creditDeducted?: number;
  beforeMedia: MediaItem[];
  afterMedia: MediaItem[];
  warrantyExpiresAt?: string;
  warrantyClaimed?: boolean;
  warrantyClaimReason?: string;
  startOtp?: string;
  completionOtp?: string;
}

export interface AdditionalCharge {
  _id: string;
  description: string;
  amount: number;
  category: 'materials' | 'extra_work' | 'transport' | 'other';
  approved: boolean;
  approvedAt?: string;
}

export interface ChargesResponse {
  pending: AdditionalCharge[];
  approved: AdditionalCharge[];
  total: number;
}

export interface Payout {
  id: string;
  amount: number;
  status: string;
  periodStart: string;
  periodEnd: string;
  reference: string;
}

export interface ChatMessage {
  _id: string;
  bookingId: string;
  senderId: string;
  senderRole: 'customer' | 'professional';
  content: string;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfessionalDocument {
  _id: string;
  type: string;
  url: string;
  status: 'submitted' | 'approved' | 'rejected';
  notes?: string;
}

export interface ProfessionalAccountingSummary {
  totalEarnings: number;
  pendingPayout: number;
  paidOut: number;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  averageEarningsPerJob: number;
  rating: number;
  reviewCount: number;
}

export interface ProfessionalBookingEarning {
  bookingId: string;
  bookingNumber: string;
  serviceName: string;
  customerName: string;
  scheduledAt: string;
  completedAt: string | null;
  status: string;
  totalAmount: number;
  commission: number;
  earnings: number;
}

export interface ProfessionalMonthlyEarning {
  month: string;
  earnings: number;
  bookings: number;
  commission: number;
  serviceTaxes: number;
  totalPaid: number;
}

export interface TodayBooking {
  bookingId: string;
  bookingNumber: string;
  serviceName: string;
  customerName: string;
  customerPhone: string;
  scheduledAt: string;
  status: string;
  address: Record<string, unknown>;
  earnings: number;
  startOtp?: string;
  completionOtp?: string;
}

export interface Notification {
  _id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface AvailabilitySlot {
  day: string;
  start: string;
  end: string;
}

export interface StripeAccountStatus {
  accountId?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  status?: string;
}
