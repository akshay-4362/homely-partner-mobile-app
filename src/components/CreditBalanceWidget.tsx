import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState, AppDispatch } from '../store';
import { fetchCreditStats } from '../store/creditSlice';
import { Colors, Spacing } from '../theme/colors';
import { formatCurrency } from '../utils/format';

export const CreditBalanceWidget = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<any>();
  const { stats } = useSelector((state: RootState) => state.credit);

  useEffect(() => {
    dispatch(fetchCreditStats());
  }, []);

  const handlePress = () => {
    navigation.navigate('Credits');
  };

  if (!stats) return null;

  const isLow = stats.needsRecharge;
  const balance = stats.currentBalance;

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.7}>
      <View style={[styles.content, isLow && styles.contentWarning]}>
        <Ionicons
          name="flash"
          size={16}
          color={isLow ? Colors.error : Colors.primary}
        />
        <Text style={[styles.balance, isLow && styles.balanceWarning]}>
          {balance}
        </Text>
      </View>
      {isLow && <View style={styles.warningDot} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  contentWarning: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  balance: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  balanceWarning: {
    color: Colors.error,
  },
  warningDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
    borderWidth: 2,
    borderColor: '#fff',
  },
});
