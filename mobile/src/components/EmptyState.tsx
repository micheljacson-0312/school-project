// Empty state — used when a list has no records.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../config/theme';

interface Props {
  title: string;
  hint?: string;
  icon?: string;
}

export default function EmptyState({ title, hint, icon = '📭' }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:  { alignItems: 'center', padding: theme.spacing.xl },
  icon:  { fontSize: 36, marginBottom: theme.spacing.md },
  title: { ...theme.font.body, fontWeight: '600', color: theme.colors.text },
  hint:  { ...theme.font.small, color: theme.colors.textMuted, marginTop: theme.spacing.xs, textAlign: 'center' },
});
