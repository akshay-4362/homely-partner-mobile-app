import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Linking, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { Loader } from '../components/common/Loader';
import { formatDate } from '../utils/format';
import apiClient from '../api/client';

interface HelpTicket {
  _id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  category: string;
  createdAt: string;
  updatedAt: string;
  resolution?: string;
}

const FAQ_ITEMS = [
  {
    q: 'How do I accept a job?',
    a: 'Go to the Jobs tab → Upcoming section. Tap on a job card to view details. Jobs are auto-assigned, so you will be notified for each new booking.',
  },
  {
    q: 'How do I verify the start OTP?',
    a: 'Ask the customer for the 6-digit start OTP when you arrive. Enter it on the job detail screen to mark the job as started.',
  },
  {
    q: 'When do I get paid?',
    a: 'Payments are processed within 2-3 business days after job completion. You can track payouts in the Earnings → Payouts section.',
  },
  {
    q: 'How do I update my availability?',
    a: 'Go to Profile → Availability to set your weekly schedule. You can also block specific dates in the Calendar section.',
  },
  {
    q: 'What happens if I need to cancel a job?',
    a: 'You can request a cancellation from the job detail page. Frequent cancellations may affect your rating and penalty credits may be applied.',
  },
  {
    q: 'How do I raise an additional charge?',
    a: 'On the job detail screen, scroll down to find the "Additional Charges" section. Add charges with category and amount, and submit for customer approval.',
  },
];

export const HelpScreen = () => {
  const navigation = useNavigation<any>();
  const [tickets, setTickets] = useState<HelpTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => { load(); }, []);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiClient.get('/professional/help/tickets');
      setTickets(res.data?.data ?? []);
    } catch {
      setTickets(DEMO_TICKETS);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => { setRefreshing(true); load(true); };

  const handleCall = () => {
    Linking.openURL('tel:+918001234567').catch(() => {
      Alert.alert('Unable to open phone app');
    });
  };

  const handleEmail = () => {
    Linking.openURL('mailto:pro-support@homelyo.com').catch(() => {
      Alert.alert('Unable to open email app');
    });
  };

  const handleWhatsApp = () => {
    Linking.openURL('whatsapp://send?phone=918001234567&text=Hi, I need help with my Homelyo Pro account').catch(() => {
      Alert.alert('WhatsApp not installed');
    });
  };

  if (loading) return <Loader text="Loading help..." />;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={tickets}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={styles.scroll}
        ListHeaderComponent={
          <>
            {/* Contact Us */}
            <Text style={styles.sectionTitle}>Contact Us</Text>
            <Card style={styles.contactCard}>
              <View style={styles.contactGrid}>
                <ContactBtn icon="call" label="Call Support" color="#22C55E" onPress={handleCall} />
                <ContactBtn icon="logo-whatsapp" label="WhatsApp" color="#25D366" onPress={handleWhatsApp} />
                <ContactBtn icon="mail" label="Email Us" color={Colors.primary} onPress={handleEmail} />
              </View>
              <View style={styles.hoursRow}>
                <Ionicons name="time-outline" size={14} color={Colors.textTertiary} />
                <Text style={styles.hoursText}>Support available Mon–Sat, 9 AM – 6 PM</Text>
              </View>
            </Card>

            {/* FAQ */}
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
            <Card style={styles.faqCard}>
              {FAQ_ITEMS.map((item, idx) => (
                <View key={idx}>
                  <TouchableOpacity
                    style={[styles.faqRow, idx > 0 && styles.faqBorder]}
                    onPress={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.faqQ} numberOfLines={expandedFaq === idx ? undefined : 2}>{item.q}</Text>
                    <Ionicons
                      name={expandedFaq === idx ? 'chevron-up' : 'chevron-down'}
                      size={16} color={Colors.textTertiary}
                    />
                  </TouchableOpacity>
                  {expandedFaq === idx && (
                    <View style={styles.faqAnswer}>
                      <Text style={styles.faqA}>{item.a}</Text>
                    </View>
                  )}
                </View>
              ))}
            </Card>

            {/* Previous Issues */}
            <Text style={styles.sectionTitle}>Previous Issues</Text>
          </>
        }
        ListEmptyComponent={
          <EmptyState icon="chatbubble-outline" title="No issues reported" subtitle="Your support tickets will appear here" />
        }
        renderItem={({ item }) => <TicketCard ticket={item} />}
        ListFooterComponent={<View style={{ height: 32 }} />}
      />
    </View>
  );
};

const ContactBtn = ({ icon, label, color, onPress }: { icon: any; label: string; color: string; onPress: () => void }) => (
  <TouchableOpacity style={styles.contactBtn} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.contactIcon, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={styles.contactLabel}>{label}</Text>
  </TouchableOpacity>
);

const TicketCard = ({ ticket }: { ticket: HelpTicket }) => {
  const statusVariant: Record<string, any> = {
    open: 'info', in_progress: 'in_progress', resolved: 'completed', closed: 'cancelled',
  };

  return (
    <View style={styles.ticketCard}>
      <View style={styles.ticketHeader}>
        <Text style={styles.ticketSubject} numberOfLines={1}>{ticket.subject}</Text>
        <Badge label={ticket.status.replace('_', ' ')} variant={statusVariant[ticket.status] || 'info'} />
      </View>
      <Text style={styles.ticketDesc} numberOfLines={2}>{ticket.description}</Text>
      {ticket.resolution && (
        <View style={styles.resolutionBox}>
          <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
          <Text style={styles.resolutionText} numberOfLines={2}>{ticket.resolution}</Text>
        </View>
      )}
      <View style={styles.ticketFooter}>
        <Text style={styles.ticketCategory}>{ticket.category}</Text>
        <Text style={styles.ticketDate}>{formatDate(ticket.createdAt)}</Text>
      </View>
    </View>
  );
};

const DEMO_TICKETS: HelpTicket[] = [
  {
    _id: '1', subject: 'Payment not received for booking #1234',
    description: 'I completed the job 3 days ago but payment has not been credited to my account.',
    status: 'resolved', category: 'Payment', createdAt: new Date(Date.now() - 604800000).toISOString(),
    updatedAt: new Date(Date.now() - 259200000).toISOString(),
    resolution: 'Payment has been processed and should reflect within 24 hours.',
  },
  {
    _id: '2', subject: 'Customer gave wrong OTP',
    description: 'Customer shared incorrect completion OTP. Unable to close the job.',
    status: 'in_progress', category: 'Job Issue', createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  scroll: { padding: Spacing.xl, gap: 0 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  contactCard: { marginBottom: Spacing.md },
  contactGrid: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: Spacing.sm },
  contactBtn: { alignItems: 'center', gap: 8 },
  contactIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  contactLabel: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.divider },
  hoursText: { fontSize: 12, color: Colors.textTertiary },
  faqCard: { marginBottom: Spacing.md, padding: 0, overflow: 'hidden' },
  faqRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.sm, padding: Spacing.md },
  faqBorder: { borderTopWidth: 1, borderTopColor: Colors.divider },
  faqQ: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textPrimary, lineHeight: 20 },
  faqAnswer: { backgroundColor: Colors.primaryBg, padding: Spacing.md, paddingTop: 0 },
  faqA: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  ticketCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md,
    marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  ticketSubject: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginRight: 8 },
  ticketDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginBottom: 6 },
  resolutionBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#F0FDF4', borderRadius: BorderRadius.md, padding: 8, marginBottom: 6 },
  resolutionText: { flex: 1, fontSize: 12, color: Colors.success, lineHeight: 17 },
  ticketFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketCategory: { fontSize: 11, fontWeight: '600', color: Colors.textTertiary, textTransform: 'uppercase' },
  ticketDate: { fontSize: 12, color: Colors.textTertiary },
});
