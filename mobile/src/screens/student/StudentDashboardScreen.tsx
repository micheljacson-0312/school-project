// Student dashboard — live metrics from /api/student/dashboard.
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import ErrorBanner from '../../components/ErrorBanner';
import { useSession } from '../../auth/SessionContext';
import { studentApi, StudentDashboard } from '../../api/student';
import { theme } from '../../config/theme';

export default function StudentDashboardScreen() {
  const { user } = useSession();
  const [data, setData] = useState<StudentDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const d = await studentApi.dashboard();
      setData(d);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Could not load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function onRefresh() { setRefreshing(true); load(); }

  if (loading) return <Screen><Text style={styles.loading}>Loading…</Text></Screen>;

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Text style={styles.greeting}>{data?.greeting || `Hello, ${user?.full_name}`}</Text>
      <Text style={styles.subtle}>
        {[data?.class_name, data?.section_name, data?.session_name, data?.admission_no && `Adm. ${data.admission_no}`]
          .filter(Boolean).join(' · ')}
      </Text>

      {error && <ErrorBanner message={error} onRetry={onRefresh} />}

      <Card title="Today">
        <View style={styles.metricRow}>
          <Metric label="Attendance" value={data?.attendance?.attendance_pct != null ? `${data.attendance.attendance_pct}%` : '—'} accent="sky" />
          <Metric label="Live classes" value={String(data?.live_classes?.length ?? 0)} accent="red" />
          <Metric label="Pending work" value={String(data?.pending_assignments?.length ?? 0)} accent="amber" />
          <Metric label="Unpaid" value={String(data?.fees?.unpaid_count ?? 0)} accent="purple" />
        </View>
      </Card>

      {data?.pending_assignments?.length ? (
        <Card title="Upcoming assignments" hint={`${data.pending_assignments.length} due soon`}>
          {data.pending_assignments.slice(0, 3).map((a: any) => (
            <View key={a.id} style={styles.row}>
              <Text style={styles.rowTitle}>{a.title}</Text>
              <Text style={styles.rowMeta}>Due {new Date(a.due_at).toLocaleDateString()}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      {data?.live_classes?.length ? (
        <Card title="Live classes today" hint="Tap Classes tab to join">
          {data.live_classes.slice(0, 3).map((c: any) => (
            <View key={c.id} style={styles.row}>
              <Text style={styles.rowTitle}>{c.title}</Text>
              <Text style={styles.rowMeta}>
                {c.subject_name} · {new Date(c.starts_at).toLocaleTimeString()} · {c.status}
              </Text>
            </View>
          ))}
        </Card>
      ) : (
        <Card title="Live classes">
          <EmptyState title="No classes scheduled" hint="Tap the Classes tab to see what's coming up." icon="🎥" />
        </Card>
      )}
    </Screen>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent: 'sky' | 'red' | 'amber' | 'purple' }) {
  const palette: any = {
    sky:    { bg: theme.colors.skyLight,    fg: theme.colors.sky },
    red:    { bg: theme.colors.redLight,    fg: theme.colors.red },
    amber:  { bg: theme.colors.amberLight,  fg: theme.colors.amber },
    purple: { bg: theme.colors.purpleLight, fg: theme.colors.purple },
  };
  const p = palette[accent];
  return (
    <View style={[styles.metric, { backgroundColor: p.bg }]}>
      <Text style={[styles.metricValue, { color: p.fg }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { ...theme.font.body, color: theme.colors.textMuted, padding: theme.spacing.lg },
  greeting: { ...theme.font.h1, color: theme.colors.text, marginBottom: theme.spacing.xs },
  subtle: { ...theme.font.small, color: theme.colors.textMuted, marginBottom: theme.spacing.md },
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  metric: {
    flexBasis: '47%',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    alignItems: 'flex-start',
  },
  metricValue: { fontSize: 22, fontWeight: '700' },
  metricLabel: { ...theme.font.small, color: theme.colors.textMuted, marginTop: 2 },
  row: { paddingVertical: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  rowTitle: { ...theme.font.body, fontWeight: '600', color: theme.colors.text },
  rowMeta:  { ...theme.font.small, color: theme.colors.textMuted, marginTop: 2 },
});
