import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';

interface SplashLoaderProps {
  visible?: boolean;
  onLoadComplete?: () => void;
}

export const SplashLoader: React.FC<SplashLoaderProps> = ({
  visible = true,
  onLoadComplete,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    // Icon entrance animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Animated loading dots
    const animateDots = () => {
      Animated.loop(
        Animated.stagger(200, [
          Animated.sequence([
            Animated.timing(dot1, {
              toValue: -10,
              duration: 400,
              easing: Easing.ease,
              useNativeDriver: true,
            }),
            Animated.timing(dot1, {
              toValue: 0,
              duration: 400,
              easing: Easing.ease,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(dot2, {
              toValue: -10,
              duration: 400,
              easing: Easing.ease,
              useNativeDriver: true,
            }),
            Animated.timing(dot2, {
              toValue: 0,
              duration: 400,
              easing: Easing.ease,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(dot3, {
              toValue: -10,
              duration: 400,
              easing: Easing.ease,
              useNativeDriver: true,
            }),
            Animated.timing(dot3, {
              toValue: 0,
              duration: 400,
              easing: Easing.ease,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    };

    animateDots();
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Gradient Background Effect */}
      <View style={styles.gradientBg} />

      {/* Main Content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Icon Container */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="home" size={80} color="#fff" />
          </View>
        </View>

        {/* App Name */}
        <Text style={styles.appName}>HOMELYO</Text>
        <Text style={styles.subtitle}>Professional Services</Text>

        {/* Animated Loading Dots */}
        <View style={styles.dotsContainer}>
          <Animated.View
            style={[styles.dot, { transform: [{ translateY: dot1 }] }]}
          />
          <Animated.View
            style={[styles.dot, { transform: [{ translateY: dot2 }] }]}
          />
          <Animated.View
            style={[styles.dot, { transform: [{ translateY: dot3 }] }]}
          />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.primary,
    opacity: 0.95,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 60,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
});
