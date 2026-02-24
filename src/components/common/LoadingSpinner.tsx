import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Modal } from 'react-native';
import { Colors } from '../../theme/colors';

interface LoadingSpinnerProps {
  visible?: boolean;
  text?: string;
  overlay?: boolean;
  size?: 'small' | 'large';
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  visible = true,
  text = 'Loading...',
  overlay = false,
  size = 'large',
  color = Colors.primary,
}) => {
  if (!visible) return null;

  const content = (
    <View style={[styles.container, overlay && styles.overlayContainer]}>
      <View style={styles.spinnerBox}>
        <ActivityIndicator size={size} color={color} />
        {text && <Text style={styles.text}>{text}</Text>}
      </View>
    </View>
  );

  if (overlay) {
    return (
      <Modal transparent visible={visible} animationType="fade">
        {content}
      </Modal>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  spinnerBox: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
});
