import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { agreementApi, PartnerAgreementStatus } from '../api/agreementApi';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { formatDateIST } from '../utils/dateTime';

export const LegalScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [status, setStatus] = useState<PartnerAgreementStatus | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [s, h] = await Promise.all([
        agreementApi.getMy(),
        agreementApi.getMyHistory(),
      ]);
      setStatus(s);
      setHistory(h);
    } catch {
      // silently fail — show empty state
    } finally {
      setLoading(false);
    }
  }

  function handleViewDocument(url: string) {
    if (!url) {
      Alert.alert('Not Available', 'PDF document is not available for this agreement.');
      return;
    }
    Linking.openURL(url).catch(() =>
      Alert.alert('Error', 'Could not open the document.')
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  const current = status?.acceptance;
  const activeAgreement = status?.active;
  const isUpToDate = status?.isCurrentVersion;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Legal Documents</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Partner Agreement Card */}
        <Text style={styles.sectionLabel}>Partner Agreement</Text>

        {current ? (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Ionicons name="shield-checkmark" size={22} color="#10b981" />
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{current.agreementId?.title || 'Homelyo Partner Service Agreement'}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.versionBadge}>
                    <Text style={styles.versionBadgeText}>v{current.agreementVersion}</Text>
                  </View>
                  {isUpToDate ? (
                    <View style={[styles.statusBadge, styles.statusBadgeGreen]}>
                      <Text style={[styles.statusBadgeText, { color: '#10b981' }]}>Up to date</Text>
                    </View>
                  ) : (
                    <View style={[styles.statusBadge, styles.statusBadgeAmber]}>
                      <Text style={[styles.statusBadgeText, { color: '#f59e0b' }]}>Update required</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.metaText}>
                  Accepted on {formatDateIST(current.acceptedAt, {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigation.navigate('Agreement', { showBackButton: true })}
              >
                <Ionicons name="eye-outline" size={16} color={Colors.primary} />
                <Text style={styles.actionBtnText}>View Agreement</Text>
              </TouchableOpacity>

              {current.agreementId?.documentUrl ? (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnSecondary]}
                  onPress={() => handleViewDocument(current.agreementId.documentUrl)}
                >
                  <Ionicons name="download-outline" size={16} color="#475569" />
                  <Text style={[styles.actionBtnText, { color: '#475569' }]}>Download PDF</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {!isUpToDate && activeAgreement && (
              <View style={styles.updateBanner}>
                <Ionicons name="warning-outline" size={16} color="#f59e0b" />
                <Text style={styles.updateBannerText}>
                  New version v{activeAgreement.version} is available. Please accept it to continue receiving jobs.
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Agreement', { showBackButton: true })}
                >
                  <Text style={styles.updateBannerLink}>Accept now</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.noAgreementRow}>
              <Ionicons name="document-outline" size={40} color="#94a3b8" />
              <Text style={styles.noAgreementTitle}>No Agreement Accepted</Text>
              <Text style={styles.noAgreementSubtitle}>
                You must accept the Partner Service Agreement to receive job assignments.
              </Text>
              <TouchableOpacity
                style={styles.acceptNowBtn}
                onPress={() => navigation.navigate('Agreement', { showBackButton: true })}
              >
                <Text style={styles.acceptNowBtnText}>Review & Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Acceptance history */}
        {history.length > 1 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>Acceptance History</Text>
            {history.map((item: any) => (
              <View key={item._id} style={styles.historyItem}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#94a3b8" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyVersion}>v{item.agreementVersion}</Text>
                  <Text style={styles.historyDate}>
                    {formatDateIST(item.acceptedAt, {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backBtn: { marginRight: Spacing.sm },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  content: { padding: Spacing.md, paddingBottom: 40 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  card: {
    backgroundColor: '#fff', borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: '#e2e8f0',
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  versionBadge: {
    backgroundColor: '#f1f5f9', borderRadius: 99,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  versionBadgeText: { fontSize: 11, fontWeight: '600', color: '#475569', fontFamily: 'monospace' },
  statusBadge: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  statusBadgeGreen: { backgroundColor: '#ecfdf5' },
  statusBadgeAmber: { backgroundColor: '#fffbeb' },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  metaText: { fontSize: 12, color: '#64748b' },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: Spacing.md },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: Colors.primary,
    borderRadius: BorderRadius.md, paddingHorizontal: 12, paddingVertical: 7,
  },
  actionBtnSecondary: { borderColor: '#e2e8f0' },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  updateBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    marginTop: Spacing.md, padding: Spacing.sm,
    backgroundColor: '#fffbeb', borderRadius: BorderRadius.md,
  },
  updateBannerText: { flex: 1, fontSize: 12, color: '#78350f' },
  updateBannerLink: { fontSize: 12, fontWeight: '700', color: '#f59e0b', marginTop: 2 },
  noAgreementRow: { alignItems: 'center', paddingVertical: Spacing.lg, gap: 8 },
  noAgreementTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  noAgreementSubtitle: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 18 },
  acceptNowBtn: {
    marginTop: Spacing.sm, backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.lg, paddingVertical: 10,
  },
  acceptNowBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  historyItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: '#e2e8f0',
    padding: Spacing.sm, marginBottom: 6,
  },
  historyVersion: { fontSize: 13, fontWeight: '600', color: '#475569', fontFamily: 'monospace' },
  historyDate: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
});

export default LegalScreen;
