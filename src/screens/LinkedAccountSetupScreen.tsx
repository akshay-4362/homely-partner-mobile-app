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
import apiClient from '../api/client';

type AccountStatus = 'created' | 'activated' | 'suspended' | 'needs_clarification' | null;

const LinkedAccountSetupScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);
  const [accountStatus, setAccountStatus] = useState<AccountStatus>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const [step, setStep] = useState(1); // 1 = business details, 2 = bank details

  const [formData, setFormData] = useState<CreateLinkedAccountRequest>({
    businessName: '',
    contactName: '',
    businessType: 'individual',
    pan: '',
    gst: '',
  });

  const [bankDetails, setBankDetails] = useState({
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    accountType: 'savings' as 'savings' | 'current',
  });

  const [errors, setErrors] = useState({
    businessName: '',
    contactName: '',
    pan: '',
    gst: '',
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
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

  const validateBusinessDetails = (): boolean => {
    const newErrors = {
      businessName: '',
      contactName: '',
      pan: '',
      gst: '',
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
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

  const validateBankDetails = (): boolean => {
    const newErrors = {
      businessName: '',
      contactName: '',
      pan: '',
      gst: '',
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
    };

    let isValid = true;

    // Account Holder Name validation
    if (!bankDetails.accountHolderName.trim()) {
      newErrors.accountHolderName = 'Account holder name is required';
      isValid = false;
    } else if (bankDetails.accountHolderName.trim().length < 3) {
      newErrors.accountHolderName = 'Name must be at least 3 characters';
      isValid = false;
    }

    // Account Number validation
    if (!bankDetails.accountNumber.trim()) {
      newErrors.accountNumber = 'Account number is required';
      isValid = false;
    } else if (!/^\d{9,18}$/.test(bankDetails.accountNumber.trim())) {
      newErrors.accountNumber = 'Invalid account number (9-18 digits)';
      isValid = false;
    }

    // IFSC Code validation
    if (!bankDetails.ifscCode.trim()) {
      newErrors.ifscCode = 'IFSC code is required';
      isValid = false;
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankDetails.ifscCode.trim())) {
      newErrors.ifscCode = 'Invalid IFSC format (e.g., SBIN0001234)';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!validateBusinessDetails()) {
        return;
      }
      setStep(2);
    }
  };

  const handlePreviousStep = () => {
    if (step === 2) {
      setStep(1);
    }
  };

  const handleSubmit = async () => {
    if (!validateBankDetails()) {
      return;
    }

    Alert.alert(
      'Create Payment Account',
      'This will create your payment account with bank details. You can receive payments once activated (usually within 24-48 hours).',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: async () => {
            setSubmitting(true);
            try {
              // Step 1: Create linked account
              const accountResponse = await createLinkedAccount(formData);

              if (!accountResponse.success) {
                Alert.alert('Error', accountResponse.message || 'Failed to create account');
                setSubmitting(false);
                return;
              }

              // Step 2: Add bank account details
              const bankResponse = await apiClient.post('/linked-accounts/add-bank-account', {
                accountHolderName: bankDetails.accountHolderName,
                accountNumber: bankDetails.accountNumber,
                ifscCode: bankDetails.ifscCode,
                accountType: bankDetails.accountType,
              });

              if (bankResponse.data.success) {
                Alert.alert(
                  'Success! ✅',
                  'Your payment account has been created with bank details. You will be notified once it is activated (usually 24-48 hours).',
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
                Alert.alert('Error', 'Account created but failed to add bank details. Please contact support.');
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

        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, step >= 1 && styles.stepCircleActive]}>
              <Text style={[styles.stepNumber, step >= 1 && styles.stepNumberActive]}>1</Text>
            </View>
            <Text style={styles.stepLabel}>Business Details</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, step >= 2 && styles.stepCircleActive]}>
              <Text style={[styles.stepNumber, step >= 2 && styles.stepNumberActive]}>2</Text>
            </View>
            <Text style={styles.stepLabel}>Bank Account</Text>
          </View>
        </View>

        {step === 1 && (
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
            style={styles.submitButton}
            onPress={handleNextStep}
          >
            <Text style={styles.submitButtonText}>Next: Bank Account Details</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        )}

        {step === 2 && (
          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Bank Account Details</Text>
            <Text style={styles.sectionSubtitle}>
              Add your savings or current account to receive payments
            </Text>

            {/* Account Holder Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Account Holder Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.accountHolderName && styles.inputError]}
                placeholder="e.g., John Doe"
                value={bankDetails.accountHolderName}
                onChangeText={(text) => {
                  setBankDetails({ ...bankDetails, accountHolderName: text });
                  setErrors({ ...errors, accountHolderName: '' });
                }}
              />
              {errors.accountHolderName ? (
                <Text style={styles.errorText}>{errors.accountHolderName}</Text>
              ) : null}
              <Text style={styles.helperText}>Name as per bank records</Text>
            </View>

            {/* Account Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Account Number <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.accountNumber && styles.inputError]}
                placeholder="e.g., 1234567890"
                value={bankDetails.accountNumber}
                onChangeText={(text) => {
                  setBankDetails({ ...bankDetails, accountNumber: text.replace(/\D/g, '') });
                  setErrors({ ...errors, accountNumber: '' });
                }}
                keyboardType="number-pad"
                maxLength={18}
              />
              {errors.accountNumber ? (
                <Text style={styles.errorText}>{errors.accountNumber}</Text>
              ) : null}
              <Text style={styles.helperText}>9-18 digit bank account number</Text>
            </View>

            {/* IFSC Code */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                IFSC Code <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.ifscCode && styles.inputError]}
                placeholder="e.g., SBIN0001234"
                value={bankDetails.ifscCode}
                onChangeText={(text) => {
                  setBankDetails({ ...bankDetails, ifscCode: text.toUpperCase() });
                  setErrors({ ...errors, ifscCode: '' });
                }}
                autoCapitalize="characters"
                maxLength={11}
              />
              {errors.ifscCode ? (
                <Text style={styles.errorText}>{errors.ifscCode}</Text>
              ) : null}
              <Text style={styles.helperText}>11-character bank IFSC code</Text>
            </View>

            {/* Account Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Account Type</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setBankDetails({ ...bankDetails, accountType: 'savings' })}
                >
                  <View style={styles.radioCircle}>
                    {bankDetails.accountType === 'savings' && (
                      <View style={styles.radioSelected} />
                    )}
                  </View>
                  <Text style={styles.radioLabel}>Savings Account</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setBankDetails({ ...bankDetails, accountType: 'current' })}
                >
                  <View style={styles.radioCircle}>
                    {bankDetails.accountType === 'current' && (
                      <View style={styles.radioSelected} />
                    )}
                  </View>
                  <Text style={styles.radioLabel}>Current Account</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="lock-closed" size={20} color="#7c3aed" />
              <Text style={styles.infoText}>
                Your bank details are encrypted and securely stored. Razorpay will verify your
                account with a small test deposit (penny drop).
              </Text>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={handlePreviousStep}
              >
                <Ionicons name="arrow-back" size={20} color="#7c3aed" />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, styles.submitButtonFlex, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={styles.submitButtonText}>Create Account</Text>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
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
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  stepItem: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCircleActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
  },
  stepNumberActive: {
    color: '#fff',
  },
  stepLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    marginTop: -8,
  },
  radioGroup: {
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#7c3aed',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7c3aed',
  },
  radioLabel: {
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  backButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7c3aed',
    backgroundColor: '#fff',
    flex: 0.3,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7c3aed',
    marginLeft: 8,
  },
  submitButtonFlex: {
    flex: 0.7,
  },
});

export default LinkedAccountSetupScreen;
