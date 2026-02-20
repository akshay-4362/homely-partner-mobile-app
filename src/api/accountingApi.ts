import client from './client';

export const accountingApi = {
  getSummary: async () => {
    const { data } = await client.get('/accounting/professional/summary');
    return data.data || data;
  },

  getEarnings: async (page = 1, limit = 20) => {
    const { data } = await client.get('/accounting/professional/earnings', {
      params: { page, limit },
    });
    return data.data || data;
  },

  getMonthlyEarnings: async (months = 6) => {
    const { data } = await client.get('/accounting/professional/monthly', {
      params: { months },
    });
    return data.data || data;
  },

  getTodayBookings: async () => {
    const { data } = await client.get('/accounting/professional/today');
    return data.data || data;
  },
};
