// Teacher → live classes (start / join via Jitsi WebView).
// Reuses the LMS endpoints /api/lms/live-classes which a teacher
// authored; we list all of them, sorted by start time, and let the
// teacher join the active/scheduled ones.
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Screen from '../../components/Screen';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import ErrorBanner from '../../components/ErrorBanner';
import Button from '../../components/Button';
import { api } from '../../api/client';
import { theme } from '../../config/theme';

const JITSI_BASE = 'https://meet.jit.si';
function jitsiUrl(room: string) { return `${JITSI_BASE}/${room}`; }

export default function TeacherLiveClassesScreen() {
  const nav = useNavigation<any>();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const d = await api.get('/api/lms/live-classes');
      setItems(d.data?.items || d.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Could not load classes');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function join(c: any) {
    if (c.status === 'cancelled' || c.status === 'ended') return;
    nav.navigate('WebView', { title: c.title, url: jitsiUrl(c.jitsi_room) });
  }

  if (loading) return <Screen><Text style={styles.loading}>Loading…</Text></Screen>;

  return (
    <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }}>
      <Text style={styles.h1}>Classes</Text>
      {error && <ErrorBanner message={error} onRetry={() => { setRefreshing(true); load(); }} />}

      {items.length === 0 ? (
        <EmptyState title="No classes scheduled" hint="Use the web admin to schedule a session — it will appear here." icon="🎥" />
      ) : items.map(c => {
        const isLive = c.status === 'live';
        const isPast = c.status === 'ended' || c.status === 'cancelled';
        return (
          <Card key={c.id} title={c.title} hint={[c.subject_name, c.class_name && `Section ${c.section_name}`].filter(Boolean).join(' · ')}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.meta}>{new Date(c.starts_at).toLocaleString()}</Text>
                {c.teacher_name && <Text style={styles.meta}>{c.teacher_name}</Text>}
              </View>
              <Text style={[styles.badge, {
                backgroundColor: isLive ? theme.colors.emeraldLight : isPast ? theme.colors.border : theme.colors.amberLight,
                color:          isLive ? theme.colors.emerald      : isPast ? theme.colors.textMuted : theme.colors.amber,
              }]}>{c.status}</Text>
            </View>
            <Button title={isPast ? 'Ended' : isLive ? 'Join now' : 'Open room'}
                    onPress={() => join(c)} variant={isLive ? 'primary' : 'secondary'}
                    disabled={!isLive && !isPast} />
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { ...theme.font.body, color: theme.colors.textMuted, padding: theme.spacing.lg },
  h1: { ...theme.font.h1, color: theme.colors.text, marginBottom: theme.spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.sm },
  meta: { ...theme.font.small, color: theme.colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, borderRadius: theme.radius.full, ...theme.font.small, fontWeight: '700', textTransform: 'uppercase' },
});
