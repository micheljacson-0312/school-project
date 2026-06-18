// Parent dashboard — lists all children linked to the parent account
// with quick summary cards (attendance %, fees, results). Tapping a
// child card deep-links to that child's Attendance / Results / Fees.
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Screen from '../../components/Screen';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import ErrorBanner from '../../components/ErrorBanner';
import Button from '../../components/Button';
import { useSession } from '../../auth/SessionContext';
import { parentApi, ParentDashboard, ParentChild } from '../../api/parent';
import { theme } from '../../config/theme';

export default function ParentDashboardScreen() {
  const { user } = useSession();
  const nav = useNavigation<any>();
  const [data, setData] = useState<ParentDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const d = await parentApi.dashboard();
      setData(d);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Could not load dashboard');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function goto(child: ParentChild, tab: 'Attendance' | 'Results' | 'Fees') {
    nav.navigate(tab, { studentId: child.student_id });
  }

  if (loading) return <Screen><Text style={styles.loading}>Loading…</Text></Screen>;

  const children = data?.children || [];
  return (
    <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }}>
      <Text style={styles.h1}>{data?.greeting || `Welcome, ${user?.full_name}`}</Text>
      <Text style={styles.subtle}>
        {children.length === 0
          ? 'No children linked to this account.'
          : `${children.length} child${children.length === 1 ? '' : 'ren'} linked.`}
      </Text>

      {error && <ErrorBanner message={error} onRetry={() => { setRefreshing(true); load(); }} />}

      {children.length === 0 ? (
        <Card>
          <EmptyState
            title="No children linked yet"
            hint="Ask the school office to link your account to your child."
            icon="👨‍👩‍👧"
          />
        </Card>
      ) : children.map(c => (
        <Card key={c.student_id} title={c.student_name}
              hint={`Adm. ${c.admission_no} · ${c.class_name} · Section ${c.section_name} · ${c.session_name}`}>
          <View style={styles.statsRow}>
            <Stat label="Attendance"
                   value={c.attendance?.attendance_pct != null ? `${c.attendance.attendance_pct}%` : '—'}
                   color={attendanceColor(c.attendance?.attendance_pct ?? null)} />
            <Stat label="Results"
                   value={c.results_pct != null ? `${c.results_pct}%` : '—'}
                   color={gradeColor(c.results_pct ?? null)} />
            <Stat label="Unpaid"
                   value={c.fees?.unpaid_count != null ? String(c.fees.unpaid_count) : '—'}
                   sub={c.fees?.unpaid_total ? `PKR ${Number(c.fees.unpaid_total).toLocaleString()}` : ''}
                   color={(c.fees?.unpaid_count ?? 0) > 0 ? theme.colors.red : theme.colors.emerald} />
          </View>
          <View style={styles.actionsRow}>
            <Button title="Attendance" onPress={() => goto(c, 'Attendance')} variant="secondary" />
            <Button title="Results"    onPress={() => goto(c, 'Results')}    variant="secondary" />
            <Button title="Fees"       onPress={() => goto(c, 'Fees')}       variant="secondary" />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

function attendanceColor(p: number | null) {
  if (p == null) return theme.colors.textMuted;
  if (p >= 85) return theme.colors.emerald;
  if (p >= 70) return theme.colors.amber;
  return theme.colors.red;
}
function gradeColor(p: number | null) {
  if (p == null) return theme.colors.textMuted;
  if (p >= 80) return theme.colors.emerald;
  if (p >= 60) return theme.colors.brand;
  if (p >= 40) return theme.colors.amber;
  return theme.colors.red;
}

const styles = StyleSheet.create({
  loading: { ...theme.font.body, color: theme.colors.textMuted, padding: theme.spacing.lg },
  h1: { ...theme.font.h1, color: theme.colors.text, marginBottom: theme.spacing.xs },
  subtle: { ...theme.font.small, color: theme.colors.textMuted, marginBottom: theme.spacing.md },
  statsRow: { flexDirection: 'row', gap: theme.spacing.md, marginVertical: theme.spacing.sm },
  stat: { flex: 1 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { ...theme.font.small, color: theme.colors.textMuted, marginTop: 2 },
  statSub: { ...theme.font.small, color: theme.colors.textMuted },
  actionsRow: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md, flexWrap: 'wrap' },
});
