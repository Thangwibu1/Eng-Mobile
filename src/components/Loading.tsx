import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

interface LoadingProps {
  label?: string;
}

export function Loading({ label = 'Loading...' }: LoadingProps) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.pink} size="large" />
      <Text style={styles.loading}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loading: {
    fontFamily: fonts.bold,
    color: colors.secondary,
    fontSize: 12,
  },
});
