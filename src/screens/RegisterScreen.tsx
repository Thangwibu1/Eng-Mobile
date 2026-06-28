import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { auth } from '../api';
import { useAuth } from '../auth-context';
import { Button, Input } from '../components';
import { colors, fonts } from '../theme';
import { AuthShell } from './AuthShell';

interface RegisterScreenProps {
  navigation: any;
}

export function RegisterScreen({ navigation }: RegisterScreenProps) {
  const { setUser } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const mutation = useMutation({
    mutationFn: () => auth.register(username, email, password, confirm),
    onSuccess: (u) => {
      setUser(u);
      navigation.popToTop();
    },
    onError: (e: any) => Alert.alert('Registration failed', e.userMessage),
  });

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start learning one lovely word at a time."
    >
      <Input
        placeholder="Username"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      <Input
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <Input
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Input
        placeholder="Confirm password"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
      />
      
      <Button
        title={mutation.isPending ? 'Creating...' : 'Sign Up'}
        disabled={
          !username ||
          !email ||
          !password ||
          password !== confirm ||
          mutation.isPending
        }
        onPress={() => mutation.mutate()}
      />
      
      <View style={styles.switchContainer}>
        <Text style={styles.muted}>Already have an account?</Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.link}> Log in</Text>
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
