import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Linking, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../theme/colors';

const SUPPORT_PHONE = '+917019506104';
const SUPPORT_DISPLAY = '+91 70195 06104';

export const HelpCenterScreen = () => {
  const navigation = useNavigation<any>();

  const handleCall = () => {
    Linking.openURL(`tel:${SUPPORT_PHONE}`);
  };

  const handleWhatsApp = () => {
    Linking.openURL(`https://wa.me/${SUPPORT_PHONE.replace('+', '')}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconCircle}>
          <Ionicons name="headset" size={48} color={Colors.primary} />
        </View>

        <Text style={styles.title}>Need Help?</Text>
        <Text style={styles.subtitle}>
          Our support team is available to assist you. Reach us directly on:
        </Text>

        {/* Phone number display */}
        <View style={styles.phoneBox}>
          <Ionicons name="call" size={20} color={Colors.primary} />
          <Text style={styles.phoneNumber}>{SUPPORT_DISPLAY}</Text>
        </View>

        {/* Call button */}
        <TouchableOpacity style={styles.callBtn} onPress={handleCall} activeOpacity={0.8}>
          <Ionicons name="call" size={20} color="#fff" />
          <Text style={styles.callBtnText}>Call Support</Text>
        </TouchableOpacity>

        {/* WhatsApp button */}
        <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsApp} activeOpacity={0.8}>
          <Ionicons name="logo-whatsapp" size={20} color="#fff" />
          <Text style={styles.whatsappBtnText}>WhatsApp</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          Available Monday – Saturday, 9 AM – 6 PM IST
        </Text>
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 80 : 60,
    gap: Spacing.md,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  phoneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    marginVertical: Spacing.sm,
  },
  phoneNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    width: '100%',
  },
  callBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#25D366',
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    width: '100%',
  },
  whatsappBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  note: {
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
