import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  getLinkedAccountStatus,
  createLinkedAccount,
  CreateLinkedAccountRequest,
} from '../api/linkedAccountApi';

type AccountStatus = 'created' | 'activated' | 'suspended' | 'needs_clarification' | null;

const LinkedAccountSetupScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);
  const [accountStatus, setAccountStatus] = useState<AccountStatus>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const [formData, setFormData] = useState<CreateLinkedAccountRequest>({
    businessName: '',
    contactName: '',
    businessType: 'individual',
    pan: '',
    gst: '',
  });

  const [errors, setErrors] = useState({
    businessName: '',
    contactName: '',
    pan: '',
    gst: '',
  });

  useEffect(() => {
    checkAccountStatus();
  }, []);

  const checkAccountStatus = async () => {
    try {
      const response = await getLinkedAccountStatus();
      setHasAccount(response.data.hasLinkedAccount);
      setAccountStatus(response.data.status);
      setStatusMessage(response.data.message);
    } catch (error: any) {
      console.error('Failed to check account status', error);
      Alert.alert('Error', 'Failed to load account status');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors = {
      businessName: '',
      contactName: '',
      pan: '',
      gst: '',
    };

    let isValid = true;

    // Business Name validation
    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
      isValid = false;
    } else if (formData.businessName.trim().length < 3) {
      newErrors.businessName = 'Business name must be at least 3 characters';
      isValid = false;
    }

    // Contact Name validation
    if (!formData.contactName.trim()) {
      newErrors.contactName = 'Contact name is required';
      isValid = false;
    } else if (formData.contactName.trim().length < 2) {
      newErrors.contactName = 'Contact name must be at least 2 characters';
      isValid = false;
    }

    // PAN validation (if provided)
    if (formData.pan && formData.pan.length > 0) {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(formData.pan)) {
        newErrors.pan = 'Invalid PAN format (e.g., ABCDE1234F)';
        isValid = false;
      }
    }

    // GST validation (if provided)
    if (formData.gst && formData.gst.length > 0) {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(formData.gst)) {
        newErrors.gst = 'Invalid GST format';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    Alert.alert(
      'Create Payment Account',
      'This will create your Razorpay payment account. You can receive payments once activated (24-48 hours).',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: async () => {
            setSubmitting(true);
            try {
              const response = await createLinkedAccount(formData);

              if (response.success) {
                Alert.alert(
                  'Success! ✅',
                  'Your payment account has been created. You will be notified once it is activated (usually 24-48 hours).',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        checkAccountStatus();
                        navigation.goBack();
                      },
                    },
                  ]
                );
              } else {
                Alert.alert('Error', response.message || 'Failed to create account');
              }
            } catch (error: any) {
              console.error('Failed to create linked account', error);
              Alert.alert(
                'Error',
                error.response?.data?.message || 'Failed to create account. Please try again.'
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const getStatusBadge = () => {
    switch (accountStatus) {
      case 'activated':
        return { color: '#10b981', icon: 'checkmark-circle', text: 'Active' };
      case 'created':
        return { color: '#f59e0b', icon: 'time', text: 'Pending Review' };
      case 'suspended':
        return { color: '#ef4444', icon: 'alert-circle', text: 'Suspended' };
      case 'needs_clarification':
        return { color: '#3b82f6', icon: 'mail', text: 'Action Required' };
      default:
        return { color: '#6b7280', icon: 'help-circle', text: 'Unknown' };
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={styles.loadingText}>Loading account status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // If account already exists, show status screen
  if (hasAccount) {
    const badge = getStatusBadge();

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Account</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.statusCard}>
            <View style={[styles.statusBadge, { backgroundColor: badge.color + '20' }]}>
              <Ionicons name={badge.icon as any} size={48} color={badge.color} />
            </View>

            <Text style={styles.statusTitle}>{badge.text}</Text>
            <Text style={styles.statusMessage}>{statusMessage}</Text>

            {accountStatus === 'activated' && (
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color="#10b981" />
                <Text style={styles.infoText}>
                  You will automatically receive 80% of every payment when customers pay for your
                  services.
                </Text>
              </View>
            )}

            {accountStatus === 'created' && (
              <View style={styles.infoBox}>
                <Ionicons name="time-outline" size={20} color="#f59e0b" />
                <Text style={styles.infoText}>
                  Your account is being reviewed by Razorpay. This usually takes 24-48 hours. You
                  will receive an email once activated.
                </Text>
              </View>
            )}

            {accountStatus === 'needs_clarification' && (
              <View style={styles.infoBox}>
                <Ionicons name="mail-outline" size={20} color="#3b82f6" />
                <Text style={styles.infoText}>
                  Razorpay needs additional information. Please check your email for details.
                </Text>
              </View>
            )}

            {accountStatus === 'suspended' && (
              <View style={[styles.infoBox, { borderColor: '#ef4444' }]}>
                <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
                <Text style={[styles.infoText, { color: '#ef4444' }]}>
                  Your account has been suspended. Please contact support for assistance.
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => {
              setLoading(true);
              checkAccountStatus();
            }}
          >
            <Ionicons name="refresh" size={20} color="#7c3aed" />
            <Text style={styles.refreshButtonText}>Refresh Status</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Show setup form
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Setup Payment Account</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.introCard}>
          <Ionicons name="wallet" size={48} color="#7c3aed" />
          <Text style={styles.introTitle}>Receive Automatic Payments</Text>
          <Text style={styles.introText}>
            Setup your payment account to receive 80% of every booking payment automatically. This
            is a one-time setup.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Business Information</Text>

          {/* Business Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Business Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.businessName && styles.inputError]}
              placeholder="e.g., John's Cleaning Services"
              value={formData.businessName}
              onChangeText={(text) => {
                setFormData({ ...formData, businessName: text });
                setErrors({ ...errors, businessName: '' });
              }}
            />
            {errors.businessName ? (
              <Text style={styles.errorText}>{errors.businessName}</Text>
            ) : null}
          </View>

          {/* Contact Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Your Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.contactName && styles.inputError]}
              placeholder="e.g., John Doe"
              value={formData.contactName}
              onChangeText={(text) => {
                setFormData({ ...formData, contactName: text });
                setErrors({ ...errors, contactName: '' });
              }}
            />
            {errors.contactName ? (
              <Text style={styles.errorText}>{errors.contactName}</Text>
            ) : null}
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
            Optional (Speeds up activation)
          </Text>

          {/* PAN */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>PAN Number (Optional)</Text>
            <TextInput
              style={[styles.input, errors.pan && styles.inputError]}
              placeholder="ABCDE1234F"
              value={formData.pan}
              onChangeText={(text) => {
                setFormData({ ...formData, pan: text.toUpperCase() });
                setErrors({ ...errors, pan: '' });
              }}
              maxLength={10}
              autoCapitalize="characters"
            />
            {errors.pan ? <Text style={styles.errorText}>{errors.pan}</Text> : null}
            <Text style={styles.helperText}>Providing PAN speeds up account activation</Text>
          </View>

          {/* GST */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>GST Number (Optional)</Text>
            <TextInput
              style={[styles.input, errors.gst && styles.inputError]}
              placeholder="22ABCDE1234F1Z5"
              value={formData.gst}
              onChangeText={(text) => {
                setFormData({ ...formData, gst: text.toUpperCase() });
                setErrors({ ...errors, gst: '' });
              }}
              maxLength={15}
              autoCapitalize="characters"
            />
            {errors.gst ? <Text style={styles.errorText}>{errors.gst}</Text> : null}
            <Text style={styles.helperText}>Only if you have GST registration</Text>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark" size={20} color="#7c3aed" />
            <Text style={styles.infoText}>
              Your information is securely stored with Razorpay and will be used only for payment
              processing and KYC verification.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Create Payment Account</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  content: {
    flex: 1,
  },
  introCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    marginLeft: 8,
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: '#7c3aed',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
  statusCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  statusMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7c3aed',
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#7c3aed',
    marginLeft: 8,
  },
});

export default LinkedAccountSetupScreen;
