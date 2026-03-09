import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../theme/colors';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: `By registering and using the Homelyo Pro app, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the app.`,
  },
  {
    title: '2. Partner Eligibility',
    body: `To become a Homelyo professional partner, you must:\n• Be at least 18 years of age\n• Possess valid identity proof (Aadhaar, PAN, or Driving Licence)\n• Have the necessary skills and qualifications for the services you offer\n• Maintain a valid bank account or UPI ID for receiving payouts\n• Complete the onboarding and document verification process`,
  },
  {
    title: '3. Credit System',
    body: `Homelyo operates on a credit-based job assignment system:\n• Each job assignment deducts ₹300 from your credit balance\n• Credits must be purchased in advance to receive job assignments\n• Minimum credit balance of ₹300 is required to be eligible for job assignments\n• Credits are non-refundable except in cases of system errors or cancelled bookings where refund policy applies`,
  },
  {
    title: '4. Job Assignments & Conduct',
    body: `As a professional partner, you agree to:\n• Complete accepted jobs professionally and on time\n• Verify job start and completion using the OTP system\n• Upload before and after photos for every job\n• Maintain a rating of 3.0 or above\n• Treat customers with respect and professionalism\n• Not solicit customers outside the Homelyo platform\n• Not share OTPs or account credentials with third parties`,
  },
  {
    title: '5. Earnings & Payouts',
    body: `Earnings are calculated based on the service price minus Homelyo's platform commission (as displayed in the earnings section). Payouts are processed to your registered bank account or UPI ID via RazorpayX.\n\nHomelyo reserves the right to withhold payouts in cases of disputed jobs, policy violations, or fraudulent activity pending investigation.`,
  },
  {
    title: '6. Cancellations & Penalties',
    body: `Frequent job cancellations may result in:\n• Credit penalties deducted from your balance\n• Temporary suspension from receiving new job assignments\n• Permanent account termination for repeated violations\n\nCancellation fees apply as per the cancellation policy displayed in the app.`,
  },
  {
    title: '7. Account Suspension & Termination',
    body: `Homelyo reserves the right to suspend or terminate your partner account for:\n• Violation of these Terms of Service\n• Customer complaints or consistently low ratings\n• Fraudulent activity or misuse of the platform\n• Failure to comply with document verification requirements\n\nYou may request account deletion by contacting support@homelyo.com`,
  },
  {
    title: '8. Intellectual Property',
    body: `The Homelyo name, logo, and app content are owned by Homelyo. You may not use our brand assets without prior written permission.`,
  },
  {
    title: '9. Limitation of Liability',
    body: `Homelyo is a platform connecting professionals with customers. We are not liable for disputes arising from service quality, customer behaviour, or events beyond our reasonable control.\n\nOur liability is limited to the amount of platform fees collected in the transaction in question.`,
  },
  {
    title: '10. Changes to Terms',
    body: `We may update these Terms from time to time. Continued use of the app after changes are posted constitutes acceptance. For significant changes, we will notify you via the app.`,
  },
  {
    title: '11. Contact',
    body: `For questions about these Terms, contact:\n\nHomelyo Support\nEmail: support@homelyo.com`,
  },
];

export const TermsOfServiceScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Last updated: March 2026</Text>
        <Text style={styles.intro}>
          These Terms of Service govern your use of the Homelyo Pro app as a professional
          service partner. Please read them carefully before using the platform.
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
