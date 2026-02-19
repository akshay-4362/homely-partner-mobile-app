import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../../theme/colors';

interface Props { title: string; action?: string; onAction?: () => void; }

export const SectionHeader = ({ title, action, onAction }: Props) => (
  <View style={styles.row}>
    <Text style={styles.title}>{title}</Text>
    {action && <TouchableOpacity onPress={onAction}><Text style={styles.action}>{action}</Text></TouchableOpacity>}
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  title: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  action: { fontSize: 14, fontWeight: '600', color: Colors.primary },
});
