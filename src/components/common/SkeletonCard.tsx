import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../theme/colors';

export const SkeletonCard = () => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.skeleton, styles.skeletonHeader, { opacity: pulseAnim }]} />
      <Animated.View style={[styles.skeleton, styles.skeletonLine, { opacity: pulseAnim }]} />
      <Animated.View style={[styles.skeleton, styles.skeletonLineShort, { opacity: pulseAnim }]} />
    </View>
  );
};

export const SkeletonList = ({ count = 3 }: { count?: number }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  skeleton: {
    backgroundColor: Colors.gray200,
    borderRadius: 4,
  },
  skeletonHeader: {
    height: 20,
    width: '40%',
    marginBottom: 12,
  },
  skeletonLine: {
    height: 16,
    width: '100%',
    marginBottom: 8,
  },
  skeletonLineShort: {
    height: 16,
    width: '60%',
  },
});
