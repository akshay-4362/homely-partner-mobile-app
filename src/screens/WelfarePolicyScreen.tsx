import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  UIManager,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Colors, Spacing, BorderRadius } from '../theme/colors';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface PolicyItem {
  text: string;
}

interface SubSection {
  heading: string;
  items: PolicyItem[];
}

interface Section {
  id: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  intro?: string;
  items?: PolicyItem[];
  subSections?: SubSection[];
}

// ─── Content ──────────────────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  {
    id: 'objectives',
    icon: 'flag-outline',
    iconColor: '#6366f1',
    iconBg: '#eef2ff',
    title: 'Objectives',
    intro:
      'To provide clear and effective channels for service professionals on the Homelyo platform to communicate, resolve disputes, and safeguard their interests, while ensuring:',
    items: [
      { text: 'A fair and transparent grievance redressal mechanism.' },
      { text: 'Clear policies for earnings, deactivation, and appeals.' },
      { text: 'Dedicated support personnel accessible via the app at all times.' },
      { text: 'Zero tolerance for discrimination and harassment.' },
    ],
  },
  {
    id: 'communication',
    icon: 'chatbubbles-outline',
    iconColor: '#3b82f6',
    iconBg: '#eff6ff',
    title: 'Communication with a Human Representative',
    intro:
      'Homelyo ensures every service professional can communicate with a human representative for support and grievance resolution. The channel is available on the platform 24×7.',
    items: [
      {
        text: 'Service professionals can raise a support ticket directly from the Help Center in the app at any time.',
      },
      {
        text: 'All standard tickets are acknowledged within 24 hours. Emergency tickets are responded to within 30 minutes.',
      },
      {
        text: 'Partners can add messages, attach photos, and track ticket status — all within the app.',
      },
      {
        text: 'Escalation is available if the initial response is unsatisfactory. Partners may request a senior review at any stage.',
      },
    ],
  },
  {
    id: 'appeal',
    icon: 'shield-outline',
    iconColor: '#f59e0b',
    iconBg: '#fffbeb',
    title: 'Process of Appeal in Case of Deactivation',
    intro:
      'No service professional will be deactivated without a fair review process. The following steps apply:',
    items: [
      {
        text: 'A formal notice will be sent in-app with the reason for deactivation before any action is taken, wherever possible.',
      },
      {
        text: 'The partner has 7 days from the date of notice to raise an appeal via the Help Center.',
      },
      {
        text: 'Appeals are reviewed by a designated team within 5 working days. The outcome is communicated via the app.',
      },
      {
        text: 'If the appeal is upheld, the account is reinstated with full access. Any withheld earnings are released within 3 working days.',
      },
      {
        text: 'If dismissed, a final written explanation is provided. A second-level escalation can be requested within 3 days of the decision.',
      },
    ],
  },
  {
    id: 'ratings',
    icon: 'star-outline',
    iconColor: '#10b981',
    iconBg: '#ecfdf5',
    title: 'Ratings and Deactivation Process',
    intro:
      'Ratings are a key quality measure but are applied fairly. Homelyo follows a structured process before taking any account action based on ratings.',
    items: [
      {
        text: 'Ratings are calculated as a weighted rolling average. A single low rating does not disproportionately affect your score.',
      },
      {
        text: 'If your rating drops below 3.5, you will receive an in-app advisory with guidance on improvement.',
      },
      {
        text: 'Disputed ratings can be flagged via Help Center. We review before/after photos and OTP records as evidence.',
      },
      {
        text: 'Deactivation based on ratings is only triggered after sustained low performance and multiple advisory notices.',
      },
      {
        text: 'Partners on a performance improvement plan receive dedicated coaching support and re-assessment within 30 days.',
      },
    ],
  },
  {
    id: 'safeguarding',
    icon: 'lock-closed-outline',
    iconColor: '#8b5cf6',
    iconBg: '#f5f3ff',
    title: 'Safeguarding and Deactivation Rights',
    intro:
      'Service professionals have the right to safeguard their accounts and livelihood through clearly defined protective measures.',
    items: [
      {
        text: 'Temporary account suspension during investigation is limited to a maximum of 15 days, after which a decision must be communicated.',
      },
      {
        text: 'Earnings accrued before any suspension or deactivation will not be withheld unless there is an active fraud investigation.',
      },
      {
        text: 'Credit deductions or penalties are applied only after a confirmed policy violation reviewed by the partner support team.',
      },
      {
        text: 'All partners retain access to their earnings history, job records, and customer reviews regardless of account status.',
      },
      {
        text: 'Any withheld amounts subject to dispute will be resolved and released within 10 working days of the final decision.',
      },
    ],
  },
  {
    id: 'equality',
    icon: 'people-outline',
    iconColor: '#ec4899',
    iconBg: '#fdf2f8',
    title: 'Equality and Fair Treatment',
    intro:
      'Homelyo is committed to an Anti-Discrimination Policy and will not tolerate any form of unequal treatment among service professionals.',
    items: [
      {
        text: 'Job assignments are based solely on skills, service category, availability, and rating — never on caste, religion, gender, age, or background.',
      },
      {
        text: 'Homelyo will regularly monitor assignment patterns to ensure equitable distribution across all partner groups.',
      },
      {
        text: 'Any Service Professional who witnesses or experiences discrimination may report it confidentially via the Help Center.',
      },
      {
        text: 'If a Service Professional reports genuine behaviour, Homelyo shall undertake the following: Investigate the claim within 5 working days; Take corrective action against the offending party; Provide feedback to the reporting partner on the outcome.',
      },
    ],
  },
  {
    id: 'support',
    icon: 'heart-outline',
    iconColor: '#14b8a6',
    iconBg: '#f0fdfa',
    title: 'Additional Support Measures',
    intro:
      'Homelyo continuously works with Service Professionals and their representatives to improve welfare. The following additional support measures are in place:',
    items: [
      {
        text: 'Periodic Welfare Reviews: Homelyo conducts quarterly reviews of service professional welfare policies and communicates updates via the app.',
      },
      {
        text: 'Mental Health & Well-Being: Partners facing personal hardship can reach out to the support team for temporary schedule flexibility.',
      },
      {
        text: 'Financial Assistance: In cases of medical emergency or severe hardship, Homelyo may provide advance payouts on a case-by-case basis.',
      },
      {
        text: 'Skill Development: Free training resources and video guides are available in the Training section of the app at all times.',
      },
      {
        text: 'Feedback Forum: Service Professionals can submit platform feedback and policy improvement suggestions through the Help Center.',
      },
    ],
  },
  {
    id: 'safety',
    icon: 'medkit-outline',
    iconColor: '#ef4444',
    iconBg: '#fef2f2',
    title: 'Policy for Ensuring Service Professional Safety',
    intro: 'Homelyo is committed to the physical safety of every partner on every job.',
    subSections: [
      {
        heading: 'A. Service Scheduling and Conduct',
        items: [
          {
            text: 'Service professionals are not assigned jobs within 10 miles of their home unless they explicitly opt in.',
          },
          { text: 'Partners have the ability to set their own service hours and maximum daily job limits via the Calendar screen.' },
          { text: 'Confirmed job locations and customer details are shared in advance so partners can make informed decisions.' },
          { text: 'All customers are verified with phone number before any booking is allowed on the platform.' },
        ],
      },
      {
        heading: 'B. Safety Protocol During Jobs',
        items: [
          { text: 'Every job is OTP-protected — a customer must provide the start OTP before the job begins.' },
          {
            text: 'Partners can raise an emergency support ticket from any active job screen if they feel unsafe.',
          },
          {
            text: 'Before/after photo documentation is required for all jobs, protecting partners in case of customer disputes.',
          },
          {
            text: 'Homelyo does not share a partner\'s personal phone number or home address with customers at any time.',
          },
        ],
      },
      {
        heading: 'C. Dealing with Difficult Customers',
        items: [
          {
            text: 'Partners can report abusive or threatening customer behaviour via the Help Center. Such reports are prioritised.',
          },
          {
            text: 'Customers with repeated reports of misconduct are investigated and may be permanently removed from the platform.',
          },
          {
            text: 'Partners will not be penalised for refusing a job where safety concerns have been formally reported.',
          },
          {
            text: 'In case of physical harm or threat, Homelyo will provide full cooperation with law enforcement authorities.',
          },
        ],
      },
    ],
  },
  {
    id: 'antidiscrimination',
    icon: 'hand-left-outline',
    iconColor: '#f97316',
    iconBg: '#fff7ed',
    title: 'Anti-Discrimination Protocol for Service Professionals',
    intro:
      'Homelyo is committed to upholding the principles of diversity, inclusion, and respect, and the policy serves as a testament to our commitment to creating a discrimination-free platform for all service professionals.',
    items: [
      {
        text: 'No service professional shall face discrimination in job allocation, earnings, ratings, or platform access on the basis of gender, caste, religion, disability, language, or ethnicity.',
      },
      {
        text: 'Reporting Mechanism: All Service Professionals are encouraged to report any discriminatory behaviour through the Help Center. Reports are treated confidentially.',
      },
      {
        text: 'Investigation Process: All discrimination reports are thoroughly investigated by a designated team within 5 working days of receipt.',
      },
      {
        text: 'Partner & Customer Review: Both parties are contacted for their account during investigation. Third-party evidence (photos, OTP records) is reviewed.',
      },
      {
        text: 'Protective Measures: During any active investigation, the reporting partner is protected from any retaliatory account action.',
      },
      {
        text: 'Permanently Delisted: Partners or customers found to have engaged in discriminatory behaviour are permanently removed from the Homelyo platform. This measure ensures continued safety and dignity for all service professionals.',
      },
    ],
  },
];

// ─── Accordion Item ───────────────────────────────────────────────────────────

function AccordionItem({ section }: { section: Section }) {
  const [open, setOpen] = useState(false);

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  }

  return (
    <View style={styles.accordion}>
      <TouchableOpacity style={styles.accordionHeader} onPress={toggle} activeOpacity={0.7}>
        <View style={[styles.iconBox, { backgroundColor: section.iconBg }]}>
          <Ionicons name={section.icon as any} size={20} color={section.iconColor} />
        </View>
        <Text style={styles.accordionTitle}>{section.title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#94a3b8" />
      </TouchableOpacity>

      {open && (
        <View style={styles.accordionBody}>
          {section.intro && <Text style={styles.introText}>{section.intro}</Text>}

          {section.items?.map((item, i) => (
            <View key={i} style={styles.point}>
              <View style={[styles.bullet, { backgroundColor: section.iconColor }]} />
              <Text style={styles.pointBody}>{item.text}</Text>
            </View>
          ))}

          {section.subSections?.map((sub, si) => (
            <View key={si} style={styles.subSection}>
              <Text style={styles.subHeading}>{sub.heading}</Text>
              {sub.items.map((item, ii) => (
                <View key={ii} style={styles.point}>
                  <View style={[styles.bullet, { backgroundColor: section.iconColor }]} />
                  <Text style={styles.pointBody}>{item.text}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export const WelfarePolicyScreen = () => {
  const navigation = useNavigation<any>();
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadPDF() {
    setDownloading(true);
    try {
      const sectionsHtml = SECTIONS.map((s) => {
        const itemsHtml = s.items
          ?.map((p) => `<li>${p.text}</li>`)
          .join('') ?? '';
        const subHtml = s.subSections
          ?.map(
            (sub) =>
              `<h4>${sub.heading}</h4><ul>${sub.items.map((p) => `<li>${p.text}</li>`).join('')}</ul>`
          )
          .join('') ?? '';
        return `
          <div class="section">
            <h3>${s.title}</h3>
            ${s.intro ? `<p class="intro">${s.intro}</p>` : ''}
            ${itemsHtml ? `<ul>${itemsHtml}</ul>` : ''}
            ${subHtml}
          </div>`;
      }).join('');

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; color: #1e293b; }
              h1 { font-size: 22px; color: #0f172a; margin-bottom: 4px; }
              .meta { font-size: 12px; color: #64748b; margin-bottom: 8px; }
              .preamble { font-size: 13px; color: #475569; font-style: italic; border-left: 3px solid #6366f1; padding-left: 12px; margin-bottom: 24px; }
              .section { margin-bottom: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; }
              h3 { font-size: 15px; color: #0f172a; margin-bottom: 6px; }
              h4 { font-size: 13px; color: #334155; margin: 10px 0 4px; }
              .intro { font-size: 12px; color: #64748b; font-style: italic; margin-bottom: 8px; }
              ul { margin: 0; padding-left: 18px; }
              li { font-size: 13px; color: #475569; line-height: 1.7; margin-bottom: 4px; }
              .footer { margin-top: 32px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
            </style>
          </head>
          <body>
            <h1>Homelyo Partner Welfare Policy</h1>
            <p class="meta">Effective: March 2026</p>
            <p class="preamble">
              Homelyo is committed to supporting the physical, mental, and emotional well-being of every
              service professional. As partners, you shall be provided with a fair, safe, and respectful
              environment — and the resources and support you need to thrive.
            </p>
            ${sectionsHtml}
            <div class="footer">For questions, contact support@homelyoapp.com or raise a ticket via the Help Center in the app.</div>
          </body>
        </html>`;

      const { uri } = await Print.printToFileAsync({ html });
      const fileName = 'Homelyo_Partner_Welfare_Policy.pdf';

      if (Platform.OS === 'android') {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permissions.granted) return;
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          fileName,
          'application/pdf'
        );
        await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
        Alert.alert('Saved', 'Welfare Policy PDF saved to your selected folder.');
      } else {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Partner Welfare Policy</Text>
        <TouchableOpacity onPress={handleDownloadPDF} disabled={downloading} style={styles.downloadBtn}>
          {downloading
            ? <ActivityIndicator size="small" color={Colors.primary} />
            : <Ionicons name="download-outline" size={22} color={Colors.primary} />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="heart" size={28} color="#6366f1" />
          </View>
          <Text style={styles.heroTitle}>Homelyo Partner Welfare Policy</Text>
          <Text style={styles.heroDate}>Effective: March 2026</Text>
          <Text style={styles.heroBody}>
            Homelyo is committed to supporting the physical, mental, and emotional well-being of
            every service professional. As partners, you shall be provided with a fair, safe, and
            respectful environment — and the resources and support you need to thrive.
          </Text>
          <View style={styles.heroDivider} />
          <Text style={styles.heroPreamble}>
            Homelyo is committed to offering a fair and equitable platform. It is committed to
            establishing a safe working environment for all its service professionals. It will
            prioritise the safety of service professionals in all interactions.
          </Text>
        </View>

        {/* Sections */}
        <Text style={styles.sectionLabel}>TAP ANY SECTION TO READ</Text>
        {SECTIONS.map((s) => (
          <AccordionItem key={s.id} section={s} />
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <Ionicons name="information-circle-outline" size={16} color="#94a3b8" />
          <Text style={styles.footerText}>
            For questions about this policy, contact us at{' '}
            <Text style={styles.footerLink}>support@homelyoapp.com</Text>
            {' '}or raise a ticket via the Help Center.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  downloadBtn: { width: 40, alignItems: 'flex-end' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },

  content: { padding: Spacing.md, paddingBottom: 40 },

  hero: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  heroTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  heroDate: { fontSize: 11, color: '#94a3b8', marginTop: 4, marginBottom: 12 },
  heroBody: { fontSize: 13, color: '#475569', lineHeight: 20, textAlign: 'center' },
  heroDivider: { height: 1, backgroundColor: '#f1f5f9', width: '100%', marginVertical: 14 },
  heroPreamble: { fontSize: 12, color: '#64748b', lineHeight: 19, textAlign: 'center', fontStyle: 'italic' },

  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 2,
  },

  accordion: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  accordionTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: '#0f172a', lineHeight: 19 },

  accordionBody: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 10,
  },
  introText: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 19,
    marginBottom: 4,
    fontStyle: 'italic',
  },

  subSection: { marginTop: 6, gap: 8 },
  subHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    letterSpacing: 0.3,
    marginBottom: 2,
  },

  point: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    flexShrink: 0,
  },
  pointBody: { flex: 1, fontSize: 13, color: '#475569', lineHeight: 20 },

  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: '#fff',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  footerText: { flex: 1, fontSize: 12, color: '#94a3b8', lineHeight: 18 },
  footerLink: { color: Colors.primary },
});

export default WelfarePolicyScreen;
