import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../theme/colors';

interface Props { icon?: keyof typeof Ionicons.glyphMap; title: string; subtitle?: string; }

export const EmptyState = ({ icon = 'document-outline', title, subtitle }: Props) => (
  <View style={styles.container}>
    <View style={styles.iconWrap}><Ionicons name={icon} size={44} color={Colors.primaryLight} /></View>
    <Text style={styles.title}>{title}</Text>
    {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  iconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 6 },
});
