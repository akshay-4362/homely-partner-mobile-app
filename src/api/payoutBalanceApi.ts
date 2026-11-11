import client from './client';

export type BalanceItemKind = 'online_job' | 'cash_job' | 'payout' | 'payout_reversed' | 'dues_paid' | 'refund' | 'other';

export interface PartnerBalanceItem {
  kind: BalanceItemKind;
  amount: number; // + adds to your payout, − reduces it / what you owe
  label: string;
  bookingNumber?: string;
  date: string;
}

export interface PartnerBalance {
  balance: number;    // + platform owes you (next payout), − you owe the platform
  nextPayout: number;
  amountOwed: number;
  items: PartnerBalanceItem[];
}

export const payoutBalanceApi = {
  getBalance: async (): Promise<PartnerBalance> => {
    const { data } = await client.get('/payouts/balance');
    return data.data || data;
  },

  createDuesOrder: async (): Promise<{ orderId: string; amount: number; currency: string; keyId: string; amountOwed: number }> => {
    const { data } = await client.post('/payouts/dues/order');
    return data.data || data;
  },

  confirmDuesPayment: async (payload: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }): Promise<PartnerBalance> => {
    const { data } = await client.post('/payouts/dues/confirm', payload);
    return data.data || data;
  },
};
