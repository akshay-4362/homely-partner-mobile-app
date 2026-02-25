import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { supportTicketApi, SupportTicket, TicketMessage } from '../api/supportTicketApi';
import { useAppSelector } from '../hooks/useAppSelector';

export const TicketDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const ticketId = route.params?.ticketId;
  const { user } = useAppSelector((s) => s.auth);

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadTicket();
  }, []);

  const loadTicket = async () => {
    try {
      const data = await supportTicketApi.getTicketById(ticketId);
      setTicket(data);
      // Scroll to bottom after loading
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to load ticket');
      navigation.goBack();
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    setSending(true);
    try {
      await supportTicketApi.addMessage(ticketId, message.trim());
      setMessage('');
      loadTicket();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
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

  if (!ticket) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {ticket.subject}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ticket.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(ticket.status) }]}>
              {ticket.status.replace('_', ' ')}
            </Text>
          </View>
        </View>
      </View>

      {/* Ticket Info */}
      <View style={styles.ticketInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="pricetag-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.infoText}>Category: {ticket.category}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.infoText}>
            {new Date(ticket.createdAt).toLocaleDateString()} at{' '}
            {new Date(ticket.createdAt).toLocaleTimeString()}
          </Text>
        </View>
        {ticket.priority === 'emergency' && (
          <View style={[styles.infoRow, { backgroundColor: Colors.errorBg, padding: 6, borderRadius: 4 }]}>
            <Ionicons name="alert-circle" size={14} color={Colors.error} />
            <Text style={[styles.infoText, { color: Colors.error, fontWeight: '600' }]}>
              Emergency Priority
            </Text>
          </View>
        )}
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {/* Initial Description */}
        <View style={[styles.messageBubble, styles.userBubble]}>
          <Text style={styles.messageText}>{ticket.description}</Text>
          <Text style={styles.messageTime}>
            {new Date(ticket.createdAt).toLocaleTimeString()}
          </Text>
        </View>

        {/* Messages */}
        {ticket.messages.map((msg: TicketMessage) => {
          const isUser = msg.senderRole === 'professional';
          return (
            <View
              key={msg._id}
              style={[styles.messageBubble, isUser ? styles.userBubble : styles.adminBubble]}
            >
              {!isUser && <Text style={styles.adminLabel}>Support Team</Text>}
              <Text style={styles.messageText}>{msg.message}</Text>
              <Text style={styles.messageTime}>
                {new Date(msg.createdAt).toLocaleTimeString()}
              </Text>
            </View>
          );
        })}

        {/* Resolved/Closed Notice */}
        {(ticket.status === 'resolved' || ticket.status === 'closed') && (
          <View style={styles.closedNotice}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.closedText}>
              This ticket has been {ticket.status}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Message Input */}
      {ticket.status !== 'closed' && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type your message..."
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={500}
            placeholderTextColor={Colors.textTertiary}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!message.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSendMessage}
            disabled={!message.trim() || sending}
            activeOpacity={0.7}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
    gap: Spacing.md,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  ticketInfo: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 4,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 12, color: Colors.textSecondary },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: Spacing.xl, gap: Spacing.md },
  messageBubble: {
    maxWidth: '80%',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
  },
  adminBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  adminLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  messageText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
  messageTime: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  closedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: Spacing.md,
    backgroundColor: Colors.successBg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  closedText: { fontSize: 13, fontWeight: '600', color: Colors.success, textTransform: 'capitalize' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});
