// Assignments + Quizzes — single screen with two sections, each
// showing the pending items + a quick submit/start action.
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Screen from '../../components/Screen';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import ErrorBanner from '../../components/ErrorBanner';
import Button from '../../components/Button';
import { studentApi, AssignmentRow, QuizRow } from '../../api/student';
import { theme } from '../../config/theme';

export default function StudentAssignmentsScreen() {
  const nav = useNavigation<any>();
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [a, q] = await Promise.all([studentApi.assignments(), studentApi.quizzes()]);
      setAssignments(a.items || []);
      setQuizzes(q.items || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Could not load work');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function startQuiz(q: QuizRow) {
    try {
      await studentApi.startQuizAttempt(q.id);
      // Phase B+ will open the quiz-taking screen.
    } catch { /* swallow */ }
  }

  if (loading) return <Screen><Text style={styles.loading}>Loading…</Text></Screen>;

  return (
    <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }}>
      <Text style={styles.h1}>Work</Text>
      {error && <ErrorBanner message={error} onRetry={() => { setRefreshing(true); load(); }} />}

      <Card title="Assignments" hint={`${assignments.length} total · ${assignments.filter(a => !a.submitted).length} pending`}>
        {assignments.length === 0 ? (
          <EmptyState title="No assignments" icon="📝" />
        ) : assignments.slice(0, 8).map(a => (
          <View key={a.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{a.title}</Text>
              <Text style={styles.rowMeta}>Due {new Date(a.due_at).toLocaleDateString()}</Text>
            </View>
            <Text style={[styles.badge, { backgroundColor: a.submitted ? theme.colors.emeraldLight : theme.colors.amberLight,
                                            color: a.submitted ? theme.colors.emerald : theme.colors.amber }]}>
              {a.submitted ? 'Submitted' : 'Pending'}
            </Text>
          </View>
        ))}
      </Card>

      <Card title="Quizzes" hint={`${quizzes.length} available`}>
        {quizzes.length === 0 ? (
          <EmptyState title="No quizzes" icon="✅" />
        ) : quizzes.slice(0, 8).map(q => (
          <View key={q.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{q.title}</Text>
              <Text style={styles.rowMeta}>
                {q.total_marks ? `${q.total_marks} marks · ` : ''}
                Available until {new Date(q.available_to).toLocaleDateString()}
              </Text>
            </View>
            <Button title={q.attempted ? 'Review' : 'Start'} onPress={() => startQuiz(q)}
                    variant={q.attempted ? 'secondary' : 'primary'} />
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { ...theme.font.body, color: theme.colors.textMuted, padding: theme.spacing.lg },
  h1: { ...theme.font.h1, color: theme.colors.text, marginBottom: theme.spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.sm, gap: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  rowTitle: { ...theme.font.body, fontWeight: '600', color: theme.colors.text },
  rowMeta: { ...theme.font.small, color: theme.colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, borderRadius: theme.radius.full, ...theme.font.small, fontWeight: '600' },
});
