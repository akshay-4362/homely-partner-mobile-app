import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = 'homely:pro:accessToken';
const REFRESH_TOKEN_KEY = 'homely:pro:refreshToken';
const USER_KEY = 'homely-pro-user';

export const getAccessToken = async (): Promise<string | null> => {
  return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = async (): Promise<string | null> => {
  return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setTokens = async (access: string, refresh: string): Promise<void> => {
  await AsyncStorage.multiSet([
    [ACCESS_TOKEN_KEY, access],
    [REFRESH_TOKEN_KEY, refresh],
  ]);
};

export const clearTokens = async (): Promise<void> => {
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
};

export const setUser = async (user: object): Promise<void> => {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getUser = async (): Promise<object | null> => {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const clearUser = async (): Promise<void> => {
  await AsyncStorage.removeItem(USER_KEY);
};
