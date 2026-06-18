// Attendance view — list of recent records + summary % from dashboard.
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import ErrorBanner from '../../components/ErrorBanner';
import { studentApi, AttendanceRecord } from '../../api/student';
import { theme } from '../../config/theme';

const STATUS_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  present: { bg: theme.colors.emeraldLight, fg: theme.colors.emerald, label: 'Present' },
  absent:  { bg: theme.colors.redLight,     fg: theme.colors.red,     label: 'Absent'  },
  late:    { bg: theme.colors.amberLight,   fg: theme.colors.amber,   label: 'Late'    },
  leave:   { bg: theme.colors.brandLight,   fg: theme.colors.brand,   label: 'Leave'   },
  holiday: { bg: '#e2e8f0',                 fg: theme.colors.textMuted, label: 'Holiday' },
};

export default function StudentAttendanceScreen() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const d = await studentApi.attendance();
      setRecords(d.records || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Could not load attendance');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Aggregate summary
  const summary = records.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1; return acc;
  }, {});
  const total = records.length;
  const present = (summary.present || 0) + (summary.late || 0);
  const pct = total > 0 ? Math.round((present / total) * 100) : null;

  if (loading) return <Screen><Text style={styles.loading}>Loading…</Text></Screen>;

  return (
    <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }}>
      <Text style={styles.h1}>Attendance</Text>
      {error && <ErrorBanner message={error} onRetry={() => { setRefreshing(true); load(); }} />}

      {pct != null && (
        <Card title="Overall">
          <Text style={styles.pct}>{pct}%</Text>
          <Text style={styles.subtle}>of {total} recent days</Text>
        </Card>
      )}

      {records.length === 0 ? (
        <EmptyState title="No attendance records yet" hint="Records appear after your teacher marks attendance." icon="📅" />
      ) : (
        <Card title="Recent days" hint={`Last ${records.length} entries`}>
          {records.slice(0, 60).map(r => {
            const c = STATUS_COLORS[r.status] || STATUS_COLORS.holiday;
            return (
              <View key={r.date + r.status} style={styles.row}>
                <View style={[styles.badge, { backgroundColor: c.bg }]}>
                  <Text style={[styles.badgeText, { color: c.fg }]}>{c.label}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowDate}>{new Date(r.date).toLocaleDateString()}</Text>
                  {r.remarks && <Text style={styles.rowMeta}>{r.remarks}</Text>}
                </View>
              </View>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { ...theme.font.body, color: theme.colors.textMuted, padding: theme.spacing.lg },
  h1: { ...theme.font.h1, color: theme.colors.text, marginBottom: theme.spacing.md },
  pct: { fontSize: 36, fontWeight: '700', color: theme.colors.brand },
  subtle: { ...theme.font.small, color: theme.colors.textMuted, marginTop: theme.spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.sm, gap: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  badge: { paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, borderRadius: theme.radius.full },
  badgeText: { ...theme.font.small, fontWeight: '600' },
  rowDate: { ...theme.font.body, color: theme.colors.text },
  rowMeta: { ...theme.font.small, color: theme.colors.textMuted, marginTop: 2 },
});
