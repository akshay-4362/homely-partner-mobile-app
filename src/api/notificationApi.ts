import client from './client';

export const notificationApi = {
  list: async (limit = 20) => {
    const { data } = await client.get('/notifications', { params: { limit } });
    return data;
  },

  markRead: async (notificationId: string) => {
    const { data } = await client.patch(`/notifications/${notificationId}/read`);
    return data;
  },
};
