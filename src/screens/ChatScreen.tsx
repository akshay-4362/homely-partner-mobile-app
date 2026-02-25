import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppSelector } from '../hooks/useAppSelector';
import { getSocket } from '../hooks/useSocket';
import { chatApi } from '../api/chatApi';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { ChatMessage, ProBooking } from '../types';
import { timeAgo } from '../utils/format';

export const ChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const booking: ProBooking = route.params?.booking;
  const { user } = useAppSelector((s) => s.auth);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages();
    const socket = getSocket();
    if (socket) {
      socket.emit('join_booking', booking.id);
      socket.on('new_message', (msg: ChatMessage) => {
        setMessages((prev) => [...prev, msg]);
        listRef.current?.scrollToEnd({ animated: true });
      });
    }
    return () => {
      const s = getSocket();
      if (s) s.off('new_message');
    };
  }, []);

  const loadMessages = async () => {
    try {
      const data = await chatApi.getMessages(booking.id);
      const list = data?.data || data?.messages || data || [];
      setMessages(Array.isArray(list) ? list : []);
      await chatApi.markRead(booking.id);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
    } catch {}
  };

  const send = async () => {
    if (!text.trim() || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);
    try {
      const msg = await chatApi.sendMessage(booking.id, content);
      setMessages((prev) => [...prev, msg?.data || msg]);
      listRef.current?.scrollToEnd({ animated: true });
    } catch {}
    setSending(false);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMe = item.senderRole === 'professional';
    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        {!isMe && (
          <View style={styles.msgAvatar}>
            <Text style={styles.msgAvatarText}>{booking.customerName[0]}</Text>
          </View>
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.content}</Text>
          <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>{timeAgo(item.createdAt)}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{booking.customerName[0]}</Text>
          </View>
          <View>
            <Text style={styles.headerName}>{booking.customerName}</Text>
            <Text style={styles.headerService}>{booking.serviceName}</Text>
          </View>
        </View>
        <View style={{ width: 32 }} />
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m._id}
        renderItem={renderMessage}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Ionicons name="chatbubbles-outline" size={40} color={Colors.gray300} />
            <Text style={styles.emptyChatText}>No messages yet</Text>
            <Text style={styles.emptyChatSub}>Start the conversation with your customer</Text>
          </View>
        }
      />

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor={Colors.textTertiary}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={send}
          disabled={!text.trim() || sending}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  backBtn: { padding: 4 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarText: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  headerName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  headerService: { fontSize: 11, color: Colors.textSecondary },
  list: { padding: Spacing.xl, gap: Spacing.md, paddingBottom: Spacing.xl },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowMe: { flexDirection: 'row-reverse' },
  msgAvatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.gray200,
    alignItems: 'center', justifyContent: 'center',
  },
  msgAvatarText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  bubble: {
    maxWidth: '75%', borderRadius: BorderRadius.lg, padding: 10,
  },
  bubbleMe: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: Colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border },
  bubbleText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
  bubbleTextMe: { color: '#fff' },
  bubbleTime: { fontSize: 10, color: Colors.textTertiary, marginTop: 4, alignSelf: 'flex-end' },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.7)' },
  emptyChat: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyChatText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  emptyChatSub: { fontSize: 13, color: Colors.textTertiary, textAlign: 'center' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg, paddingVertical: 10, fontSize: 14,
    color: Colors.textPrimary, maxHeight: 100, backgroundColor: Colors.background,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.gray300 },
});
