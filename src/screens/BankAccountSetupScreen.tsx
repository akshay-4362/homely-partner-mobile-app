import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import client from '../api/client';

type AccountType = 'bank_account' | 'vpa';
type BankAccountType = 'savings' | 'current';

export const BankAccountSetupScreen = () => {
  const navigation = useNavigation<any>();
  const [accountType, setAccountType] = useState<AccountType>('bank_account');
  const [loading, setLoading] = useState(false);

  // Bank account fields
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankAccountType, setBankAccountType] = useState<BankAccountType>('savings');

  // UPI field
  const [upiId, setUpiId] = useState('');

  // Optional PAN for KYC
  const [panNumber, setPanNumber] = useState('');

  const handleSubmit = async () => {
    // Validation
    if (accountType === 'bank_account') {
      if (!accountHolderName.trim()) {
        Alert.alert('Error', 'Please enter account holder name');
        return;
      }
      if (!accountNumber.trim()) {
        Alert.alert('Error', 'Please enter account number');
        return;
      }
      if (accountNumber !== confirmAccountNumber) {
        Alert.alert('Error', 'Account numbers do not match');
        return;
      }
      if (!ifscCode.trim()) {
        Alert.alert('Error', 'Please enter IFSC code');
        return;
      }
      if (ifscCode.length !== 11) {
        Alert.alert('Error', 'IFSC code must be 11 characters');
        return;
      }
    } else {
      if (!upiId.trim()) {
        Alert.alert('Error', 'Please enter UPI ID');
        return;
      }
      if (!upiId.includes('@')) {
        Alert.alert('Error', 'Invalid UPI ID format (e.g., yourname@paytm)');
        return;
      }
    }

    try {
      setLoading(true);

      const payload: any = {
        accountType,
        panNumber: panNumber.trim() || undefined,
      };

      if (accountType === 'bank_account') {
        payload.accountHolderName = accountHolderName.trim();
        payload.accountNumber = accountNumber.trim();
        payload.ifscCode = ifscCode.trim().toUpperCase();
        payload.bankAccountType = bankAccountType;
      } else {
        payload.upiId = upiId.trim();
      }

      await client.post('/payout-accounts', payload);

      Alert.alert(
        'Success!',
        'Your payout account has been added successfully. You can now receive payments.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Failed to add payout account:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to add payout account. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Payout Account</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Info Card */}
        <Card style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={Colors.primary} />
          <Text style={styles.infoText}>
            Add your bank account or UPI ID to receive payouts for completed jobs. All payments are processed securely via Razorpay.
          </Text>
        </Card>

        {/* Account Type Selection */}
        <Text style={styles.sectionTitle}>Select Account Type</Text>
        <View style={styles.accountTypeContainer}>
          <TouchableOpacity
            style={[
              styles.accountTypeBtn,
              accountType === 'bank_account' && styles.accountTypeBtnActive,
            ]}
            onPress={() => setAccountType('bank_account')}
          >
            <Ionicons
              name="business"
              size={24}
              color={accountType === 'bank_account' ? Colors.primary : Colors.textSecondary}
            />
            <Text
              style={[
                styles.accountTypeText,
                accountType === 'bank_account' && styles.accountTypeTextActive,
              ]}
            >
              Bank Account
            </Text>
            <Text style={styles.accountTypeSubtext}>IMPS/NEFT transfer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.accountTypeBtn, accountType === 'vpa' && styles.accountTypeBtnActive]}
            onPress={() => setAccountType('vpa')}
          >
            <Ionicons
              name="flash"
              size={24}
              color={accountType === 'vpa' ? Colors.primary : Colors.textSecondary}
            />
            <Text
              style={[styles.accountTypeText, accountType === 'vpa' && styles.accountTypeTextActive]}
            >
              UPI
            </Text>
            <Text style={styles.accountTypeSubtext}>Instant transfer</Text>
          </TouchableOpacity>
        </View>

        {/* Bank Account Form */}
        {accountType === 'bank_account' && (
          <>
            <Text style={styles.sectionTitle}>Bank Account Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Account Holder Name</Text>
              <TextInput
                style={styles.input}
                placeholder="As per bank records"
                value={accountHolderName}
                onChangeText={setAccountHolderName}
                autoCapitalize="words"
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Account Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter account number"
                value={accountNumber}
                onChangeText={setAccountNumber}
                keyboardType="number-pad"
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Account Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Re-enter account number"
                value={confirmAccountNumber}
                onChangeText={setConfirmAccountNumber}
                keyboardType="number-pad"
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>IFSC Code</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., HDFC0001234"
                value={ifscCode}
                onChangeText={setIfscCode}
                autoCapitalize="characters"
                maxLength={11}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Account Type</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={styles.radioBtn}
                  onPress={() => setBankAccountType('savings')}
                  disabled={loading}
                >
                  <View style={styles.radio}>
                    {bankAccountType === 'savings' && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.radioText}>Savings</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.radioBtn}
                  onPress={() => setBankAccountType('current')}
                  disabled={loading}
                >
                  <View style={styles.radio}>
                    {bankAccountType === 'current' && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.radioText}>Current</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* UPI Form */}
        {accountType === 'vpa' && (
          <>
            <Text style={styles.sectionTitle}>UPI Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>UPI ID</Text>
              <TextInput
                style={styles.input}
                placeholder="yourname@paytm"
                value={upiId}
                onChangeText={setUpiId}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
              <Text style={styles.hint}>
                Enter your UPI ID (e.g., 9876543210@paytm, name@oksbi, etc.)
              </Text>
            </View>
          </>
        )}

        {/* Optional PAN */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            PAN Number <Text style={styles.optional}>(Optional)</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="ABCDE1234F"
            value={panNumber}
            onChangeText={setPanNumber}
            autoCapitalize="characters"
            maxLength={10}
            editable={!loading}
          />
          <Text style={styles.hint}>Required for payouts above ₹10,000</Text>
        </View>

        {/* Terms */}
        <View style={styles.termsContainer}>
          <Ionicons name="shield-checkmark" size={16} color={Colors.success} />
          <Text style={styles.termsText}>
            Your bank details are securely encrypted and stored with Razorpay. We never store your account
            credentials.
          </Text>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <Button
          label={loading ? 'Adding Account...' : 'Add Payout Account'}
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
        />
      </View>
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
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxl },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryBg,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  accountTypeContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  accountTypeBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  accountTypeBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  accountTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  accountTypeTextActive: {
    color: Colors.primary,
  },
  accountTypeSubtext: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  optional: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.textSecondary,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  hint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: Spacing.xl,
  },
  radioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  radioText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.successBg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: Colors.success,
    lineHeight: 16,
  },
  footer: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
