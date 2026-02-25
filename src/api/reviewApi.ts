import client from './client';

export const reviewApi = {
  getMyReviews: async () => {
    const { data } = await client.get('/reviews/me');
    return data.data || data;
  },
};
