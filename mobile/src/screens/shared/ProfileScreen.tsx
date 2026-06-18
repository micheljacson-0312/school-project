// Profile screen — shows current user + Logout button. Used by every
// role tab navigator's "Me" tab.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useSession } from '../../auth/SessionContext';
import { theme } from '../../config/theme';

export default function ProfileScreen() {
  const { user, logout } = useSession();
  if (!user) return <Screen><Text>—</Text></Screen>;
  return (
    <Screen>
      <Text style={styles.h1}>Profile</Text>
      <Card>
        <Text style={styles.name}>{user.full_name}</Text>
        <Text style={styles.role}>{user.role.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <View style={styles.perms}>
          <Text style={styles.permsTitle}>Permissions ({user.permissions.length})</Text>
          {user.permissions.slice(0, 8).map(p => (
            <Text key={p} style={styles.perm}>{p}</Text>
          ))}
          {user.permissions.length > 8 && (
            <Text style={styles.perm}>… and {user.permissions.length - 8} more</Text>
          )}
        </View>
      </Card>
      <Button title="Sign out" onPress={logout} variant="secondary" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { ...theme.font.h1, color: theme.colors.text, marginBottom: theme.spacing.md },
  name: { ...theme.font.h2, color: theme.colors.text },
  role: { ...theme.font.body, color: theme.colors.textMuted, marginTop: 2 },
  email: { ...theme.font.small, color: theme.colors.textSubtle, marginTop: theme.spacing.sm },
  perms: { marginTop: theme.spacing.lg, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border },
  permsTitle: { ...theme.font.label, color: theme.colors.textMuted, marginBottom: theme.spacing.xs },
  perm: { ...theme.font.small, color: theme.colors.textMuted, fontFamily: 'monospace' },
});
