import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { agreementApi, Agreement } from '../api/agreementApi';
import { Colors, Spacing, BorderRadius } from '../theme/colors';

interface AgreementScreenProps {
  onAccepted?: () => void;   // callback after successful acceptance
  showBackButton?: boolean;  // show back arrow (false when used as gate)
}

export const AgreementScreen: React.FC<AgreementScreenProps> = ({
  onAccepted,
  showBackButton = false,
}) => {
  const navigation = useNavigation<any>();
  const scrollRef = useRef<ScrollView>(null);

  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [checked, setChecked] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await agreementApi.getActive();
      setAgreement(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load agreement. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleScroll(event: any) {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 40;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      setHasScrolledToBottom(true);
    }
  }

  async function handleAccept() {
    if (!agreement) return;
    if (!checked) {
      Alert.alert('Confirmation Required', 'Please tick the checkbox to confirm you have read the agreement.');
      return;
    }

    setAccepting(true);
    try {
      await agreementApi.accept(agreement._id);
      Alert.alert(
        'Agreement Accepted',
        `You have successfully accepted the ${agreement.title} v${agreement.version}.`,
        [
          {
            text: 'Continue',
            onPress: () => {
              if (onAccepted) {
                onAccepted();
              } else {
                navigation.goBack();
              }
            },
          },
        ]
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to accept agreement.';
      if (msg.includes('already accepted')) {
        Alert.alert('Already Accepted', 'You have already accepted this agreement version.');
        if (onAccepted) onAccepted();
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading agreement…</Text>
      </SafeAreaView>
    );
  }

  if (error || !agreement) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error || 'No active agreement found.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Render HTML content as plain text (strip tags for native display)
  const plainText = agreement.content
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n$1\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {showBackButton && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>{agreement.title}</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionBadgeText}>v{agreement.version}</Text>
          </View>
        </View>
      </View>

      {/* Agreement text */}
      <ScrollView
        ref={scrollRef}
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={200}
        showsVerticalScrollIndicator
      >
        {!hasScrolledToBottom && (
          <View style={styles.scrollHint}>
            <Ionicons name="arrow-down-circle" size={16} color="#6b7280" />
            <Text style={styles.scrollHintText}>Scroll to read the full agreement</Text>
          </View>
        )}
        <Text style={styles.agreementText}>{plainText}</Text>

        {agreement.documentUrl ? (
          <View style={styles.pdfNote}>
            <Ionicons name="document-text-outline" size={16} color={Colors.primary} />
            <Text style={styles.pdfNoteText}>
              Full PDF version available at:{' '}
              <Text style={styles.pdfLink}>{agreement.documentUrl}</Text>
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Footer: checkbox + accept button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setChecked((v) => !v)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
            {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <Text style={styles.checkboxLabel}>
            I have read and agree to the{' '}
            <Text style={styles.checkboxLabelBold}>{agreement.title}</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.acceptBtn, (!checked || accepting) && styles.acceptBtnDisabled]}
          onPress={handleAccept}
          disabled={!checked || accepting}
          activeOpacity={0.8}
        >
          {accepting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="shield-checkmark-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.acceptBtnText}>Accept Agreement</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, backgroundColor: '#fff' },
  loadingText: { marginTop: Spacing.sm, color: '#6b7280', fontSize: 14 },
  errorText: { marginTop: Spacing.md, color: '#ef4444', fontSize: 14, textAlign: 'center' },
  retryBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  retryBtnText: { color: '#fff', fontWeight: '600' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: { marginRight: Spacing.sm },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  versionBadge: {
    marginTop: 3,
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  versionBadgeText: { fontSize: 11, fontWeight: '600', color: '#64748b', fontFamily: 'monospace' },

  scrollArea: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: Spacing.md, paddingBottom: Spacing.xl },
  scrollHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: Spacing.sm,
    backgroundColor: '#f1f5f9',
    borderRadius: BorderRadius.md,
    paddingVertical: 6,
  },
  scrollHintText: { fontSize: 12, color: '#6b7280' },
  agreementText: { fontSize: 14, lineHeight: 22, color: '#334155' },
  pdfNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: Spacing.lg,
    padding: Spacing.sm,
    backgroundColor: '#eff6ff',
    borderRadius: BorderRadius.md,
  },
  pdfNoteText: { flex: 1, fontSize: 12, color: '#475569' },
  pdfLink: { color: Colors.primary, textDecorationLine: 'underline' },

  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#fff',
    gap: Spacing.md,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxLabel: { flex: 1, fontSize: 13, color: '#475569', lineHeight: 20 },
  checkboxLabelBold: { fontWeight: '600', color: '#0f172a' },
  acceptBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnDisabled: { opacity: 0.45 },
  acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default AgreementScreen;
