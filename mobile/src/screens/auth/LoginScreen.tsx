// Login screen — accepts email OR CNIC. Demo accounts are in the
// server/.env.example; password is `Password123!` for all roles.
import React, { useState } from 'react';
import { StyleSheet, Text, View, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../../auth/SessionContext';
import Button from '../../components/Button';
import TextField from '../../components/TextField';
import { theme } from '../../config/theme';

const DEMO_USERS = [
  { role: 'Admin',       identifier: 'admin@school.test' },
  { role: 'Teacher',     identifier: 'teacher@school.test' },
  { role: 'Student',     identifier: 'student@school.test' },
  { role: 'Parent',      identifier: '42101-1234567-8' }, // CNIC login
  { role: 'Accountant',  identifier: 'accounts@school.test' },
  { role: 'Operator',    identifier: 'operator@school.test' },
  { role: 'Alumni',      identifier: 'alumni@school.test' },
];

export default function LoginScreen() {
  const { login, loginError, loading } = useSession();
  const [identifier, setIdentifier] = useState('student@school.test');
  const [password, setPassword] = useState('Password123!');

  async function onSubmit() {
    await login(identifier.trim(), password);
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.hero}>
          <Text style={styles.brand}>S</Text>
          <Text style={styles.h1}>City Public School</Text>
          <Text style={styles.tagline}>Member sign-in</Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Email or CNIC"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@school.test or 42101-1234567-8"
            required
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            required
          />
          {loginError && <Text style={styles.error}>{loginError}</Text>}
          <Button title="Sign in" onPress={onSubmit} loading={loading} />
        </View>

        <View style={styles.demo}>
          <Text style={styles.demoTitle}>Demo accounts (password: Password123!)</Text>
          {DEMO_USERS.map(d => (
            <Text key={d.role} style={styles.demoRow} onPress={() => { setIdentifier(d.identifier); setPassword('Password123!'); }}>
              {d.role.padEnd(10)} — {d.identifier}
            </Text>
          ))}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  flex: { flex: 1 },
  hero: { alignItems: 'center', paddingTop: theme.spacing.xl, paddingBottom: theme.spacing.lg },
  brand: {
    width: 64, height: 64, borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.brand, color: theme.colors.white,
    textAlign: 'center', textAlignVertical: 'center', lineHeight: 64,
    fontSize: 30, fontWeight: '700', marginBottom: theme.spacing.md,
  },
  h1: { ...theme.font.h1, color: theme.colors.text },
  tagline: { ...theme.font.small, color: theme.colors.textMuted, marginTop: theme.spacing.xs },
  form: { padding: theme.spacing.lg },
  error: { ...theme.font.small, color: theme.colors.red, marginBottom: theme.spacing.md },
  demo: {
    marginTop: 'auto',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  demoTitle: { ...theme.font.small, fontWeight: '600', color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  demoRow: { ...theme.font.small, color: theme.colors.text, paddingVertical: 2 },
});
