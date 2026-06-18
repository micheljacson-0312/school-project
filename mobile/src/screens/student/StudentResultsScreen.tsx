// Results view — subject-wise marks + percentage + grade.
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import ErrorBanner from '../../components/ErrorBanner';
import { studentApi, ResultSubject } from '../../api/student';
import { theme } from '../../config/theme';

export default function StudentResultsScreen() {
  const [subjects, setSubjects] = useState<ResultSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const d = await studentApi.results();
      setSubjects(d.subjects || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Could not load results');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const total = subjects.reduce((s, x) => s + (x.marks_obtained || 0), 0);
  const max = subjects.reduce((s, x) => s + (x.total_marks || 0), 0);
  const pct = max > 0 ? Math.round((total / max) * 100) : null;

  if (loading) return <Screen><Text style={styles.loading}>Loading…</Text></Screen>;

  return (
    <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }}>
      <Text style={styles.h1}>Results</Text>
      {error && <ErrorBanner message={error} onRetry={() => { setRefreshing(true); load(); }} />}

      {pct != null && (
        <Card title="Overall percentage">
          <Text style={styles.pct}>{pct}%</Text>
          <Text style={styles.subtle}>{total} / {max} marks</Text>
        </Card>
      )}

      {subjects.length === 0 ? (
        <EmptyState title="No results yet" hint="Marks appear after teachers upload them." icon="📊" />
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
  pct: { fontSize: 36, fontWeight: '700', color: theme.colors.brand },
  subtle: { ...theme.font.small, color: theme.colors.textMuted, marginTop: theme.spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.sm, gap: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  rowTitle: { ...theme.font.body, fontWeight: '600', color: theme.colors.text },
  rowMeta: { ...theme.font.small, color: theme.colors.textMuted, marginTop: 2 },
  rowValue: { ...theme.font.body, fontWeight: '700' },
});
