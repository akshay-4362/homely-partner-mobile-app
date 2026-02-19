import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';

export const Loader = ({ text = 'Loading...' }: { text?: string }) => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color={Colors.primary} />
    <Text style={styles.text}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  text: { marginTop: 12, fontSize: 14, color: Colors.textSecondary },
});
