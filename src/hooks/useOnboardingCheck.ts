import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { proApi } from '../api/proApi';

export interface OnboardingStatus {
  hasCategories: boolean | null; // null = loading
  hasHub: boolean | null;        // null = loading
}

export const useOnboardingCheck = () => {
  const { user, accessToken } = useSelector((state: any) => state.auth);
  const [status, setStatus] = useState<OnboardingStatus>({
    hasCategories: null,
    hasHub: null,
  });

  const checkOnboarding = async () => {
    try {
      const profile = await proApi.fetchProfile();
      setStatus({
        hasCategories: Array.isArray(profile?.categories) && profile.categories.length > 0,
        hasHub: !!(profile?.hub),
      });
    } catch (error: any) {
      const isAuthError = error.response?.status === 401 || error.response?.status === 403;
      const isNetworkError = error.message?.includes('Network Error') || error.code === 'ERR_NETWORK';
      if (isAuthError || isNetworkError) {
        return;
      }
      // On unexpected error, don't show banners
      setStatus({ hasCategories: true, hasHub: true });
    }
  };

  useEffect(() => {
    if (user && accessToken) {
      checkOnboarding();
    }
  }, [user, accessToken]);

  const recheckOnboarding = () => checkOnboarding();

  return { ...status, recheckOnboarding };
};
