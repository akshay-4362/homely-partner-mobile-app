import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Spacing } from '../../theme/colors';

interface Props { children: React.ReactNode; style?: StyleProp<ViewStyle>; padding?: number; }

export const Card = ({ children, style, padding = Spacing.lg }: Props) => (
  <View style={[styles.card, { padding }, style]}>{children}</View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    shadowColor: Colors.shadowColor, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
});
