// Text input — labeled, accessible, with optional error display.
import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { theme } from '../config/theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string | null;
  required?: boolean;
}

export default function TextField({ label, error, required, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      {label && (
        <Text style={styles.label}>
          {label}{required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <TextInput
        placeholderTextColor={theme.colors.textSubtle}
        style={[styles.input, error ? styles.inputError : null, style]}
        accessibilityLabel={label}
        {...rest}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: theme.spacing.md },
  label: { ...theme.font.label, color: theme.colors.textMuted, marginBottom: theme.spacing.xs },
  required: { color: theme.colors.red },
  input: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: 15,
    color: theme.colors.text,
    minHeight: 44,
  },
  inputError: { borderColor: theme.colors.red },
  error: { ...theme.font.small, color: theme.colors.red, marginTop: theme.spacing.xs },
});
