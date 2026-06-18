// Notifications inbox — /api/notifications (audience-filtered) +
// mark-as-read on tap. Pull-to-refresh.
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import { studentApi } from '../../api/student';
import Screen from '../../components/Screen';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import ErrorBanner from '../../components/ErrorBanner';
import { theme } from '../../config/theme';

interface NotificationItem {
  id: number; title: string; body?: string; category?: string;
  created_at: string; is_read: boolean;
}

export default function NotificationsScreen() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const r = await api.get('/api/notifications');
      setItems((r.data?.items || []) as NotificationItem[]);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Could not load notifications');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markRead(n: NotificationItem) {
    if (n.is_read) return;
    try {
      await studentApi.markNotificationRead(n.id);
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    } catch { /* ignore */ }
  }

  if (loading) return <Screen><Text style={styles.loading}>Loading…</Text></Screen>;

  return (
    <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }}>
      <Text style={styles.h1}>Inbox</Text>
      {error && <ErrorBanner message={error} onRetry={() => { setRefreshing(true); load(); }} />}
      {items.length === 0 ? (
        <EmptyState title="No notifications yet" hint="School announcements will appear here." icon="🔔" />
      ) : items.map(n => (
        <Card key={n.id} onTouchEnd={() => markRead(n)}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, !n.is_read && styles.unread]}>{n.title}</Text>
              {n.body && <Text style={styles.body}>{n.body}</Text>}
              <Text style={styles.meta}>{new Date(n.created_at).toLocaleString()}</Text>
            </View>
            {!n.is_read && <View style={styles.dot} />}
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { ...theme.font.body, color: theme.colors.textMuted, padding: theme.spacing.lg },
  h1: { ...theme.font.h1, color: theme.colors.text, marginBottom: theme.spacing.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm },
  title: { ...theme.font.body, fontWeight: '600', color: theme.colors.text },
  unread: { color: theme.colors.brand },
  body: { ...theme.font.body, color: theme.colors.textMuted, marginTop: theme.spacing.xs },
  meta: { ...theme.font.small, color: theme.colors.textSubtle, marginTop: theme.spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.brand, marginTop: 6 },
});
