import axios from 'axios';
import client from './client';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5001/api/v1';

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

  // Use raw axios (not client) to avoid triggering the 401 interceptor loop
  refresh: async (refreshToken: string) => {
    const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
    return data.data || data;
  },
};
