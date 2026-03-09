import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../theme/colors';

const SECTIONS = [
  {
    title: '1. Introduction',
    body: `Homelyo ("we", "our", "us") is committed to protecting the privacy of its professional service partners ("you", "Partner", "Provider") who use the Homelyo Pro application and associated services available at homelyoapp.com (collectively, the "Platform").\n\nThis Privacy Policy describes how we collect, use, store, share, and protect your personal information when you register and operate as a service professional on the Platform. By using the Platform, you consent to the practices described in this policy.`,
  },
  {
    title: '2. Information We Collect',
    body: `We collect the following categories of information:\n\n(a) Identity & Contact Information\n• Full name, email address, mobile number\n• Profile photograph\n• Residential and service address\n• Date of birth and gender\n\n(b) Identity & Compliance Documents\n• Aadhaar Card, PAN Card, Driving Licence or other government-issued ID\n• Document images uploaded for verification purposes\n\n(c) Financial Information\n• Bank account number and IFSC code\n• UPI ID for payout processing\n• Earnings, payout history, and credit transaction records\n\n(d) Professional Information\n• Service categories and skills\n• Job history, ratings, and customer reviews\n• Availability schedules\n• Before/after job photographs\n\n(e) Device & Usage Information\n• Device type, operating system, and app version\n• IP address and log data\n• Location data (when the app is active and location permission is granted)\n• Push notification tokens`,
  },
  {
    title: '3. How We Use Your Information',
    body: `We use your information for the following purposes:\n\n• To create, verify, and manage your professional partner account\n• To match you with customers based on your service categories, location, and availability\n• To process earnings and transfer payouts to your registered bank account or UPI\n• To verify your identity and comply with applicable laws and regulations\n• To calculate and display your performance metrics, ratings, and quality scores\n• To send you job notifications, OTPs, earnings updates, and important service communications\n• To investigate disputes, complaints, and policy violations\n• To improve the Platform and develop new features\n• To conduct fraud detection, risk management, and security monitoring\n• To comply with legal obligations and respond to lawful requests from authorities`,
  },
  {
    title: '4. Sharing of Your Information',
    body: `We may share your information in the following circumstances:\n\n(a) With Customers\nYour name, profile picture, service category, and ratings are shared with customers when you are assigned to their booking. Your contact number may be shared for coordination purposes.\n\n(b) With Payment Partners\nYour financial information (bank account / UPI) is shared with Razorpay (our payment processing partner) solely for the purpose of processing payouts.\n\n(c) With Service Providers\nWe may share data with trusted third-party vendors who provide services such as cloud hosting, document verification (KYC), analytics, and customer support tools — all bound by confidentiality obligations.\n\n(d) For Legal Compliance\nWe may disclose your information to government authorities, regulators, or law enforcement agencies when required by law, court order, or to protect the rights and safety of Homelyo, its users, or the public.\n\n(e) Business Transfers\nIn the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity, subject to equivalent privacy protections.\n\nWe do not sell, rent, or trade your personal information to third parties for marketing purposes.`,
  },
  {
    title: '5. Location Data',
    body: `The Homelyo Pro app may request access to your device location to:\n• Enable accurate job assignment based on your service area\n• Help customers track arrival for confirmed bookings\n• Verify service location for dispute resolution\n\nLocation access is only active when the app is in use. You may disable location permissions through your device settings, though this may affect your ability to receive job assignments.`,
  },
  {
    title: '6. Data Security',
    body: `We implement appropriate technical and organisational measures to protect your personal information against unauthorised access, loss, misuse, or alteration. These include:\n• Encryption of data in transit (TLS/HTTPS)\n• Secure storage with access controls\n• Regular security assessments\n• Role-based access for internal teams\n\nYour identity documents and financial details are stored with enhanced security controls and accessed only by authorised personnel for verification and payout processing.`,
  },
  {
    title: '7. Data Retention',
    body: `We retain your personal information for as long as your account is active or as necessary to provide services and comply with legal obligations.\n\n• Account data: Retained for the duration of your active partnership and up to 2 years after account closure\n• Financial records and job history: Retained for up to 7 years as required by Indian tax and financial regulations\n• Identity documents: Retained as required by KYC compliance obligations\n• Marketing communications: Until you opt out\n\nYou may request deletion of your account and associated data by contacting us at support@homelyoapp.com, subject to retention obligations.`,
  },
  {
    title: '8. Your Rights',
    body: `As a Homelyo professional partner, you have the following rights regarding your personal data:\n\n• Access: Request a copy of the personal information we hold about you\n• Correction: Update or correct inaccurate information from the Profile screen in the app\n• Deletion: Request deletion of your account and personal data (subject to legal retention obligations)\n• Portability: Request your data in a structured, machine-readable format\n• Objection: Object to specific processing activities where permitted by law\n• Withdraw Consent: Where processing is based on consent, you may withdraw it at any time\n\nTo exercise any of these rights, contact us at: support@homelyoapp.com`,
  },
  {
    title: '9. Cookies and Tracking',
    body: `The Homelyo Pro mobile app does not use browser cookies. We use analytics SDKs and device identifiers to understand app usage and improve performance. You may limit tracking through your device's privacy settings.`,
  },
  {
    title: '10. Third-Party Links',
    body: `The Platform may contain links to third-party websites or services. We are not responsible for the privacy practices of those third parties. We encourage you to review their privacy policies before providing any personal information.`,
  },
  {
    title: '11. Children\'s Privacy',
    body: `The Homelyo Pro platform is intended for use by adults aged 18 and above. We do not knowingly collect personal information from individuals under 18 years of age. If we become aware of such collection, we will promptly delete the information.`,
  },
  {
    title: '12. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time to reflect changes in our practices, technology, or legal requirements. We will notify you of material changes through the app or via email. Your continued use of the Platform after such notice constitutes acceptance of the updated policy.\n\nThe date of the most recent update is indicated at the top of this document.`,
  },
  {
    title: '13. Grievance Officer',
    body: `In accordance with the Information Technology Act, 2000 and the rules made thereunder, the name and contact details of our Grievance Officer are:\n\nName: Grievance Officer, Homelyo\nEmail: grievance@homelyoapp.com\nWebsite: homelyoapp.com\n\nYou may contact our Grievance Officer for any privacy-related complaints or queries. We will acknowledge your complaint within 24 hours and resolve it within 30 days.`,
  },
  {
    title: '14. Contact Us',
    body: `For any questions, concerns, or requests related to this Privacy Policy:\n\nHomelyo Support Team\nEmail: support@homelyoapp.com\nWebsite: homelyoapp.com`,
  },
];

export const PrivacyPolicyScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
        <View style={styles.introBanner}>
          <Text style={styles.introText}>
            This Privacy Policy applies to professional service partners ("Providers") using
            the Homelyo Pro app on the Homelyo platform (homelyoapp.com). Please read it carefully.
          </Text>
        </View>

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
  content: { padding: Spacing.xl, paddingBottom: 80 },
  lastUpdated: { fontSize: 12, color: Colors.textTertiary, marginBottom: Spacing.md },
  introBanner: {
    padding: Spacing.lg,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    marginBottom: Spacing.xl,
  },
  introText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  sectionBody: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
});
