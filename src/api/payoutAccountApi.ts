import client from './client';

export interface PayoutAccount {
  _id: string;
  accountType: 'bank_account' | 'vpa';
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankAccountType?: 'savings' | 'current';
  upiId?: string;
  status: 'active' | 'inactive' | 'suspended';
  isPrimary: boolean;
  isVerified: boolean;
  kycStatus: 'pending' | 'verified' | 'failed';
  createdAt: string;
}

export interface CreateBankAccountPayload {
  accountType: 'bank_account';
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankAccountType: 'savings' | 'current';
  panNumber?: string;
}

export interface CreateUpiPayload {
  accountType: 'vpa';
  upiId: string;
  panNumber?: string;
}

export type CreatePayoutAccountPayload = CreateBankAccountPayload | CreateUpiPayload;

export const createPayoutAccount = async (payload: CreatePayoutAccountPayload) => {
  const response = await client.post('/payout-accounts', payload);
  return response.data.data.account as PayoutAccount;
};

export const listPayoutAccounts = async () => {
  const response = await client.get('/payout-accounts');
  return response.data.data.accounts as PayoutAccount[];
};

export const setPrimaryAccount = async (accountId: string) => {
  const response = await client.put(`/payout-accounts/${accountId}/set-primary`);
  return response.data;
};

export const deletePayoutAccount = async (accountId: string) => {
  const response = await client.delete(`/payout-accounts/${accountId}`);
  return response.data;
};
