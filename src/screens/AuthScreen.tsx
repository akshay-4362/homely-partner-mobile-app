import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { authApi } from '../api/authApi';
import { login, register, clearError } from '../store/authSlice';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Logo } from '../components/Logo';
import { Colors, Spacing, BorderRadius } from '../theme/colors';

export const AuthScreen = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const { status, error, user } = useAppSelector((s) => s.auth);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '' });
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [phoneToken, setPhoneToken] = useState<string | null>(null);
  const [otpBusy, setOtpBusy] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);

  // Navigate to onboarding after successful registration
  useEffect(() => {
    if (justRegistered && user) {
      setJustRegistered(false);
      // Small delay to ensure navigation is ready
      setTimeout(() => {
        navigation.navigate('Onboarding', { isOnboarding: true });
      }, 100);
    }
  }, [justRegistered, user, navigation]);

  const handleSendOtp = async () => {
    setOtpBusy(true);
    try {
      await authApi.sendRegisterOtp(form.phone);
      setOtpSent(true);
      setOtp('');
    } catch (err: any) {
      Alert.alert('Could not send OTP', err.response?.data?.message || 'Please try again.');
    } finally {
      setOtpBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpBusy(true);
    try {
      const { phoneVerificationToken } = await authApi.verifyRegisterOtp(form.phone, otp);
      setPhoneToken(phoneVerificationToken);
    } catch (err: any) {
      Alert.alert('Verification failed', err.response?.data?.message || 'Please try again.');
    } finally {
      setOtpBusy(false);
    }
  };

  const handleSubmit = async () => {
    if (mode === 'login') {
      if (!form.email || !form.password) { Alert.alert('Error', 'Fill all fields'); return; }
      const res = await dispatch(login({ email: form.email, password: form.password }));
      if (res.meta.requestStatus === 'rejected') {
        const errorMsg = typeof res.payload === 'string' ? res.payload : 'Invalid credentials. Please check your email and password.';
        Alert.alert('Login Failed', errorMsg);
      }
    } else {
      if (!form.firstName || !form.email || !form.password || !form.phone) { Alert.alert('Error', 'Fill all fields'); return; }
      if (!phoneToken) { Alert.alert('Error', 'Please verify your mobile number with OTP'); return; }
      const res = await dispatch(register({ ...form, phoneVerificationToken: phoneToken }));
      if (res.meta.requestStatus === 'rejected') {
        const errorMsg = typeof res.payload === 'string' ? res.payload : 'Could not register. Please try again.';
        Alert.alert('Registration Failed', errorMsg);
      } else if (res.meta.requestStatus === 'fulfilled') {
        // Mark that user just registered to trigger onboarding
        setJustRegistered(true);
      }
    }
  };

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <Logo width={200} />
            <Text style={styles.tagline}>Manage your jobs, earnings & schedule</Text>
          </View>

          {/* Toggle */}
          <View style={styles.toggleRow}>
            {(['login', 'register'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.toggleBtn, mode === m && styles.toggleActive]}
                onPress={() => { setMode(m); dispatch(clearError()); }}
              >
                <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>
                  {m === 'login' ? 'Sign In' : 'Sign Up'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Form */}
          <View style={styles.form}>
            {mode === 'register' && (
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Input
                    label="First Name"
                    placeholder="Raj"
                    value={form.firstName}
                    onChangeText={(v) => setForm({ ...form, firstName: v })}
                  />
                </View>
                <View style={styles.spacer} />
                <View style={styles.flex}>
                  <Input
                    label="Last Name"
                    placeholder="Kumar"
                    value={form.lastName}
                    onChangeText={(v) => setForm({ ...form, lastName: v })}
                  />
                </View>
              </View>
            )}

            {mode === 'register' && (
              <>
                <Input
                  label="Mobile Number"
                  placeholder="10-digit mobile number"
                  keyboardType="number-pad"
                  maxLength={10}
                  editable={!phoneToken}
                  value={form.phone}
                  onChangeText={(v) => { setForm({ ...form, phone: v.replace(/\D/g, '') }); setOtpSent(false); }}
                />
                {phoneToken ? (
                  <Text style={{ color: Colors.success, marginBottom: Spacing.md }}>✓ Mobile number verified</Text>
                ) : (
                  <>
                    <Button
                      label={otpSent ? 'Resend OTP' : 'Send OTP'}
                      onPress={handleSendOtp}
                      loading={otpBusy}
                      disabled={form.phone.length !== 10}
                      fullWidth
                      style={{ marginBottom: Spacing.md }}
                    />
                    {otpSent && (
                      <>
                        <Input
                          label="OTP"
                          placeholder="6-digit OTP"
                          keyboardType="number-pad"
                          maxLength={6}
                          value={otp}
                          onChangeText={(v) => setOtp(v.replace(/\D/g, ''))}
                        />
                        <Button
                          label="Verify OTP"
                          onPress={handleVerifyOtp}
                          loading={otpBusy}
                          disabled={otp.length !== 6}
                          fullWidth
                          style={{ marginBottom: Spacing.md }}
                        />
                      </>
                    )}
                  </>
                )}
              </>
            )}

            <Input
              label="Email"
              placeholder="pro@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={(v) => setForm({ ...form, email: v })}
            />

            <Input
              label="Password"
              placeholder="••••••••"
              password
              value={form.password}
              onChangeText={(v) => setForm({ ...form, password: v })}
            />

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Button
              label={mode === 'login' ? 'Sign In' : 'Create Account'}
              onPress={handleSubmit}
              loading={status === 'loading'}
              fullWidth
              size="lg"
              style={styles.submitBtn}
            />
          </View>

          {/* Info */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Join Eazyhomes4u Professionals</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>✓</Text>
              <Text style={styles.infoItem}>Get auto-assigned jobs in your city</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>✓</Text>
              <Text style={styles.infoItem}>Track earnings & payouts in real-time</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>✓</Text>
              <Text style={styles.infoItem}>Manage your availability & calendar</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Platform.OS === 'ios' ? 100 : 80 },
  header: { alignItems: 'center', marginBottom: Spacing.xxxl },
  tagline: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.md },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.lg,
    padding: 4,
    marginBottom: Spacing.xl,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BorderRadius.md },
  toggleActive: { backgroundColor: Colors.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  toggleText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  toggleTextActive: { color: Colors.primary },
  form: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.xl, marginBottom: Spacing.xl,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  row: { flexDirection: 'row' },
  spacer: { width: Spacing.md },
  errorBanner: { backgroundColor: Colors.errorBg, borderRadius: BorderRadius.sm, padding: 10, marginBottom: Spacing.md },
  errorText: { color: Colors.error, fontSize: 13 },
  submitBtn: { marginTop: Spacing.sm, borderRadius: BorderRadius.lg },
  infoCard: {
    backgroundColor: Colors.primaryBg, borderRadius: BorderRadius.xl,
    padding: Spacing.xl, borderWidth: 1, borderColor: Colors.primaryLight + '40',
  },
  infoTitle: { fontSize: 15, fontWeight: '700', color: Colors.primary, marginBottom: Spacing.md },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoIcon: { fontSize: 14, color: Colors.success, marginRight: 8, fontWeight: '700' },
  infoItem: { fontSize: 14, color: Colors.textSecondary },
});
