import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { Button } from './common/Button';
import { faceVerificationApi } from '../api/faceVerificationApi';

interface FaceVerificationModalProps {
  visible: boolean;
  bookingId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const FaceVerificationModal: React.FC<FaceVerificationModalProps> = ({
  visible,
  bookingId,
  onSuccess,
  onCancel,
}) => {
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [selfieBase64, setSelfieBase64] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const takeSelfie = async () => {
    try {
      // Request camera permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to verify your identity.');
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
        cameraType: ImagePicker.CameraType.front, // Front camera for selfie
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelfieUri(asset.uri);
        setSelfieBase64(asset.base64 || null);
      }
    } catch (error) {
      console.error('Error taking selfie:', error);
      Alert.alert('Error', 'Failed to capture selfie. Please try again.');
    }
  };

  const retakeSelfie = () => {
    setSelfieUri(null);
    setSelfieBase64(null);
  };

  const verifySelfie = async () => {
    if (!selfieBase64) {
      Alert.alert('Error', 'Please take a selfie first');
      return;
    }

    setVerifying(true);
    try {
      const result = await faceVerificationApi.verifyFace(selfieBase64, bookingId);

      if (result.success) {
        Alert.alert(
          'Verification Successful',
          `Your identity has been verified with ${result.similarity.toFixed(0)}% confidence. You can now start the job.`,
          [{ text: 'Continue', onPress: onSuccess }]
        );
      } else {
        Alert.alert(
          'Verification Failed',
          result.message || 'Face verification failed. Please ensure you are the registered professional and try again.',
          [
            { text: 'Retry', onPress: retakeSelfie },
            { text: 'Cancel', onPress: onCancel, style: 'cancel' },
          ]
        );
      }
    } catch (error: any) {
      console.error('Face verification error:', error);
      Alert.alert(
        'Verification Error',
        error.response?.data?.message || 'Failed to verify identity. Please try again.',
        [
          { text: 'Retry', onPress: retakeSelfie },
          { text: 'Cancel', onPress: onCancel, style: 'cancel' },
        ]
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleClose = () => {
    setSelfieUri(null);
    setSelfieBase64(null);
    onCancel();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Identity Verification</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.infoBox}>
              <Ionicons name="shield-checkmark" size={40} color={Colors.primary} />
              <Text style={styles.infoTitle}>Verify Your Identity</Text>
              <Text style={styles.infoText}>
                For security purposes, please take a selfie to verify your identity before starting this job.
              </Text>
            </View>

            {selfieUri ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: selfieUri }} style={styles.preview} />
                <Button
                  label="Retake Selfie"
                  onPress={retakeSelfie}
                  variant="secondary"
                  style={styles.button}
                />
              </View>
            ) : (
              <View style={styles.captureContainer}>
                <TouchableOpacity style={styles.captureButton} onPress={takeSelfie}>
                  <Ionicons name="camera" size={60} color="#fff" />
                  <Text style={styles.captureText}>Tap to Take Selfie</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.instructions}>
              <Text style={styles.instructionTitle}>Instructions:</Text>
              <Text style={styles.instructionItem}>• Face the camera directly</Text>
              <Text style={styles.instructionItem}>• Ensure good lighting</Text>
              <Text style={styles.instructionItem}>• Remove sunglasses or masks</Text>
              <Text style={styles.instructionItem}>• Look at the camera</Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            {selfieUri ? (
              <Button
                label={verifying ? 'Verifying...' : 'Verify & Continue'}
                onPress={verifySelfie}
                disabled={verifying || !selfieBase64}
              />
            ) : null}
            <Button label="Cancel" onPress={handleClose} variant="secondary" />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  container: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    width: '100%',
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  infoBox: {
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  captureContainer: {
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  captureButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  captureText: {
    marginTop: Spacing.sm,
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  previewContainer: {
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  preview: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: Spacing.md,
  },
  button: {
    marginTop: Spacing.sm,
  },
  instructions: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  instructionItem: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  footer: {
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
