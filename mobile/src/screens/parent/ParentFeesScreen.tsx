// Parent → child fees view. Lists all challans: paid / unpaid / overdue.
// Includes ChildPicker at top.
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import Screen from '../../components/Screen';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import ErrorBanner from '../../components/ErrorBanner';
import ChildPicker from '../../components/ChildPicker';
import { parentApi, ChildFees, ChildFeeRow, ParentDashboard } from '../../api/parent';
import { theme } from '../../config/theme';

const STATUS_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  paid:        { bg: theme.colors.emeraldLight, fg: theme.colors.emerald, label: 'Paid' },
  unpaid:      { bg: theme.colors.amberLight,   fg: theme.colors.amber,   label: 'Unpaid' },
  overdue:     { bg: theme.colors.redLight,     fg: theme.colors.red,     label: 'Overdue' },
  partial:     { bg: theme.colors.brandLight,   fg: theme.colors.brand,   label: 'Partial' },
};

export default function ParentFeesScreen() {
  const route = useRoute<any>();
  const initialStudentId: number | undefined = route.params?.studentId;

  const [children, setChildren] = useState<ParentDashboard['children']>([]);
  const [studentId, setStudentId] = useState<number | null>(initialStudentId || null);
  const [fees, setFees] = useState<ChildFees | null>(null);
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
      const d = await parentApi.childFees(id);
      setFees(d);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Could not load fees');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    if (studentId == null) return;
    setLoading(true);
    load(studentId);
  }, [studentId, load]);

  return (
    <Screen refreshing={refreshing} onRefresh={() => studentId != null && load(studentId)}>
      <Text style={styles.h1}>Fees</Text>
      <ChildPicker children={children} value={studentId} onChange={setStudentId} />

      {error && <ErrorBanner message={error} onRetry={() => studentId != null && load(studentId)} />}

      {loading ? <Text style={styles.loading}>Loading…</Text> :
        studentId == null ? null :
        <>
          <Card title="Summary">
            <View style={styles.statsRow}>
              <Stat label="Outstanding" value={`PKR ${(fees?.total_outstanding || 0).toLocaleString()}`} color={(fees?.total_outstanding ?? 0) > 0 ? theme.colors.red : theme.colors.emerald} />
              <Stat label="Paid"        value={`PKR ${(fees?.total_paid || 0).toLocaleString()}`} color={theme.colors.emerald} />
            </View>
          </Card>

          {(!fees?.items || fees.items.length === 0) ? (
            <EmptyState title="No fee records" hint="Challans appear when the school issues them." icon="💳" />
          ) : (
            fees.items.map(f => <FeeRow key={f.id} f={f} />)
          )}
        </>
      }
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

function FeeRow({ f }: { f: ChildFeeRow }) {
  const c = STATUS_COLORS[f.status] || STATUS_COLORS.unpaid;
  const overdue = new Date(f.due_date) < new Date() && f.status !== 'paid';
  const c2 = overdue ? STATUS_COLORS.overdue : c;
  return (
    <Card>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{f.structure_name}</Text>
          <Text style={styles.meta}>Due {new Date(f.due_date).toLocaleDateString()}</Text>
          {f.challan_no && <Text style={styles.meta}>Challan #{f.challan_no}</Text>}
        </View>
        <View style={[styles.badge, { backgroundColor: c2.bg }]}>
          <Text style={[styles.badgeText, { color: c2.fg }]}>{c2.label}</Text>
        </View>
      </View>
      <View style={styles.amounts}>
        <View style={styles.amount}>
          <Text style={styles.amountLabel}>Net</Text>
          <Text style={styles.amountValue}>PKR {Number(f.net_amount || 0).toLocaleString()}</Text>
        </View>
        <View style={styles.amount}>
          <Text style={styles.amountLabel}>Paid</Text>
          <Text style={[styles.amountValue, { color: theme.colors.emerald }]}>PKR {Number(f.paid_amount || 0).toLocaleString()}</Text>
        </View>
        <View style={styles.amount}>
          <Text style={styles.amountLabel}>Outstanding</Text>
          <Text style={[styles.amountValue, { color: Number(f.outstanding) > 0 ? theme.colors.red : theme.colors.textMuted }]}>
            PKR {Number(f.outstanding || 0).toLocaleString()}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  loading: { ...theme.font.body, color: theme.colors.textMuted, padding: theme.spacing.lg },
  h1: { ...theme.font.h1, color: theme.colors.text, marginBottom: theme.spacing.md },
  statsRow: { flexDirection: 'row', gap: theme.spacing.md },
  stat: { flex: 1 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { ...theme.font.small, color: theme.colors.textMuted, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md },
  title: { ...theme.font.body, fontWeight: '700', color: theme.colors.text },
  meta: { ...theme.font.small, color: theme.colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, borderRadius: theme.radius.full, alignSelf: 'flex-start' },
  badgeText: { ...theme.font.small, fontWeight: '700', textTransform: 'uppercase' },
  amounts: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border },
  amount: { flex: 1 },
  amountLabel: { ...theme.font.small, color: theme.colors.textMuted },
  amountValue: { ...theme.font.body, fontWeight: '700', color: theme.colors.text, marginTop: 2 },
});
