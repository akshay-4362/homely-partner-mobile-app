import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing } from '../../theme/colors';

interface Props extends TextInputProps { label?: string; error?: string; password?: boolean; }

export const Input = ({ label, error, password, style, ...props }: Props) => {
  const [show, setShow] = useState(false);
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.wrap, error ? styles.wrapError : styles.wrapNormal]}>
        <TextInput style={[styles.input, style]} placeholderTextColor={Colors.textTertiary} secureTextEntry={password && !show} {...props} />
        {password && <TouchableOpacity onPress={() => setShow(!show)} style={styles.eye}><Ionicons name={show ? 'eye-off' : 'eye'} size={20} color={Colors.textTertiary} /></TouchableOpacity>}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  wrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: BorderRadius.md, backgroundColor: Colors.surface },
  wrapNormal: { borderColor: Colors.border },
  wrapError: { borderColor: Colors.error },
  input: { flex: 1, paddingHorizontal: Spacing.lg, paddingVertical: 12, fontSize: 15, color: Colors.textPrimary },
  eye: { paddingHorizontal: 12 },
  error: { fontSize: 12, color: Colors.error, marginTop: 4 },
});
