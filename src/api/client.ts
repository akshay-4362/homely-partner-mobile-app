import axios from 'axios';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../utils/tokenStorage';

// Set this in your .env or app.config.ts
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5001/api/v1';

const client = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
});

// Inject access token on each request
client.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let logoutHandler: (() => void) | null = null;

export const setLogoutHandler = (handler: () => void) => {
  logoutHandler = handler;
};

// 401 → refresh token → retry
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else if (token) p.resolve(token);
  });
  failedQueue = [];
};

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return client(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await getRefreshToken();
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = data;

        await setTokens(accessToken, newRefresh);
        client.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return client(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await clearTokens();
        logoutHandler?.();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default client;
