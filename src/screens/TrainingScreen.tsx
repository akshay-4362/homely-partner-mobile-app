import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { Card } from '../components/common/Card';
import { Loader } from '../components/common/Loader';
import { EmptyState } from '../components/common/EmptyState';
import apiClient from '../api/client';

type TrainingTab = 'pending' | 'completed';

interface TrainingModule {
  _id: string;
  title: string;
  description: string;
  category: string;
  duration: number; // minutes
  status: 'pending' | 'in_progress' | 'completed';
  mandatory: boolean;
  score?: number;
  completedAt?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
}

export const TrainingScreen = () => {
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<TrainingTab>('pending');
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiClient.get('/professional/training');
      setModules(res.data?.data ?? []);
    } catch {
      setModules(DEMO_MODULES);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => { setRefreshing(true); load(true); };

  const pending = modules.filter((m) => m.status !== 'completed');
  const completed = modules.filter((m) => m.status === 'completed');
  const displayed = tab === 'pending' ? pending : completed;

  const mandatory = pending.filter((m) => m.mandatory).length;
  const completedCount = completed.length;
  const totalCount = modules.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (loading) return <Loader text="Loading training..." />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Training</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Progress Card */}
      <View style={styles.progressSection}>
        <Card style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.progressLabel}>Overall Progress</Text>
              <Text style={styles.progressCount}>{completedCount}/{totalCount} modules</Text>
            </View>
            <View style={styles.progressCircle}>
              <Text style={styles.progressPct}>{progress}%</Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
          </View>
          {mandatory > 0 && (
            <View style={styles.mandatoryBadge}>
              <Ionicons name="warning" size={14} color={Colors.warning} />
              <Text style={styles.mandatoryText}>{mandatory} mandatory module{mandatory > 1 ? 's' : ''} pending</Text>
            </View>
          )}
        </Card>
      </View>

      {/* Tab Switch */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, tab === 'pending' && styles.tabActive]}
          onPress={() => setTab('pending')}
        >
          <Text style={[styles.tabText, tab === 'pending' && styles.tabTextActive]}>
            Pending ({pending.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'completed' && styles.tabActive]}
          onPress={() => setTab('completed')}
        >
          <Text style={[styles.tabText, tab === 'completed' && styles.tabTextActive]}>
            Completed ({completed.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayed}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <EmptyState
            icon={tab === 'pending' ? 'checkmark-circle-outline' : 'school-outline'}
            title={tab === 'pending' ? 'All caught up!' : 'No completed modules yet'}
            subtitle={tab === 'pending' ? 'No pending training modules' : 'Complete modules to see them here'}
          />
        }
        renderItem={({ item }) => <ModuleCard item={item} />}
      />
    </SafeAreaView>
  );
};

const ModuleCard = ({ item }: { item: TrainingModule }) => {
  const statusColor = item.status === 'completed' ? Colors.success : item.status === 'in_progress' ? Colors.warning : Colors.textSecondary;
  const catColors: Record<string, string> = {
    'safety': '#EF4444', 'customer_service': '#3B82F6', 'skills': '#8B5CF6',
    'compliance': '#F59E0B', 'tools': '#10B981',
  };
  const catColor = catColors[item.category] || Colors.primary;

  return (
    <TouchableOpacity style={styles.moduleCard} activeOpacity={0.7}>
      {/* Thumbnail placeholder */}
      <View style={[styles.thumbnail, { backgroundColor: catColor + '20' }]}>
        <Ionicons name="play-circle" size={36} color={catColor} />
        {item.status === 'completed' && (
          <View style={styles.completedOverlay}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
          </View>
        )}
      </View>

      <View style={styles.moduleContent}>
        <View style={styles.moduleTopRow}>
          <View style={[styles.categoryBadge, { backgroundColor: catColor + '20' }]}>
            <Text style={[styles.categoryText, { color: catColor }]}>{item.category.replace('_', ' ')}</Text>
          </View>
          {item.mandatory && (
            <View style={styles.mandatoryTag}>
              <Text style={styles.mandatoryTagText}>MANDATORY</Text>
            </View>
          )}
        </View>
        <Text style={styles.moduleTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.moduleDesc} numberOfLines={1}>{item.description}</Text>
        <View style={styles.moduleFooter}>
          <View style={styles.durationRow}>
            <Ionicons name="time-outline" size={12} color={Colors.textTertiary} />
            <Text style={styles.durationText}>{item.duration} min</Text>
          </View>
          {item.status === 'completed' && item.score !== undefined && (
            <Text style={styles.scoreText}>Score: {item.score}%</Text>
          )}
          {item.status === 'in_progress' && (
            <Text style={{ fontSize: 12, color: Colors.warning, fontWeight: '600' }}>In Progress</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const DEMO_MODULES: TrainingModule[] = [
  {
    _id: '1', title: 'Customer Greeting & Service Standards', description: 'Learn how to greet and interact professionally',
    category: 'customer_service', duration: 15, status: 'pending', mandatory: true,
  },
  {
    _id: '2', title: 'Safety Protocols & PPE Usage', description: 'Essential safety guidelines for on-site work',
    category: 'safety', duration: 30, status: 'in_progress', mandatory: true,
  },
  {
    _id: '3', title: 'Using the Homelyo Pro App', description: 'Complete guide to managing jobs on the app',
    category: 'tools', duration: 20, status: 'pending', mandatory: false,
  },
  {
    _id: '4', title: 'Service Quality Checklist', description: 'Quality standards and completion protocols',
    category: 'skills', duration: 25, status: 'completed', mandatory: false, score: 92,
    completedAt: new Date(Date.now() - 604800000).toISOString(),
  },
  {
    _id: '5', title: 'GST & Compliance Basics', description: 'Tax compliance for professional partners',
    category: 'compliance', duration: 20, status: 'completed', mandatory: false, score: 85,
    completedAt: new Date(Date.now() - 1209600000).toISOString(),
  },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Spacing.lg, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  progressSection: { padding: Spacing.xl, paddingBottom: Spacing.sm },
  progressCard: { gap: Spacing.md },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  progressCount: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  progressCircle: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primaryBg,
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: Colors.primary,
  },
  progressPct: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  progressBar: { height: 8, backgroundColor: Colors.gray100, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  mandatoryBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.warningBg, borderRadius: BorderRadius.md, padding: 8 },
  mandatoryText: { fontSize: 13, color: Colors.warning, fontWeight: '600' },
  tabBar: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    marginHorizontal: Spacing.xl, marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg, padding: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: BorderRadius.md },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: '#fff' },
  list: { paddingHorizontal: Spacing.xl, paddingBottom: Platform.OS === 'ios' ? 100 : 80, gap: 12 },
  moduleCard: {
    flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  thumbnail: { width: 100, height: 110, alignItems: 'center', justifyContent: 'center' },
  completedOverlay: {
    position: 'absolute', bottom: 6, right: 6,
    backgroundColor: Colors.surface, borderRadius: 12,
  },
  moduleContent: { flex: 1, padding: Spacing.md, gap: 4 },
  moduleTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  categoryBadge: { borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 2 },
  categoryText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  mandatoryTag: { backgroundColor: '#FEE2E2', borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 2 },
  mandatoryTagText: { fontSize: 9, fontWeight: '700', color: '#DC2626', letterSpacing: 0.5 },
  moduleTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  moduleDesc: { fontSize: 12, color: Colors.textSecondary },
  moduleFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  durationText: { fontSize: 12, color: Colors.textTertiary },
  scoreText: { fontSize: 12, fontWeight: '700', color: Colors.success },
});
