import { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';
import { useSelector } from 'react-redux';
import client from '../api/client';

export const usePayoutAccountCheck = () => {
  const navigation = useNavigation<any>();
  const { user, accessToken } = useSelector((state: any) => state.auth);
  const [hasPayoutAccount, setHasPayoutAccount] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only check if user is authenticated
    if (user && accessToken) {
      checkPayoutAccount();
    } else {
      setLoading(false);
    }
  }, [user, accessToken]);

  const checkPayoutAccount = async () => {
    try {
      const response = await client.get('/payout-accounts');
      const accounts = response.data.data.accounts || [];
      const hasActive = accounts.some((acc: any) => acc.status === 'active');

      setHasPayoutAccount(hasActive);
    } catch (error: any) {
      // Ignore expected errors silently (user not logged in, network issues during startup)
      const isAuthError = error.response?.status === 401 || error.response?.status === 403;
      const isNetworkError = error.message?.includes('Network Error') || error.code === 'ERR_NETWORK';

      if (isAuthError || isNetworkError) {
        // Silently ignore - these are expected during app startup
        setHasPayoutAccount(null);
        setLoading(false);
        return;
      }

      // Only log unexpected errors
      console.error('Unexpected error checking payout account:', error.message || error);
      setHasPayoutAccount(false);
    } finally {
      if (loading) {
        setLoading(false);
      }
    }
  };

  const recheckPayoutAccount = () => {
    setLoading(true);
    checkPayoutAccount();
  };

  return { hasPayoutAccount, loading, recheckPayoutAccount };
};
