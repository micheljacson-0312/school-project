// Inline error banner — used in screens when an API call fails.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../config/theme';

export default function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>⚠ {message}</Text>
      {onRetry && (
        <Text style={styles.retry} onPress={onRetry}>Tap to retry</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.redLight,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.red,
  },
  text:  { color: theme.colors.red, ...theme.font.body },
  retry: { color: theme.colors.red, ...theme.font.small, marginTop: theme.spacing.xs, fontWeight: '600' },
});
