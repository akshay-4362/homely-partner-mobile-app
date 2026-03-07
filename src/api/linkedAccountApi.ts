import apiClient from './client';

export interface CreateLinkedAccountRequest {
  businessName: string;
  contactName: string;
  businessType?: 'individual' | 'proprietorship' | 'partnership' | 'private_limited' | 'public_limited' | 'llp' | 'trust' | 'society' | 'ngo';
  pan?: string;
  gst?: string;
}

export interface LinkedAccountStatusResponse {
  success: boolean;
  data: {
    hasLinkedAccount: boolean;
    linkedAccountId?: string;
    status: 'created' | 'activated' | 'suspended' | 'needs_clarification' | null;
    canReceivePayments: boolean;
    message: string;
  };
}

export interface LinkedAccountDetailsResponse {
  success: boolean;
  data: {
    linkedAccountId: string;
    status: string;
    canReceivePayments: boolean;
    details: {
      id: string;
      type: string;
      status: string;
      email: string;
      phone: string;
      legal_business_name: string;
      business_type: string;
      created_at: number;
    };
  } | null;
}

export interface CanReceivePaymentsResponse {
  success: boolean;
  data: {
    canReceivePayments: boolean;
  };
}

/**
 * Create a Razorpay linked account for the professional
 */
export const createLinkedAccount = async (data: CreateLinkedAccountRequest) => {
  const response = await apiClient.post('/linked-accounts', data);
  return response.data;
};

/**
 * Get linked account status
 */
export const getLinkedAccountStatus = async (): Promise<LinkedAccountStatusResponse> => {
  const response = await apiClient.get('/linked-accounts/status');
  return response.data;
};

/**
 * Get linked account details
 */
export const getLinkedAccountDetails = async (): Promise<LinkedAccountDetailsResponse> => {
  const response = await apiClient.get('/linked-accounts');
  return response.data;
};

/**
 * Check if professional can receive payments
 */
export const canReceivePayments = async (): Promise<CanReceivePaymentsResponse> => {
  const response = await apiClient.get('/linked-accounts/can-receive-payments');
  return response.data;
};

export default {
  createLinkedAccount,
  getLinkedAccountStatus,
  getLinkedAccountDetails,
  canReceivePayments,
};
