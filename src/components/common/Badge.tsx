import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius } from '../../theme/colors';

type BadgeVariant = 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'warning' | 'info' | 'default';

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  confirmed: { bg: Colors.confirmedBg, text: Colors.confirmed },
  in_progress: { bg: Colors.inProgressBg, text: Colors.inProgress },
  completed: { bg: Colors.completedBg, text: Colors.completed },
  cancelled: { bg: Colors.cancelledBg, text: Colors.cancelled },
  warning: { bg: Colors.warningBg, text: Colors.warning },
  info: { bg: Colors.infoBg, text: Colors.info },
  default: { bg: Colors.gray100, text: Colors.gray600 },
};

const statusToVariant = (status: string): BadgeVariant => {
  if (status === 'confirmed') return 'confirmed';
  if (status === 'in_progress') return 'in_progress';
  if (status === 'completed') return 'completed';
  if (status === 'cancelled' || status === 'cancellation_pending') return 'cancelled';
  return 'default';
};

interface Props {
  label: string;
  variant?: BadgeVariant;
  status?: string;
}

export const Badge = ({ label, variant, status }: Props) => {
  const v = variant || (status ? statusToVariant(status) : 'default');
  const style = variantStyles[v];
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.text, { color: style.text }]}>{label.toUpperCase().replace(/_/g, ' ')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full, alignSelf: 'flex-start' },
  text: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
});
