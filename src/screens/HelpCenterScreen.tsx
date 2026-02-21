import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Modal, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { Card } from '../components/common/Card';
import { SectionHeader } from '../components/common/SectionHeader';
import { supportTicketApi, SupportTicket, CreateTicketInput } from '../api/supportTicketApi';

export const HelpCenterScreen = () => {
  const navigation = useNavigation<any>();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);

  // Form state
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('other');

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const data = await supportTicketApi.getMyTickets();
      setTickets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading tickets:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTickets();
    setRefreshing(false);
  };

  const handleCreateTicket = async () => {
    if (!subject.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const input: CreateTicketInput = {
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority: isEmergency ? 'emergency' : 'medium',
      };

      await supportTicketApi.createTicket(input);
      Alert.alert('Success', 'Your ticket has been submitted. We will respond shortly.');
      setCreateModalVisible(false);
      resetForm();
      loadTickets();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create ticket');
    }
  };

  const resetForm = () => {
    setSubject('');
    setDescription('');
    setCategory('other');
    setIsEmergency(false);
  };

  const openCreateModal = (emergency = false) => {
    setIsEmergency(emergency);
    setCreateModalVisible(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return Colors.warning;
      case 'in_progress':
        return Colors.primary;
      case 'resolved':
        return Colors.success;
      case 'closed':
        return Colors.textSecondary;
      default:
        return Colors.textSecondary;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'emergency':
        return 'alert-circle';
      case 'high':
        return 'arrow-up-circle';
      case 'medium':
        return 'ellipse';
      case 'low':
        return 'arrow-down-circle';
      default:
        return 'ellipse';
    }
  };

  const openTickets = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress');
  const closedTickets = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <TouchableOpacity
          style={styles.emergencyBtn}
          onPress={() => openCreateModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="warning" size={20} color="#fff" />
          <Text style={styles.emergencyText}>Emergency</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        contentContainerStyle={styles.scroll}
      >
        {/* Contact Us Card */}
        <Card style={styles.contactCard}>
          <Text style={styles.contactTitle}>Need Help?</Text>
          <Text style={styles.contactSubtitle}>
            Contact our support team and we'll get back to you as soon as possible.
          </Text>
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => openCreateModal(false)}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
            <Text style={styles.contactBtnText}>Contact Us</Text>
          </TouchableOpacity>
        </Card>

        {/* Open Tickets */}
        {openTickets.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Open Tickets" />
            {openTickets.map((ticket) => (
              <TouchableOpacity
                key={ticket._id}
                style={styles.ticketCard}
                onPress={() => navigation.navigate('TicketDetail', { ticketId: ticket._id })}
                activeOpacity={0.7}
              >
                <View style={styles.ticketLeft}>
                  <View style={[styles.priorityIcon, { backgroundColor: Colors.errorBg }]}>
                    <Ionicons
                      name={getPriorityIcon(ticket.priority) as any}
                      size={20}
                      color={ticket.priority === 'emergency' ? Colors.error : Colors.textSecondary}
                    />
                  </View>
                  <View style={styles.ticketInfo}>
                    <Text style={styles.ticketSubject}>{ticket.subject}</Text>
                    <Text style={styles.ticketMeta}>
                      {ticket.category} • {new Date(ticket.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.ticketRight}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ticket.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(ticket.status) }]}>
                      {ticket.status.replace('_', ' ')}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Closed Tickets */}
        {closedTickets.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Previous Issues" />
            {closedTickets.slice(0, 5).map((ticket) => (
              <TouchableOpacity
                key={ticket._id}
                style={[styles.ticketCard, { opacity: 0.7 }]}
                onPress={() => navigation.navigate('TicketDetail', { ticketId: ticket._id })}
                activeOpacity={0.7}
              >
                <View style={styles.ticketLeft}>
                  <View style={[styles.priorityIcon, { backgroundColor: Colors.gray100 }]}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                  </View>
                  <View style={styles.ticketInfo}>
                    <Text style={styles.ticketSubject}>{ticket.subject}</Text>
                    <Text style={styles.ticketMeta}>
                      {ticket.category} • {new Date(ticket.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty State */}
        {tickets.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubble-ellipses-outline" size={48} color={Colors.gray300} />
            <Text style={styles.emptyTitle}>No Support Tickets</Text>
            <Text style={styles.emptySubtitle}>
              Need help? Contact us and we'll assist you right away.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Create Ticket Modal */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {isEmergency ? '🚨 Emergency Support' : 'Contact Support'}
            </Text>
            {isEmergency && (
              <Text style={styles.emergencyNotice}>
                Emergency tickets are prioritized and will be addressed immediately.
              </Text>
            )}

            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryRow}>
              {['payment', 'booking', 'technical', 'account', 'other'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                  onPress={() => setCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="Brief description of your issue"
              value={subject}
              onChangeText={setSubject}
              placeholderTextColor={Colors.textTertiary}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Provide more details about your issue"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor={Colors.textTertiary}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setCreateModalVisible(false);
                  resetForm();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, isEmergency && styles.emergencySubmitBtn]}
                onPress={handleCreateTicket}
                activeOpacity={0.7}
              >
                <Text style={styles.submitText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: 56,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emergencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  emergencyText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 24 },
  contactCard: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    marginBottom: Spacing.lg,
  },
  contactTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  contactSubtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.md },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    gap: 8,
  },
  contactBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  section: { marginBottom: Spacing.xl },
  ticketCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  ticketLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  priorityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  ticketInfo: { flex: 1 },
  ticketSubject: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  ticketMeta: { fontSize: 11, color: Colors.textTertiary, textTransform: 'capitalize' },
  ticketRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginTop: Spacing.md },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: Spacing.xl,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.xl,
    paddingBottom: 40,
    minHeight: 500,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.gray300,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  emergencyNotice: {
    fontSize: 12,
    color: Colors.error,
    backgroundColor: Colors.errorBg,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginBottom: 6, marginTop: Spacing.md },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
  categoryText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, textTransform: 'capitalize' },
  categoryTextActive: { color: Colors.primary },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  textArea: { height: 100, paddingTop: 10 },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  emergencySubmitBtn: { backgroundColor: Colors.error },
  submitText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
