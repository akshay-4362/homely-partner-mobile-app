import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

export const HeaderLogo = () => {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.text}>Homelyo Pro</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  text: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});
