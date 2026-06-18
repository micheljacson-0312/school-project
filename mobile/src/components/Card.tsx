// Card primitive — matches web's `card` / `card-body`.
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { theme } from '../config/theme';

interface Props {
  children?: React.ReactNode;
  title?: string;
  hint?: string;
  style?: ViewStyle;
}

export default function Card({ children, title, hint, style }: Props) {
  return (
    <View style={[styles.card, style]}>
      {title && <Text style={styles.title}>{title}</Text>}
      {hint && <Text style={styles.hint}>{hint}</Text>}
      <View>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  title: { ...theme.font.h2, marginBottom: theme.spacing.sm },
  hint:  { ...theme.font.small, color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
});
