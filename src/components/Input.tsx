import React from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { colors, fonts } from '../theme';

interface InputProps extends TextInputProps {
  icon?: React.ReactNode;
}

export function Input({ icon, style, ...props }: InputProps) {
  return (
    <View style={styles.inputWrap}>
      {icon}
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrap: {
    minHeight: 50,
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  input: {
    flex: 1,
    color: colors.ink,
    fontFamily: fonts.semibold,
    fontSize: 14,
    paddingVertical: 12,
  },
});
