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

export const setTokens = async (access: string | null | undefined, refresh: string | null | undefined): Promise<void> => {
  // Only set tokens if they are valid strings
  const operations: [string, string][] = [];

  if (access) {
    operations.push([ACCESS_TOKEN_KEY, access]);
  }

  if (refresh) {
    operations.push([REFRESH_TOKEN_KEY, refresh]);
  }

  if (operations.length > 0) {
    await AsyncStorage.multiSet(operations);
  }
};

export const clearTokens = async (): Promise<void> => {
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
};

export const setUser = async (user: object | null | undefined): Promise<void> => {
  if (user) {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    await AsyncStorage.removeItem(USER_KEY);
  }
};

export const getUser = async (): Promise<object | null> => {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const clearUser = async (): Promise<void> => {
  await AsyncStorage.removeItem(USER_KEY);
};
