import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { listPayoutAccounts, PayoutAccount } from '../api/payoutAccountApi';

const PaymentAccountBanner = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);

  useEffect(() => {
    checkAccountStatus();
    const interval = setInterval(checkAccountStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const checkAccountStatus = async () => {
    try {
      const data = await listPayoutAccounts();
      setAccounts(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handlePress = () => {
    navigation.navigate('PayoutAccounts' as never);
  };

  if (loading) {
    return (
      <View style={styles.banner}>
        <ActivityIndicator size="small" color="#6b7280" />
      </View>
    );
  }

  const hasActive = accounts.some((a) => a.status === 'active');
  const hasSuspended = accounts.some((a) => a.status === 'suspended');
  const hasAny = accounts.length > 0;

  if (hasActive) {
    return (
      <View style={[styles.banner, styles.successBanner]}>
        <Ionicons name="checkmark-circle" size={20} color="#10b981" />
        <Text style={[styles.bannerText, styles.successText]}>Payout account active</Text>
      </View>
    );
  }

  if (hasSuspended) {
    return (
      <TouchableOpacity style={[styles.banner, styles.errorBanner]} onPress={handlePress} activeOpacity={0.7}>
        <Ionicons name="alert-circle" size={20} color="#ef4444" />
        <View style={styles.bannerContent}>
          <Text style={[styles.bannerText, styles.errorText]}>Payout account suspended</Text>
          <Text style={styles.bannerSubtext}>Contact support · Tap for details</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ef4444" />
      </TouchableOpacity>
    );
  }

  if (hasAny) {
    return (
      <TouchableOpacity style={[styles.banner, styles.pendingBanner]} onPress={handlePress} activeOpacity={0.7}>
        <Ionicons name="time" size={20} color="#f59e0b" />
        <View style={styles.bannerContent}>
          <Text style={[styles.bannerText, styles.pendingText]}>Payout account inactive</Text>
          <Text style={styles.bannerSubtext}>Tap to manage your accounts</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#f59e0b" />
      </TouchableOpacity>
    );
  }

  // No account
  return (
    <TouchableOpacity
      style={[styles.banner, styles.warningBanner]}
      onPress={() => navigation.navigate('BankAccountSetup' as never)}
      activeOpacity={0.7}
    >
      <Ionicons name="wallet" size={20} color="#dc2626" />
      <View style={styles.bannerContent}>
        <Text style={[styles.bannerText, styles.warningText]}>Setup payout account to receive earnings</Text>
        <Text style={styles.bannerSubtext}>Takes 2 minutes · Tap to setup now</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#dc2626" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  bannerContent: { flex: 1 },
  bannerText: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  bannerSubtext: { fontSize: 12, color: '#6b7280' },
  successBanner: { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  successText: { color: '#15803d' },
  warningBanner: { backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
  warningText: { color: '#dc2626' },
  pendingBanner: { backgroundColor: '#fffbeb', borderColor: '#fcd34d' },
  pendingText: { color: '#d97706' },
  errorBanner: { backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
  errorText: { color: '#dc2626' },
});

export default PaymentAccountBanner;
