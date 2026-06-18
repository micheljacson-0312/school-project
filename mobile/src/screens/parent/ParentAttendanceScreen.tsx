// Parent → child attendance view. Same shape as the student attendance
// screen but reads /api/parent/children/:id/attendance and includes a
// ChildPicker at the top for parents with multiple children.
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import Screen from '../../components/Screen';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import ErrorBanner from '../../components/ErrorBanner';
import ChildPicker from '../../components/ChildPicker';
import { parentApi, ChildAttendanceRecord, ParentDashboard } from '../../api/parent';
import { theme } from '../../config/theme';

const STATUS_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  present: { bg: theme.colors.emeraldLight, fg: theme.colors.emerald, label: 'Present' },
  absent:  { bg: theme.colors.redLight,     fg: theme.colors.red,     label: 'Absent'  },
  late:    { bg: theme.colors.amberLight,   fg: theme.colors.amber,   label: 'Late'    },
  leave:   { bg: theme.colors.brandLight,   fg: theme.colors.brand,   label: 'Leave'   },
  holiday: { bg: '#e2e8f0',                 fg: theme.colors.textMuted, label: 'Holiday' },
};

export default function ParentAttendanceScreen() {
  const route = useRoute<any>();
  const initialStudentId: number | undefined = route.params?.studentId;

  const [children, setChildren] = useState<ParentDashboard['children']>([]);
  const [studentId, setStudentId] = useState<number | null>(initialStudentId || null);
  const [records, setRecords] = useState<ChildAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load children list once.
  useEffect(() => {
    (async () => {
      try {
        const d = await parentApi.dashboard();
        setChildren(d.children || []);
        if (!studentId && d.children?.length) setStudentId(d.children[0].student_id);
      } catch { /* swallow — error handled below */ }
    })();
  }, []);

  const load = useCallback(async (id: number) => {
    try {
      setError(null);
      const d = await parentApi.childAttendance(id);
      setRecords(d.records || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Could not load attendance');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    if (studentId == null) return;
    setLoading(true);
    load(studentId);
  }, [studentId, load]);

  // Summary
  const total = records.length;
  const present = (records.filter(r => r.status === 'present').length)
                + (records.filter(r => r.status === 'late').length);
  const pct = total > 0 ? Math.round((present / total) * 100) : null;

  return (
    <Screen refreshing={refreshing} onRefresh={() => studentId != null && load(studentId)}>
      <Text style={styles.h1}>Attendance</Text>

      <ChildPicker children={children} value={studentId} onChange={setStudentId} />

      {error && <ErrorBanner message={error} onRetry={() => studentId != null && load(studentId)} />}

      {loading ? <Text style={styles.loading}>Loading…</Text> :
        studentId == null ? null :
        <>
          {pct != null && (
            <Card title="Overall">
              <Text style={styles.pct}>{pct}%</Text>
              <Text style={styles.subtle}>of {total} recent days</Text>
            </Card>
          )}
          {records.length === 0 ? (
            <EmptyState title="No attendance records yet" hint="Records appear after the teacher marks them." icon="📅" />
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
        </>
      }
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { ...theme.font.body, color: theme.colors.textMuted, padding: theme.spacing.lg },
  h1: { ...theme.font.h1, color: theme.colors.text, marginBottom: theme.spacing.md },
  pct: { fontSize: 36, fontWeight: '700', color: theme.colors.emerald },
  subtle: { ...theme.font.small, color: theme.colors.textMuted, marginTop: theme.spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.sm, gap: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  badge: { paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, borderRadius: theme.radius.full },
  badgeText: { ...theme.font.small, fontWeight: '600' },
  rowDate: { ...theme.font.body, color: theme.colors.text },
  rowMeta: { ...theme.font.small, color: theme.colors.textMuted, marginTop: 2 },
});
