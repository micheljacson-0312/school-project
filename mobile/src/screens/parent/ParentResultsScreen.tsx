// Parent → child results view. Shows subject-wise marks + overall %.
// Includes ChildPicker at top.
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import Screen from '../../components/Screen';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import ErrorBanner from '../../components/ErrorBanner';
import ChildPicker from '../../components/ChildPicker';
import { parentApi, ChildResultSubject, ParentDashboard } from '../../api/parent';
import { theme } from '../../config/theme';

export default function ParentResultsScreen() {
  const route = useRoute<any>();
  const initialStudentId: number | undefined = route.params?.studentId;

  const [children, setChildren] = useState<ParentDashboard['children']>([]);
  const [studentId, setStudentId] = useState<number | null>(initialStudentId || null);
  const [subjects, setSubjects] = useState<ChildResultSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await parentApi.dashboard();
        setChildren(d.children || []);
        if (!studentId && d.children?.length) setStudentId(d.children[0].student_id);
      } catch {}
    })();
  }, []);

  const load = useCallback(async (id: number) => {
    try {
      setError(null);
      const d = await parentApi.childResults(id);
      setSubjects(d.subjects || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Could not load results');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    if (studentId == null) return;
    setLoading(true);
    load(studentId);
  }, [studentId, load]);

  const total = subjects.reduce((s, x) => s + (x.marks_obtained || 0), 0);
  const max = subjects.reduce((s, x) => s + (x.total_marks || 0), 0);
  const pct = max > 0 ? Math.round((total / max) * 100) : null;

  return (
    <Screen refreshing={refreshing} onRefresh={() => studentId != null && load(studentId)}>
      <Text style={styles.h1}>Results</Text>
      <ChildPicker children={children} value={studentId} onChange={setStudentId} />

      {error && <ErrorBanner message={error} onRetry={() => studentId != null && load(studentId)} />}

      {loading ? <Text style={styles.loading}>Loading…</Text> :
        studentId == null ? null :
        <>
          {pct != null && (
            <Card title="Overall percentage">
              <Text style={styles.pct}>{pct}%</Text>
              <Text style={styles.subtle}>{total} / {max} marks</Text>
            </Card>
          )}
          {subjects.length === 0 ? (
            <EmptyState title="No results yet" hint="Marks appear after the teacher uploads them." icon="📊" />
          ) : (
            <Card title="Subject-wise">
              {subjects.map((s, i) => {
                const sp = s.total_marks ? Math.round(((s.marks_obtained || 0) / s.total_marks) * 100) : null;
                return (
                  <View key={i} style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{s.name}</Text>
                      <Text style={styles.rowMeta}>{s.marks_obtained ?? '—'} / {s.total_marks ?? '—'}</Text>
                    </View>
                    <Text style={[styles.rowValue, { color: gradeColor(sp) }]}>
                      {sp != null ? `${sp}%` : '—'}{s.grade ? ` · ${s.grade}` : ''}
                    </Text>
                  </View>
                );
              })}
            </Card>
          )}
        />
      }
    </Screen>
  );
}

function gradeColor(p: number | null): string {
  if (p == null) return theme.colors.textMuted;
  if (p >= 80) return theme.colors.emerald;
  if (p >= 60) return theme.colors.brand;
  if (p >= 40) return theme.colors.amber;
  return theme.colors.red;
}

const styles = StyleSheet.create({
  loading: { ...theme.font.body, color: theme.colors.textMuted, padding: theme.spacing.lg },
  h1: { ...theme.font.h1, color: theme.colors.text, marginBottom: theme.spacing.md },
  pct: { fontSize: 36, fontWeight: '700', color: theme.colors.emerald },
  subtle: { ...theme.font.small, color: theme.colors.textMuted, marginTop: theme.spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.sm, gap: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  rowTitle: { ...theme.font.body, fontWeight: '600', color: theme.colors.text },
  rowMeta: { ...theme.font.small, color: theme.colors.textMuted, marginTop: 2 },
  rowValue: { ...theme.font.body, fontWeight: '700' },
});
