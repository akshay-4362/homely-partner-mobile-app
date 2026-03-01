import { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';
import client from '../api/client';

export const usePayoutAccountCheck = () => {
  const navigation = useNavigation<any>();
  const [hasPayoutAccount, setHasPayoutAccount] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPayoutAccount();
  }, []);

  const checkPayoutAccount = async () => {
    try {
      const response = await client.get('/payout-accounts');
      const accounts = response.data.data.accounts || [];
      const hasActive = accounts.some((acc: any) => acc.status === 'active');

      setHasPayoutAccount(hasActive);

      // If no payout account, show mandatory setup screen
      if (!hasActive) {
        setTimeout(() => {
          Alert.alert(
            'Setup Required',
            'Please add your bank account or UPI to receive payments. This is required to start accepting jobs.',
            [
              {
                text: 'Setup Now',
                onPress: () => navigation.navigate('BankAccountSetup'),
              },
            ],
            { cancelable: false }
          );
        }, 500);
      }
    } catch (error) {
      console.error('Failed to check payout account:', error);
      setHasPayoutAccount(false);
    } finally {
      setLoading(false);
    }
  };

  const recheckPayoutAccount = () => {
    setLoading(true);
    checkPayoutAccount();
  };

  return { hasPayoutAccount, loading, recheckPayoutAccount };
};
