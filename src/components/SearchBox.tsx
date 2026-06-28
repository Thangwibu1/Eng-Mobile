import React from 'react';
import { TextInputProps } from 'react-native';
import { Search } from 'lucide-react-native';
import { colors } from '../theme';
import { Input } from './Input';

export function SearchBox(props: TextInputProps) {
  return (
    <Input
      icon={<Search size={18} color={colors.muted} />}
      {...props}
    />
  );
}
