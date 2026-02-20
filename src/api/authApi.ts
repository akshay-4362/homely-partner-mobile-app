import client from './client';

export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await client.post('/auth/login', { email, password });
    return data.data || data; // Handle both { data: { user, ... } } and { user, ... }
  },

  register: async (payload: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => {
    const { data } = await client.post('/auth/register', {
      ...payload,
      role: 'professional',
    });
    return data.data || data; // Handle both { data: { user, ... } } and { user, ... }
  },
};
