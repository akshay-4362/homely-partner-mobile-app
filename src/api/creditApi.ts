import api from './axiosConfig';

export interface CreditTransaction {
  _id: string;
  professional: string;
  amount: number;
  type: 'purchase' | 'job_deduction' | 'penalty' | 'refund';
  status: 'pending' | 'completed' | 'failed';
  relatedBooking?: {
    _id: string;
    bookingNumber: string;
    scheduledDate: string;
  };
  paymentIntentId?: string;
  description: string;
  balanceAfter: number;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CreditStats {
  currentBalance: number;
  creditPerJob: number;
  jobsRemaining: number;
  warningThreshold: number;
  needsRecharge: boolean;
  monthlyStats: {
    purchase?: { total: number; count: number };
    job_deduction?: { total: number; count: number };
    penalty?: { total: number; count: number };
    refund?: { total: number; count: number };
  };
}

export interface CreditHistory {
  transactions: CreditTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CreatePurchaseIntentResponse {
  data: {
    clientSecret: string;
    paymentIntentId: string;
  };
}

export interface ConfirmPurchaseResponse {
  data: {
    transaction: CreditTransaction;
  };
}

// Get current credit balance
export const getCreditBalance = async (): Promise<{ data: { balance: number } }> => {
  const response = await api.get('/credits/balance');
  return response.data;
};

// Get credit statistics
export const getCreditStats = async (): Promise<{ data: CreditStats }> => {
  const response = await api.get('/credits/stats');
  return response.data;
};

// Get credit transaction history
export const getCreditTransactions = async (params?: {
  type?: 'purchase' | 'job_deduction' | 'penalty' | 'refund';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: CreditHistory }> => {
  const response = await api.get('/credits/transactions', { params });
  return response.data;
};

// Create payment intent for credit purchase
export const createPurchaseIntent = async (amount: number): Promise<CreatePurchaseIntentResponse> => {
  const response = await api.post('/credits/create-purchase-intent', { amount });
  return response.data;
};

// Confirm credit purchase after payment
export const confirmPurchase = async (
  paymentIntentId: string,
  amount: number
): Promise<ConfirmPurchaseResponse> => {
  const response = await api.post('/credits/confirm-purchase', {
    paymentIntentId,
    amount,
  });
  return response.data;
};
