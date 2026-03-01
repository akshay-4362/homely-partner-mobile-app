import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius } from '../../theme/colors';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  label: string; onPress: () => void; variant?: Variant; size?: Size;
  loading?: boolean; disabled?: boolean; style?: ViewStyle; textStyle?: TextStyle; fullWidth?: boolean;
  icon?: string;
}

const variantMap = {
  primary: { bg: Colors.primary, text: '#fff', border: Colors.primary },
  secondary: { bg: Colors.primaryBg, text: Colors.primary, border: Colors.primaryBg },
  outline: { bg: 'transparent', text: Colors.primary, border: Colors.primary },
  ghost: { bg: 'transparent', text: Colors.textSecondary, border: 'transparent' },
  danger: { bg: Colors.errorBg, text: Colors.error, border: Colors.error },
};

const sizeMap = {
  sm: { py: 6, px: 12, fontSize: 13, radius: BorderRadius.sm },
  md: { py: 10, px: 20, fontSize: 15, radius: BorderRadius.md },
  lg: { py: 14, px: 28, fontSize: 16, radius: BorderRadius.lg },
};

export const Button = ({ label, onPress, variant = 'primary', size = 'md', loading, disabled, style, textStyle, fullWidth, icon }: Props) => {
  const v = variantMap[variant];
  const s = sizeMap[size];
  return (
    <TouchableOpacity
      onPress={onPress} disabled={disabled || loading}
      style={[styles.btn, { backgroundColor: v.bg, borderColor: v.border, paddingVertical: s.py, paddingHorizontal: s.px, borderRadius: s.radius, opacity: disabled ? 0.5 : 1, alignSelf: fullWidth ? 'stretch' : 'flex-start' }, style]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <View style={styles.inner}>
          {icon && <Ionicons name={icon as any} size={s.fontSize + 2} color={v.text} style={styles.icon} />}
          <Text style={[styles.text, { color: v.text, fontSize: s.fontSize }, textStyle]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  inner: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: 6 },
  text: { fontWeight: '600', letterSpacing: 0.2 },
});
