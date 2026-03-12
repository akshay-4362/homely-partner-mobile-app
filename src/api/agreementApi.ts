import client from './client';

export interface Agreement {
  _id: string;
  version: string;
  title: string;
  content: string;
  documentUrl: string;
  isActive: boolean;
  createdAt: string;
}

export interface PartnerAgreementStatus {
  active: Agreement | null;
  acceptance: {
    agreementVersion: string;
    acceptedAt: string;
    agreementId: Agreement;
  } | null;
  isCurrentVersion: boolean;
}

export const agreementApi = {
  getActive: async (): Promise<Agreement> => {
    const { data } = await client.get('/agreements/active');
    return data.data;
  },

  getMy: async (): Promise<PartnerAgreementStatus> => {
    const { data } = await client.get('/agreements/my');
    return data.data;
  },

  getMyHistory: async () => {
    const { data } = await client.get('/agreements/my/history');
    return data.data;
  },

  accept: async (agreementId: string) => {
    const { data } = await client.post('/agreements/accept', { agreementId });
    return data.data;
  },
};
