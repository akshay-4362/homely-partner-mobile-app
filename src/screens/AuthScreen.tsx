import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Image, Alert,
} from 'react-native';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { login, register, clearError } from '../store/authSlice';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Colors, Spacing, BorderRadius } from '../theme/colors';

export const AuthScreen = () => {
  const dispatch = useAppDispatch();
  const { status, error } = useAppSelector((s) => s.auth);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });

  const handleSubmit = async () => {
    if (mode === 'login') {
      if (!form.email || !form.password) { Alert.alert('Error', 'Fill all fields'); return; }
      const res = await dispatch(login({ email: form.email, password: form.password }));
      if (res.meta.requestStatus === 'rejected') {
        Alert.alert('Login Failed', (res.payload as string) || 'Invalid credentials');
      }
    } else {
      if (!form.firstName || !form.email || !form.password) { Alert.alert('Error', 'Fill all fields'); return; }
      const res = await dispatch(register(form));
      if (res.meta.requestStatus === 'rejected') {
        Alert.alert('Registration Failed', (res.payload as string) || 'Could not register');
      }
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>H</Text>
            </View>
            <Text style={styles.brand}>Homelyo Pro</Text>
          </View>
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
          <Text style={styles.infoTitle}>Join Homelyo Professionals</Text>
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
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.xl, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: Spacing.xxxl },
  logoWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  logoCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  logoText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  brand: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  tagline: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
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
