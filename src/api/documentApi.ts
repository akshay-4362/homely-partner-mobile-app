import client from './client';

export const documentApi = {
  list: async () => {
    const { data } = await client.get('/documents/me');
    return data;
  },

  submit: async (payload: { type: string; url: string }) => {
    const { data } = await client.post('/documents/me', payload);
    return data;
  },
};
