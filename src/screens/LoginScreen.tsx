import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { auth } from '../api';
import { useAuth } from '../auth-context';
import { Button, Input } from '../components';
import { colors, fonts } from '../theme';
import { AuthShell } from './AuthShell';

interface LoginScreenProps {
  navigation: any;
}

export function LoginScreen({ navigation }: LoginScreenProps) {
  const { setUser } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: () => auth.login(identifier, password),
    onSuccess: (u) => {
      setUser(u);
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Login failed', e.userMessage),
  });

  return (
    <AuthShell
      title="Welcome back!"
      subtitle="Continue your gentle English learning journey."
    >
      <Input
        placeholder="Username or email"
        autoCapitalize="none"
        value={identifier}
        onChangeText={setIdentifier}
      />
      <Input
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      
      <Button
        title={mutation.isPending ? 'Logging in...' : 'Log In'}
        variant="blue"
        disabled={!identifier || !password || mutation.isPending}
        onPress={() => mutation.mutate()}
      />
      
      <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
        <Text style={styles.link}>Forgot password?</Text>
      </Pressable>
      
      <View style={styles.switchContainer}>
        <Text style={styles.muted}>New to AuraEnglish?</Text>
        <Pressable onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}> Create account</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  link: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.blue,
    textAlign: 'center',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  muted: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.secondary,
  },
});
