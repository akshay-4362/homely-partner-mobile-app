import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../theme/colors';

const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: `We collect information you provide when registering as a professional partner on Homelyo, including your name, email address, phone number, bank account or UPI details for payouts, identity documents (Aadhaar, PAN, Driving Licence), profile picture, and service categories.\n\nWe also collect usage data such as job history, earnings, ratings, location data when the app is in use, and device information.`,
  },
  {
    title: '2. How We Use Your Information',
    body: `Your information is used to:\n• Create and manage your professional partner account\n• Match you with customers for service bookings\n• Process payouts to your registered bank account or UPI\n• Verify your identity and documents for compliance\n• Send job notifications, earnings updates, and support messages\n• Improve our platform and resolve disputes`,
  },
  {
    title: '3. Sharing Your Information',
    body: `We share your name, profile picture, and service category with customers when you are assigned to their booking.\n\nWe share payout-related information with Razorpay (our payment partner) to process earnings transfers.\n\nWe do not sell your personal data to third parties.`,
  },
  {
    title: '4. Data Security',
    body: `We use industry-standard encryption and secure servers to protect your personal information. Your bank account details and identity documents are stored securely and accessed only for verification and payout purposes.`,
  },
  {
    title: '5. Your Rights',
    body: `You have the right to:\n• Access and update your personal information from the Profile screen\n• Request deletion of your account by contacting support\n• Opt out of promotional communications\n\nFor any data-related requests, contact us at support@homelyo.com`,
  },
  {
    title: '6. Retention',
    body: `We retain your data for as long as your account is active or as required by law. Job history and financial records may be retained for up to 7 years for tax and compliance purposes.`,
  },
  {
    title: '7. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. We will notify you of significant changes via the app. Continued use of the app after changes constitutes acceptance of the updated policy.`,
  },
  {
    title: '8. Contact Us',
    body: `If you have questions about this Privacy Policy, please contact:\n\nHomelyo Support\nEmail: support@homelyo.com`,
  },
];

export const PrivacyPolicyScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Last updated: March 2026</Text>
        <Text style={styles.intro}>
          This Privacy Policy explains how Homelyo collects, uses, and protects the personal
          information of professional partners using the Homelyo Pro app.
        </Text>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
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
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  scroll: { flex: 1 },
  content: { padding: Spacing.xl, paddingBottom: 60 },
  lastUpdated: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: Spacing.md,
  },
  intro: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.xl,
    padding: Spacing.lg,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  sectionBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
});
