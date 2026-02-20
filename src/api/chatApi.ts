import client from './client';

export const chatApi = {
  getMessages: async (bookingId: string) => {
    const { data } = await client.get(`/chats/${bookingId}`);
    return data.data || data;
  },

  sendMessage: async (bookingId: string, content: string) => {
    const { data } = await client.post(`/chats/${bookingId}/message`, { content });
    return data.data || data;
  },

  markRead: async (bookingId: string) => {
    const { data } = await client.patch(`/chats/${bookingId}/read`);
    return data.data || data;
  },
};
