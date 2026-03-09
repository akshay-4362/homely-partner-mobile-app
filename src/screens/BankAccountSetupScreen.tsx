import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { createPayoutAccount } from '../api/payoutAccountApi';

type AccountMode = 'bank_account' | 'vpa';
type BankAccountType = 'savings' | 'current';

export const BankAccountSetupScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<AccountMode>('bank_account');

  // Bank account fields
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankAccountType, setBankAccountType] = useState<BankAccountType>('savings');

  // UPI field
  const [upiId, setUpiId] = useState('');

  // Optional KYC
  const [panNumber, setPanNumber] = useState('');

  const validateAndSubmit = async () => {
    if (mode === 'bank_account') {
      if (!accountHolderName.trim()) {
        Alert.alert('Error', 'Please enter account holder name');
        return;
      }
      if (!accountNumber.trim() || !/^\d{9,18}$/.test(accountNumber.trim())) {
        Alert.alert('Error', 'Please enter a valid account number (9-18 digits)');
        return;
      }
      if (accountNumber !== confirmAccountNumber) {
        Alert.alert('Error', 'Account numbers do not match');
        return;
      }
      if (!ifscCode.trim() || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.trim())) {
        Alert.alert('Error', 'Please enter a valid IFSC code (e.g. HDFC0001234)');
        return;
      }
    } else {
      if (!upiId.trim() || !upiId.includes('@')) {
        Alert.alert('Error', 'Please enter a valid UPI ID (e.g. name@upi)');
        return;
      }
    }

    try {
      setLoading(true);

      if (mode === 'bank_account') {
        await createPayoutAccount({
          accountType: 'bank_account',
          accountHolderName: accountHolderName.trim(),
          accountNumber: accountNumber.trim(),
          ifscCode: ifscCode.trim().toUpperCase(),
          bankAccountType,
          panNumber: panNumber.trim() || undefined,
        });
      } else {
        await createPayoutAccount({
          accountType: 'vpa',
          upiId: upiId.trim().toLowerCase(),
          panNumber: panNumber.trim() || undefined,
        });
      }

      Alert.alert(
        'Account Added',
        'Your payout account has been set up. Earnings will be transferred here during the daily settlement.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to add payout account. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Payout Account</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Card style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={Colors.primary} />
          <Text style={styles.infoText}>
            Add your bank account or UPI ID to receive daily payouts via RazorpayX.
          </Text>
        </Card>

        {/* Mode tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, mode === 'bank_account' && styles.tabActive]}
            onPress={() => setMode('bank_account')}
          >
            <Ionicons
              name="business-outline"
              size={16}
              color={mode === 'bank_account' ? Colors.primary : Colors.textSecondary}
            />
            <Text style={[styles.tabText, mode === 'bank_account' && styles.tabTextActive]}>
              Bank Account
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, mode === 'vpa' && styles.tabActive]}
            onPress={() => setMode('vpa')}
          >
            <Ionicons
              name="phone-portrait-outline"
              size={16}
              color={mode === 'vpa' ? Colors.primary : Colors.textSecondary}
            />
            <Text style={[styles.tabText, mode === 'vpa' && styles.tabTextActive]}>UPI</Text>
          </TouchableOpacity>
        </View>

        {mode === 'bank_account' ? (
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
        ) : (
          <>
            <Text style={styles.sectionTitle}>UPI Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>UPI ID</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., name@paytm or phone@upi"
                value={upiId}
                onChangeText={setUpiId}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
              <Text style={styles.hint}>Payouts are instant via UPI</Text>
            </View>
          </>
        )}

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

        <View style={styles.termsContainer}>
          <Ionicons name="shield-checkmark" size={16} color={Colors.success} />
          <Text style={styles.termsText}>
            Your details are securely stored with Razorpay via RazorpayX. We never store your
            credentials directly.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
        <Button
          label={loading ? 'Adding Account...' : 'Add Payout Account'}
          onPress={validateAndSubmit}
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
  infoText: { flex: 1, fontSize: 13, color: Colors.primary, fontWeight: '500', lineHeight: 18 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  tabActive: { backgroundColor: Colors.primaryBg },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  inputGroup: { marginBottom: Spacing.lg },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.sm },
  optional: { fontSize: 12, fontWeight: '400', color: Colors.textSecondary },
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
  hint: { fontSize: 12, color: Colors.textSecondary, marginTop: Spacing.xs },
  radioGroup: { flexDirection: 'row', gap: Spacing.xl },
  radioBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  radioText: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.successBg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  termsText: { flex: 1, fontSize: 12, color: Colors.success, lineHeight: 16 },
  footer: {
    padding: Spacing.xl,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
