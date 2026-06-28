import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, fonts } from '../theme';
import { Card } from './Card';

interface EmptyProps {
  title?: string;
  text?: string;
}

export function Empty({ title = 'Nothing here yet', text }: EmptyProps) {
  return (
    <Card style={styles.empty}>
      <Text style={styles.emptyIcon}>🌱</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {text ? <Text style={styles.subtitle}>{text}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 42,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.ink,
    marginTop: 10,
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.secondary,
    marginTop: 5,
    lineHeight: 19,
    textAlign: 'center',
  },
});
