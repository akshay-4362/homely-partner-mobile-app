import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { Card } from '../components/common/Card';
import { Loader } from '../components/common/Loader';
import { EmptyState } from '../components/common/EmptyState';
import client from '../api/client';

interface PayoutAccount {
  _id: string;
  accountType: 'bank_account' | 'vpa';
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankAccountType?: 'savings' | 'current';
  upiId?: string;
  isPrimary: boolean;
  status: 'active' | 'inactive' | 'suspended';
  isVerified: boolean;
  kycStatus: 'pending' | 'verified' | 'failed';
  createdAt: string;
}

export const PayoutAccountsScreen = () => {
  const navigation = useNavigation<any>();
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await client.get('/payout-accounts');
      setAccounts(response.data.data.accounts || []);
    } catch (error) {
      console.error('Failed to load payout accounts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAccounts();
  };

  const handleAddAccount = () => {
    navigation.navigate('BankAccountSetup');
  };

  const handleSetPrimary = async (accountId: string) => {
    try {
      await client.put(`/payout-accounts/${accountId}/set-primary`);
      Alert.alert('Success', 'Primary account updated successfully');
      loadAccounts();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update primary account');
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete this payout account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await client.delete(`/payout-accounts/${accountId}`);
              Alert.alert('Success', 'Account deleted successfully');
              loadAccounts();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <Loader text="Loading payout accounts..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payout Accounts</Text>
        <TouchableOpacity onPress={handleAddAccount} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      {accounts.length === 0 && (
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color={Colors.warning} />
          <Text style={styles.infoBannerText}>
            Add a payout account to receive your earnings. You can add bank account or UPI.
          </Text>
        </View>
      )}

      {/* Accounts List */}
      <FlatList
        data={accounts}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="wallet-outline"
            title="No Payout Accounts"
            subtitle="Add a bank account or UPI to receive payouts"
            actionLabel="Add Account"
            onAction={handleAddAccount}
          />
        }
        renderItem={({ item }) => (
          <Card style={styles.accountCard}>
            {/* Header */}
            <View style={styles.accountHeader}>
              <View style={styles.accountIcon}>
                <Ionicons
                  name={item.accountType === 'bank_account' ? 'business' : 'flash'}
                  size={24}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.accountInfo}>
                <View style={styles.accountTitleRow}>
                  <Text style={styles.accountTitle}>
                    {item.accountType === 'bank_account' ? 'Bank Account' : 'UPI'}
                  </Text>
                  {item.isPrimary && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryText}>Primary</Text>
                    </View>
                  )}
                </View>
                {item.accountType === 'bank_account' ? (
                  <>
                    <Text style={styles.accountDetail}>{item.accountHolderName}</Text>
                    <Text style={styles.accountDetail}>
                      {item.ifscCode} • {item.accountNumber?.slice(-4).padStart(item.accountNumber.length, '×')}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.accountDetail}>{item.upiId}</Text>
                )}
              </View>
            </View>

            {/* Status */}
            <View style={styles.statusRow}>
              <View style={styles.statusBadge}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        item.status === 'active' ? Colors.success : Colors.textTertiary,
                    },
                  ]}
                />
                <Text style={styles.statusText}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Text>
              </View>

              {item.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>

            {/* Actions */}
            {!item.isPrimary && (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleSetPrimary(item._id)}
                >
                  <Ionicons name="star-outline" size={18} color={Colors.primary} />
                  <Text style={styles.actionText}>Set as Primary</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteBtn]}
                  onPress={() => handleDeleteAccount(item._id)}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.error} />
                  <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  addBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.warningBg,
    padding: Spacing.md,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: Colors.warning,
    fontWeight: '500',
  },
  list: { padding: Spacing.xl },
  accountCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  accountHeader: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  accountIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: {
    flex: 1,
  },
  accountTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  accountTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  primaryBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  primaryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  accountDetail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.success,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryBg,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  deleteBtn: {
    backgroundColor: Colors.errorBg,
  },
  deleteText: {
    color: Colors.error,
  },
});
