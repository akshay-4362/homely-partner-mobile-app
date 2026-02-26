import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

interface RatingDisplayProps {
  rating: number;
  reviewCount?: number;
  size?: 'small' | 'medium' | 'large';
  showCount?: boolean;
  style?: ViewStyle;
}

export const RatingDisplay: React.FC<RatingDisplayProps> = ({
  rating,
  reviewCount = 0,
  size = 'medium',
  showCount = true,
  style,
}) => {
  const getSizes = () => {
    switch (size) {
      case 'small':
        return { star: 14, text: 13 };
      case 'large':
        return { star: 24, text: 18 };
      default:
        return { star: 16, text: 14 };
    }
  };

  const sizes = getSizes();
  const displayRating = Math.min(5, Math.max(0, rating)).toFixed(1);

  return (
    <View style={[styles.container, style]}>
      <Ionicons name="star" size={sizes.star} color="#FFB800" />
      <Text style={[styles.rating, { fontSize: sizes.text }]}>
        {displayRating}
      </Text>
      {showCount && reviewCount > 0 && (
        <Text style={[styles.count, { fontSize: sizes.text - 1 }]}>
          ({reviewCount})
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  count: {
    color: Colors.textSecondary,
  },
});
