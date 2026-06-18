// Parent → evaluations / feedback forms. The school sends periodic
// surveys (e.g. parent satisfaction, teacher evaluation) that parents
// respond to from here. Each form has a status (responded / pending)
// and a deadline.
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import ErrorBanner from '../../components/ErrorBanner';
import Button from '../../components/Button';
import { parentApi, EvaluationForm } from '../../api/parent';
import { theme } from '../../config/theme';

export default function ParentEvaluationsScreen() {
  const [items, setItems] = useState<EvaluationForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const d = await parentApi.evaluations();
      setItems(d.items || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Could not load evaluations');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Quick "submit positive feedback" handler — the real form UI for
  // open-ended questions is Phase E work. For Phase B, parents can
  // acknowledge a form they've seen so it stops nagging them.
  async function acknowledge(f: EvaluationForm) {
    try {
      setSubmitting(f.id);
      await parentApi.submitEvaluation(f.id, { acknowledged: true });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Could not submit');
    } finally { setSubmitting(null); }
  }

  if (loading) return <Screen><Text style={styles.loading}>Loading…</Text></Screen>;

  const pending = items.filter(f => !f.responded);
  const done = items.filter(f => f.responded);

  return (
    <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }}>
      <Text style={styles.h1}>Feedback</Text>
      <Text style={styles.subtle}>School surveys and evaluations.</Text>
      {error && <ErrorBanner message={error} onRetry={() => { setRefreshing(true); load(); }} />}

      {items.length === 0 ? (
        <EmptyState title="Nothing to review right now" hint="Surveys will appear here when the school sends them." icon="💬" />
      ) : (
        <>
          {pending.length > 0 && (
            <Text style={styles.section}>Awaiting your response ({pending.length})</Text>
          )}
          {pending.map(f => (
            <Card key={f.id} title={f.title} hint={f.deadline ? `Due ${new Date(f.deadline).toLocaleDateString()}` : undefined}>
              {f.description && <Text style={styles.body}>{f.description}</Text>}
              <Button title={submitting === f.id ? 'Submitting…' : 'Acknowledge'}
                      onPress={() => acknowledge(f)} loading={submitting === f.id} />
            </Card>
          ))}

          {done.length > 0 && (
            <>
              <Text style={styles.section}>Submitted ({done.length})</Text>
              {done.map(f => (
                <Card key={f.id} title={f.title}>
                  <Text style={styles.meta}>✓ Submitted</Text>
                </Card>
              ))}
            </>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { ...theme.font.body, color: theme.colors.textMuted, padding: theme.spacing.lg },
  h1: { ...theme.font.h1, color: theme.colors.text, marginBottom: theme.spacing.xs },
  subtle: { ...theme.font.small, color: theme.colors.textMuted, marginBottom: theme.spacing.md },
  section: { ...theme.font.label, color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: theme.spacing.md, marginBottom: theme.spacing.sm },
  body: { ...theme.font.body, color: theme.colors.text, marginBottom: theme.spacing.md },
  meta: { ...theme.font.body, color: theme.colors.emerald },
});
