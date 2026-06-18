// Live classes — list + tap to join via Jitsi WebView.
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Screen from '../../components/Screen';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import ErrorBanner from '../../components/ErrorBanner';
import Button from '../../components/Button';
import { studentApi, LiveClassRow } from '../../api/student';
import { theme } from '../../config/theme';

const JITSI_BASE = 'https://meet.jit.si';

function jitsiUrl(room: string) { return `${JITSI_BASE}/${room}`; }

export default function StudentLiveClassesScreen() {
  const nav = useNavigation<any>();
  const [items, setItems] = useState<LiveClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const d = await studentApi.liveClasses();
      setItems(d.items || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Could not load classes');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function join(c: LiveClassRow) {
    if (c.status === 'cancelled' || c.status === 'ended') return;
    nav.navigate('WebView', { title: c.title, url: jitsiUrl(c.jitsi_room) });
  }

  if (loading) return <Screen><Text style={styles.loading}>Loading…</Text></Screen>;

  return (
    <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }}>
      <Text style={styles.h1}>Classes</Text>
      {error && <ErrorBanner message={error} onRetry={() => { setRefreshing(true); load(); }} />}

      {items.length === 0 ? (
        <EmptyState title="No classes scheduled" hint="Check back later or ask your teacher." icon="🎥" />
      ) : items.map(c => {
        const isLive = c.status === 'live';
        const isPast = c.status === 'ended' || c.status === 'cancelled';
        return (
          <Card key={c.id} title={c.title} hint={[c.subject_name, c.class_name && `Section ${c.section_name}`].filter(Boolean).join(' · ')}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowMeta}>
                  {new Date(c.starts_at).toLocaleString()}
                  {c.ends_at ? ` → ${new Date(c.ends_at).toLocaleTimeString()}` : ''}
                </Text>
                {c.teacher_name && <Text style={styles.rowMeta}>{c.teacher_name}</Text>}
              </View>
              <Text style={[styles.statusBadge, {
                backgroundColor: isLive ? theme.colors.emeraldLight : isPast ? theme.colors.border : theme.colors.amberLight,
                color:          isLive ? theme.colors.emerald      : isPast ? theme.colors.textMuted : theme.colors.amber,
              }]}>{c.status}</Text>
            </View>
            <Button title={isPast ? 'Recording (coming soon)' : isLive ? 'Join now' : 'Open when started'}
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
  rowMeta: { ...theme.font.small, color: theme.colors.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, borderRadius: theme.radius.full, ...theme.font.small, fontWeight: '700', textTransform: 'uppercase' },
});
