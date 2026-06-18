// Button primitive — primary/secondary variants matching web.
import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle, ActivityIndicator } from 'react-native';
import { theme } from '../config/theme';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export default function Button({ title, onPress, variant = 'primary', loading, disabled, style }: Props) {
  const palette = variant === 'primary'
    ? { bg: theme.colors.brand, fg: theme.colors.white, border: 'transparent' }
    : variant === 'danger'
      ? { bg: theme.colors.red, fg: theme.colors.white, border: 'transparent' }
      : { bg: theme.colors.white, fg: theme.colors.text, border: theme.colors.border };
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: palette.bg, borderColor: palette.border },
        pressed && !isDisabled && { opacity: 0.85 },
        isDisabled && { opacity: 0.5 },
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={palette.fg} />
        : <Text style={[styles.label, { color: palette.fg }]}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  label: { ...theme.font.body, fontWeight: '600' },
});
