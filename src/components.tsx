import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { Search } from 'lucide-react-native';
import { colors, fonts, shadow } from './theme';

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return <View style={{ marginBottom: 22 }}><Text style={s.title}>{title}</Text>{subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}</View>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[] }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Pill({ children, color = colors.pink, background = colors.pinkSoft }: { children: React.ReactNode; color?: string; background?: string }) {
  return <View style={[s.pill, { backgroundColor: background }]}><Text style={[s.pillText, { color }]}>{children}</Text></View>;
}

export function Button({ title, onPress, variant = 'pink', disabled, icon }: any) {
  const palette: any = {
    pink: [colors.pink, colors.white], blue: [colors.blue, colors.white], white: [colors.white, colors.secondary],
    soft: [colors.pinkSoft, colors.pinkDark], danger: ['#FFF1F2', colors.danger],
  };
  return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, { backgroundColor: palette[variant][0], opacity: disabled ? .55 : pressed ? .82 : 1 }, variant === 'white' && { borderWidth: 1, borderColor: colors.border }]}>{icon}{<Text style={[s.buttonText, { color: palette[variant][1] }]}>{title}</Text>}</Pressable>;
}

export function Input({ icon, style, ...props }: TextInputProps & { icon?: React.ReactNode }) {
  return <View style={s.inputWrap}>{icon}<TextInput placeholderTextColor={colors.muted} style={[s.input, style]} {...props} /></View>;
}

export function SearchBox(props: TextInputProps) { return <Input icon={<Search size={18} color={colors.muted} />} {...props} />; }

export function Loading({ label = 'Loading...' }: { label?: string }) { return <View style={s.center}><ActivityIndicator color={colors.pink} size="large"/><Text style={s.loading}>{label}</Text></View>; }
export function Empty({ title = 'Nothing here yet', text }: { title?: string; text?: string }) { return <Card style={s.empty}><Text style={s.emptyIcon}>🌱</Text><Text style={s.emptyTitle}>{title}</Text>{text ? <Text style={s.subtitle}>{text}</Text> : null}</Card>; }

const s = StyleSheet.create({
  title: { fontFamily: fonts.bold, fontSize: 30, color: colors.ink, letterSpacing: -1 },
  subtitle: { fontFamily: fonts.medium, fontSize: 13, color: colors.secondary, marginTop: 5, lineHeight: 19 },
  card: { backgroundColor: colors.white, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F1F5F9', ...shadow },
  pill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { fontFamily: fonts.bold, fontSize: 10, textTransform: 'uppercase', letterSpacing: .6 },
  button: { minHeight: 46, borderRadius: 999, paddingHorizontal: 19, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: fonts.bold, fontSize: 13 },
  inputWrap: { minHeight: 50, borderRadius: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9' },
  input: { flex: 1, color: colors.ink, fontFamily: fonts.semibold, fontSize: 14, paddingVertical: 12 },
  center: { flex: 1, minHeight: 300, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loading: { fontFamily: fonts.bold, color: colors.secondary, fontSize: 12 },
  empty: { alignItems: 'center', paddingVertical: 40 }, emptyIcon: { fontSize: 42 },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink, marginTop: 10 },
});
