import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

interface ScreenTitleProps {
  title: string;
  subtitle?: string;
}

export function ScreenTitle({ title, subtitle }: ScreenTitleProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 22,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 30,
    color: colors.ink,
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.secondary,
    marginTop: 5,
    lineHeight: 19,
  },
});
