import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { Card } from '../components';
import { colors, fonts } from '../theme';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.authPage}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.logo}>
        <Sparkles size={28} color={colors.white} />
      </View>
      <Text style={styles.brand}>
        Aura<Text style={{ color: colors.pink }}>English</Text>
      </Text>
      <Card style={styles.form}>
        <Text style={styles.authTitle}>{title}</Text>
        <Text style={styles.authSub}>{subtitle}</Text>
        {children}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  authPage: {
    flexGrow: 1,
    padding: 22,
    paddingTop: 60,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  logo: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontFamily: fonts.bold,
    fontSize: 23,
    color: colors.ink,
    marginVertical: 10,
  },
  form: {
    width: '100%',
    gap: 13,
    marginTop: 15,
  },
  authTitle: {
    fontFamily: fonts.bold,
    fontSize: 27,
    color: colors.ink,
    textAlign: 'center',
  },
  authSub: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.secondary,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 7,
  },
});
