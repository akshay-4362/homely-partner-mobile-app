import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getLinkedAccountStatus } from '../api/linkedAccountApi';

const PaymentAccountBanner = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [hasAccount, setHasAccount] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [canReceivePayments, setCanReceivePayments] = useState(false);

  useEffect(() => {
    checkAccountStatus();

    // Refresh status every 5 minutes
    const interval = setInterval(() => {
      checkAccountStatus();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const checkAccountStatus = async () => {
    try {
      const response = await getLinkedAccountStatus();
      setHasAccount(response.data.hasLinkedAccount);
      setStatus(response.data.status);
      setCanReceivePayments(response.data.canReceivePayments);
    } catch (error) {
      console.error('Failed to check payment account status', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePress = () => {
    navigation.navigate('LinkedAccountSetup' as never);
  };

  if (loading) {
    return (
      <View style={styles.banner}>
        <ActivityIndicator size="small" color="#6b7280" />
      </View>
    );
  }

  // Active account - show success banner
  if (canReceivePayments) {
    return (
      <View style={[styles.banner, styles.successBanner]}>
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={20} color="#10b981" />
        </View>
        <Text style={[styles.bannerText, styles.successText]}>
          ✅ Payment account active
        </Text>
      </View>
    );
  }

  // Account pending activation
  if (hasAccount && status === 'created') {
    return (
      <TouchableOpacity
        style={[styles.banner, styles.pendingBanner]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="time" size={20} color="#f59e0b" />
        </View>
        <View style={styles.bannerContent}>
          <Text style={[styles.bannerText, styles.pendingText]}>
            ⏳ Payment account under review
          </Text>
          <Text style={styles.bannerSubtext}>
            Usually takes 24-48 hours • Tap to view status
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#f59e0b" />
      </TouchableOpacity>
    );
  }

  // Account needs clarification
  if (hasAccount && status === 'needs_clarification') {
    return (
      <TouchableOpacity
        style={[styles.banner, styles.actionBanner]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="mail" size={20} color="#3b82f6" />
        </View>
        <View style={styles.bannerContent}>
          <Text style={[styles.bannerText, styles.actionText]}>
            📧 Action required on payment account
          </Text>
          <Text style={styles.bannerSubtext}>
            Check your email for details • Tap to view
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#3b82f6" />
      </TouchableOpacity>
    );
  }

  // Account suspended
  if (hasAccount && status === 'suspended') {
    return (
      <TouchableOpacity
        style={[styles.banner, styles.errorBanner]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="alert-circle" size={20} color="#ef4444" />
        </View>
        <View style={styles.bannerContent}>
          <Text style={[styles.bannerText, styles.errorText]}>
            ⚠️ Payment account suspended
          </Text>
          <Text style={styles.bannerSubtext}>
            Contact support • Tap for details
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ef4444" />
      </TouchableOpacity>
    );
  }

  // No account - prompt to create
  return (
    <TouchableOpacity
      style={[styles.banner, styles.warningBanner]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="wallet" size={20} color="#dc2626" />
      </View>
      <View style={styles.bannerContent}>
        <Text style={[styles.bannerText, styles.warningText]}>
          ⚠️ Setup payment account to receive earnings
        </Text>
        <Text style={styles.bannerSubtext}>
          Takes 2 minutes • Tap to setup now
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#dc2626" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  iconContainer: {
    marginRight: 12,
  },
  bannerContent: {
    flex: 1,
  },
  bannerText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  bannerSubtext: {
    fontSize: 12,
    color: '#6b7280',
  },
  successBanner: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  successText: {
    color: '#15803d',
  },
  warningBanner: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  warningText: {
    color: '#dc2626',
  },
  pendingBanner: {
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
  },
  pendingText: {
    color: '#d97706',
  },
  actionBanner: {
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
  },
  actionText: {
    color: '#1d4ed8',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  errorText: {
    color: '#dc2626',
  },
});

export default PaymentAccountBanner;
