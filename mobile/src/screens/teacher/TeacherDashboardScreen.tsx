// Teacher dashboard — quick stats + today's classes + quick actions.
// "Mark today's attendance" button jumps straight to the Attendance tab.
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Screen from '../../components/Screen';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import ErrorBanner from '../../components/ErrorBanner';
import Button from '../../components/Button';
import { teacherApi, TeacherDashboard } from '../../api/teacher';
import { theme } from '../../config/theme';

export default function TeacherDashboardScreen() {
  const nav = useNavigation<any>();
  const [data, setData] = useState<TeacherDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [todayText, setTodayText] = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      const d = await teacherApi.dashboard();
      setData(d);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Could not load dashboard');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    setTodayText(new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }));
    load();
  }, [load]);

  if (loading) return <Screen><Text style={styles.loading}>Loading…</Text></Screen>;

  const t = data?.teacher;
  return (
    <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }}>
      <Text style={styles.h1}>{data?.greeting || 'Welcome'}</Text>
      <Text style={styles.subtle}>
        {t ? `${t.designation || 'Teacher'}${t.employee_code ? ` · Code ${t.employee_code}` : ''} · ${todayText}` : todayText}
      </Text>

      {error && <ErrorBanner message={error} onRetry={() => { setRefreshing(true); load(); }} />}

      <Card title="Quick actions">
        <View style={styles.actionRow}>
          <Button title={data?.today?.attendance_marked ? 'Attendance ✓' : 'Mark attendance'}
                  onPress={() => nav.navigate('Attendance')}
                  variant={data?.today?.attendance_marked ? 'secondary' : 'primary'} />
          <Button title="Start live class" onPress={() => nav.navigate('Classes')} variant="secondary" />
          <Button title="Upload results"   onPress={() => nav.navigate('Results')} variant="secondary" />
        </View>
      </Card>

      {data?.counts && (
        <Card title="Overview">
          <View style={styles.statsRow}>
            <Stat label="Students"   value={String(data.counts.students ?? 0)} color={theme.colors.brand} />
            <Stat label="Subjects"   value={String(data.counts.subjects ?? 0)} color={theme.colors.purple} />
            <Stat label="Lectures"   value={String(data.counts.lectures ?? 0)} color={theme.colors.sky} />
            <Stat label="To grade"   value={String(data.today?.pending_grading ?? 0)} color={theme.colors.amber} />
          </View>
        </Card>
      )}

      <Card title="Today's live classes">
        {(!data?.today?.live_classes || data.today.live_classes.length === 0) ? (
          <EmptyState title="Nothing scheduled today" hint="Use the Classes tab to schedule a session." icon="🎥" />
        ) : data.today.live_classes.map((c: any) => (
          <View key={c.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{c.title}</Text>
              <Text style={styles.rowMeta}>
                {c.subject_name} · {c.class_name}/{c.section_name} ·{' '}
                {new Date(c.starts_at).toLocaleTimeString()}
              </Text>
            </View>
            <Text style={[styles.statusBadge, {
              backgroundColor: c.status === 'live' ? theme.colors.emeraldLight : theme.colors.amberLight,
              color:          c.status === 'live' ? theme.colors.emerald      : theme.colors.amber,
            }]}>{c.status}</Text>
          </View>
        ))}
      </Card>

      {data?.assignments && data.assignments.length > 0 && (
        <Card title="My classes" hint={`${data.assignments.length} assignment(s)`}>
          {data.assignments.slice(0, 5).map(a => (
            <View key={a.id} style={styles.row}>
              <Text style={styles.rowTitle}>
                {a.class_name} · Section {a.section_name}
              </Text>
              <Text style={styles.rowMeta}>{a.subject_name}</Text>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { ...theme.font.body, color: theme.colors.textMuted, padding: theme.spacing.lg },
  h1: { ...theme.font.h1, color: theme.colors.text, marginBottom: theme.spacing.xs },
  subtle: { ...theme.font.small, color: theme.colors.textMuted, marginBottom: theme.spacing.md },
  actionRow: { flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' },
  statsRow: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.sm },
  stat: { flex: 1 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { ...theme.font.small, color: theme.colors.textMuted, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.sm, gap: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  rowTitle: { ...theme.font.body, fontWeight: '600', color: theme.colors.text },
  rowMeta: { ...theme.font.small, color: theme.colors.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, borderRadius: theme.radius.full, ...theme.font.small, fontWeight: '700', textTransform: 'uppercase' },
});
