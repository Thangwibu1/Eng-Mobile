import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { api } from '../api';
import { Button, Input } from '../components';
import { AuthShell } from './AuthShell';

interface ForgotPasswordScreenProps {
  navigation: any;
}

export function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/auth/forgot-password', {
        identifier,
        newPassword: password,
        confirmPassword: confirm,
      }),
    onSuccess: () => {
      Alert.alert(
        'Password updated',
        'You can now log in with your new password.',
        [{ text: 'Log in', onPress: () => navigation.navigate('Login') }]
      );
    },
    onError: (e: any) => Alert.alert('Could not reset password', e.userMessage),
  });

  return (
    <AuthShell
      title="Reset password"
      subtitle="No worries — we'll get you back to learning."
    >
      <Input
        placeholder="Email or username"
        value={identifier}
        onChangeText={setIdentifier}
      />
      <Input
        placeholder="New password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Input
        placeholder="Confirm new password"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
      />
      <Button
        title="Update Password"
        disabled={!identifier || !password || password !== confirm}
        onPress={() => mutation.mutate()}
      />
    </AuthShell>
  );
}
