import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts } from '../theme';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: 'pink' | 'blue' | 'white' | 'soft' | 'danger';
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: any;
}

export function Button({
  title,
  onPress,
  variant = 'pink',
  disabled,
  icon,
  style,
}: ButtonProps) {
  const palette: Record<string, [string, string]> = {
    pink: [colors.pink, colors.white],
    blue: [colors.blue, colors.white],
    white: [colors.white, colors.secondary],
    soft: [colors.pinkSoft, colors.pinkDark],
    danger: ['#FFF1F2', colors.danger],
  };

  const currentPalette = palette[variant] || palette.pink;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: currentPalette[0],
          opacity: disabled ? 0.55 : pressed ? 0.82 : 1,
        },
        variant === 'white' && styles.whiteBorder,
        style,
      ]}
    >
      {icon}
      <Text style={[styles.buttonText, { color: currentPalette[1] }]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 46,
    borderRadius: 999,
    paddingHorizontal: 19,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  whiteBorder: {
    borderWidth: 1,
    borderColor: colors.border,
  },
});
