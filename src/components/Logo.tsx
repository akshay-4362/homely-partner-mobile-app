import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

interface LogoProps {
  width?: number;
  height?: number;
}

export const Logo: React.FC<LogoProps> = ({ width = 200, height }) => {
  // Aspect ratio of full logo: 840:198 ≈ 4.24:1
  const calculatedHeight = height ?? Math.round(width / 4.24);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/logo.png')}
        style={{ width, height: calculatedHeight }}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
