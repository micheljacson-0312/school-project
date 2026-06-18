// Teacher → remarks. Add a remark for a student (visible to parents
// or internal-only), and view recent remarks. Minimal form —
// text + category + visibility.
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import ErrorBanner from '../../components/ErrorBanner';
import Button from '../../components/Button';
import TextField from '../../components/TextField';
import RosterPicker from '../../components/RosterPicker';
import { teacherApi, TeacherAssignment, RosterStudent } from '../../api/teacher';
import { theme } from '../../config/theme';

const CATEGORIES = [
  { key: 'general',  label: 'General',  color: theme.colors.textMuted },
  { key: 'praise',   label: 'Praise',   color: theme.colors.emerald },
  { key: 'concern',  label: 'Concern',  color: theme.colors.amber   },
  { key: 'academic', label: 'Academic', color: theme.colors.brand   },
] as const;

export default function TeacherRemarksScreen() {
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [picked, setPicked] = useState<{ classId: number; sectionId: number } | null>(null);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<typeof CATEGORIES[number]['key']>('general');
  const [visibility, setVisibility] = useState<'parent' | 'internal'>('parent');
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await teacherApi.subjects();
        setAssignments(d.items || []);
        if (!picked && d.items?.length) {
          setPicked({ classId: d.items[0].class_id, sectionId: d.items[0].section_id });
        }
      } catch (e: any) { setError(e?.response?.data?.error || e?.message); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRoster = useCallback(async () => {
    if (!picked) return;
    setLoading(true); setError(null);
    try {
      const d = await teacherApi.roster(picked.classId, picked.sectionId);
      const items = d.items || [];
      setRoster(items);
      // Auto-select first student if none picked.
      if (!studentId && items.length) setStudentId(items[0].student_id);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Could not load roster');
    } finally { setLoading(false); }
  }, [picked, studentId]);

  const loadRecent = useCallback(async () => {
    setRefreshing(true);
    try {
      const d = await teacherApi.listRemarks();
      setRecent(d.items || []);
    } catch { /* ignore */ } finally { setRefreshing(false); }
  }, []);

  useEffect(() => { loadRoster(); }, [loadRoster]);
  useEffect(() => { loadRecent(); }, [loadRecent]);

  async function submit() {
    if (!studentId || !body.trim()) { setError('Pick a student and write a remark.'); return; }
    setSubmitting(true); setError(null);
    try {
      await teacherApi.addRemark({ student_id: studentId, body: body.trim(), category, visibility });
      setBody('');
      await loadRecent();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Could not save');
    } finally { setSubmitting(false); }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={loadRecent}>
      <Text style={styles.h1}>Remarks</Text>

      <RosterPicker
        assignments={assignments}
        value={picked}
        onChange={(v) => { setPicked({ classId: v.classId, sectionId: v.sectionId }); setStudentId(null); }}
      />

      <Card title="New remark">
        {picked == null ? (
          <EmptyState title="Pick a class above" icon="💬" />
        ) : loading ? <Text style={styles.loading}>Loading roster…</Text> :
          roster.length === 0 ? <EmptyState title="No students in this class" icon="👥" /> :
          <>
            <Text style={styles.label}>Student</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {roster.map(s => {
                const active = s.student_id === studentId;
                return (
                  <Pressable key={s.student_id}
                             onPress={() => setStudentId(s.student_id)}
                             style={[styles.chip, active && styles.chipActive]}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{s.full_name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <TextField
              label="Remark"
              placeholder="What did the student do well or need help with?"
              multiline
              numberOfLines={4}
              value={body}
              onChangeText={setBody}
            />

            <Text style={styles.label}>Category</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map(c => (
                <Text key={c.key} onPress={() => setCategory(c.key)}
                      style={[styles.catChip, { backgroundColor: category === c.key ? c.color : theme.colors.white,
                                                 color: category === c.key ? '#ffffff' : c.color,
                                                 borderColor: c.color }]}>
                  {c.label}
                </Text>
              ))}
            </View>

            <Text style={styles.label}>Visibility</Text>
            <View style={styles.chipRow}>
              {(['parent', 'internal'] as const).map(v => (
                <Text key={v} onPress={() => setVisibility(v)}
                      style={[styles.visChip, { backgroundColor: visibility === v ? theme.colors.brand : theme.colors.white,
                                                 color: visibility === v ? '#ffffff' : theme.colors.brand,
                                                 borderColor: theme.colors.brand }]}>
                  {v === 'parent' ? 'Visible to parents' : 'Internal only'}
                </Text>
              ))}
            </View>

            <Button title={submitting ? 'Saving…' : 'Add remark'} onPress={submit} loading={submitting} />
          </>
        )}
      </Card>

      <Card title="Recent remarks">
        {recent.length === 0 ? (
          <EmptyState title="No remarks yet" icon="💬" />
        ) : recent.slice(0, 20).map((r, i) => (
          <View key={r.id ?? i} style={styles.recentRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.recentBody}>{r.body}</Text>
              <Text style={styles.recentMeta}>
                Student #{r.student_id} · {r.category || 'general'} · {r.visibility || 'parent'}
                {r.created_at ? ` · ${new Date(r.created_at).toLocaleDateString()}` : ''}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      {error && <ErrorBanner message={error} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { ...theme.font.body, color: theme.colors.textMuted, padding: theme.spacing.lg },
  h1: { ...theme.font.h1, color: theme.colors.text, marginBottom: theme.spacing.md },
  label: { ...theme.font.label, color: theme.colors.textMuted, marginBottom: theme.spacing.xs, marginTop: theme.spacing.sm },
  chipRow: { gap: theme.spacing.sm, paddingVertical: theme.spacing.sm },
  chip: {
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full, backgroundColor: theme.colors.white,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  chipActive: { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand },
  chipText: { ...theme.font.body, fontWeight: '600', color: theme.colors.text },
  chipTextActive: { color: theme.colors.white },
  catChip: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs, borderRadius: theme.radius.full, borderWidth: 1, ...theme.font.small, fontWeight: '600' },
  visChip: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs, borderRadius: theme.radius.full, borderWidth: 1, ...theme.font.small, fontWeight: '600' },
  recentRow: { paddingVertical: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  recentBody: { ...theme.font.body, color: theme.colors.text },
  recentMeta: { ...theme.font.small, color: theme.colors.textMuted, marginTop: 2 },
});
