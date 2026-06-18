// Teacher → bulk upload results.
//
// Flow:
//   1. Pick class+section+subject (RosterPicker with subject).
//   2. Set total_marks (default 100).
//   3. Enter marks for each student — keyboard numeric.
//   4. Auto-derives grade (A/B/C/D/F) from %.
//   5. Save → POST /api/teacher/results with all rows.
//
// Uses the same backend endpoint the web "bulk-results" page uses.
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Screen from '../../components/Screen';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import ErrorBanner from '../../components/ErrorBanner';
import Button from '../../components/Button';
import RosterPicker from '../../components/RosterPicker';
import { teacherApi, TeacherAssignment, RosterStudent } from '../../api/teacher';
import { theme } from '../../config/theme';

function gradeFor(pct: number): string {
  if (pct >= 90) return 'A';
  if (pct >= 80) return 'B';
  if (pct >= 70) return 'C';
  if (pct >= 60) return 'D';
  return 'F';
}

export default function TeacherResultsScreen() {
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [picked, setPicked] = useState<{ classId: number; sectionId: number; subjectId?: number } | null>(null);
  const [termId, setTermId] = useState<number>(1);
  const [sessionId, setSessionId] = useState<number>(1);
  const [totalMarks, setTotalMarks] = useState<number>(100);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [marks, setMarks] = useState<Record<number, string>>({});
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await teacherApi.subjects();
        setAssignments(d.items || []);
        if (!picked && d.items?.length) {
          const first = d.items[0];
          setPicked({ classId: first.class_id, sectionId: first.section_id, subjectId: first.subject_id });
        }
      } catch (e: any) { setError(e?.response?.data?.error || e?.message); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRoster = useCallback(async (classId: number, sectionId: number) => {
    setLoadingRoster(true); setError(null); setSavedMsg(null);
    try {
      const d = await teacherApi.roster(classId, sectionId);
      setRoster(d.items || []);
      setMarks({});
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Could not load roster');
    } finally { setLoadingRoster(false); }
  }, []);

  useEffect(() => {
    if (picked) loadRoster(picked.classId, picked.sectionId);
  }, [picked, loadRoster]);

  async function save() {
    if (!picked || !picked.subjectId) {
      setError('Pick a class + subject first.');
      return;
    }
    setSaving(true); setError(null); setSavedMsg(null);
    try {
      const rows = roster.map(s => {
        const v = Number(marks[s.student_id] || 0);
        const pct = totalMarks > 0 ? (v / totalMarks) * 100 : 0;
        return { student_id: s.student_id, marks_obtained: v, grade: gradeFor(pct) };
      });
      const r = await teacherApi.uploadBulkResults({
        class_id: picked.classId,
        section_id: picked.sectionId,
        subject_id: picked.subjectId,
        term_id: termId,
        session_id: sessionId,
        total_marks: totalMarks,
        rows,
      });
      setSavedMsg(`Saved · ${rows.length} marks uploaded`);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Could not save');
    } finally { setSaving(false); }
  }

  return (
    <Screen>
      <Text style={styles.h1}>Upload results</Text>

      <RosterPicker
        assignments={assignments}
        value={picked}
        onChange={(v) => setPicked(v)}
        withSubject
      />

      <Card>
        <View style={styles.configRow}>
          <View style={styles.configField}>
            <Text style={styles.label}>Total marks</Text>
            <TextInput style={styles.input} keyboardType="number-pad"
                       value={String(totalMarks)} onChangeText={t => setTotalMarks(Number(t) || 0)} />
          </View>
          <View style={styles.configField}>
            <Text style={styles.label}>Term ID</Text>
            <TextInput style={styles.input} keyboardType="number-pad"
                       value={String(termId)} onChangeText={t => setTermId(Number(t) || 0)} />
          </View>
          <View style={styles.configField}>
            <Text style={styles.label}>Session ID</Text>
            <TextInput style={styles.input} keyboardType="number-pad"
                       value={String(sessionId)} onChangeText={t => setSessionId(Number(t) || 0)} />
          </View>
        </View>
      </Card>

      {error && <ErrorBanner message={error} onRetry={() => picked && loadRoster(picked.classId, picked.sectionId)} />}
      {savedMsg && <Text style={styles.savedMsg}>{savedMsg}</Text>}

      {picked == null ? (
        <EmptyState title="Pick a class above to start" icon="📊" />
      ) : loadingRoster ? <Text style={styles.loading}>Loading roster…</Text> :
        roster.length === 0 ? <EmptyState title="No students in this class" icon="👥" /> :
        <Card title="Marks" hint={`${roster.length} students · total = ${totalMarks}`}>
          {roster.map(s => {
            const v = Number(marks[s.student_id] || 0);
            const pct = totalMarks > 0 ? Math.round((v / totalMarks) * 100) : 0;
            const grade = gradeFor(pct);
            return (
              <View key={s.student_id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{s.full_name}</Text>
                  <Text style={styles.meta}>Adm. {s.admission_no}</Text>
                </View>
                <TextInput
                  style={styles.marksInput}
                  keyboardType="number-pad"
                  value={marks[s.student_id] ?? ''}
                  onChangeText={t => setMarks(prev => ({ ...prev, [s.student_id]: t.replace(/[^0-9.]/g, '') }))}
                  placeholder="0"
                />
                <Text style={[styles.pct, { color: pct >= 60 ? theme.colors.emerald : theme.colors.red }]}>
                  {pct}%
                </Text>
                <View style={[styles.gradeBadge, { backgroundColor: grade === 'F' ? theme.colors.redLight : theme.colors.brandLight }]}>
                  <Text style={[styles.gradeText, { color: grade === 'F' ? theme.colors.red : theme.colors.brand }]}>{grade}</Text>
                </View>
              </View>
            );
          })}
        </Card>
      }

      <Button title={saving ? 'Uploading…' : 'Upload marks'}
              onPress={save}
              disabled={!picked || roster.length === 0 || !picked?.subjectId}
              loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { ...theme.font.body, color: theme.colors.textMuted, padding: theme.spacing.lg },
  h1: { ...theme.font.h1, color: theme.colors.text, marginBottom: theme.spacing.md },
  configRow: { flexDirection: 'row', gap: theme.spacing.md },
  configField: { flex: 1 },
  label: { ...theme.font.label, color: theme.colors.textMuted, marginBottom: theme.spacing.xs },
  input: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 15,
    color: theme.colors.text,
  },
  savedMsg: { ...theme.font.body, color: theme.colors.emerald, marginBottom: theme.spacing.sm, paddingHorizontal: theme.spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.sm, gap: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  name: { ...theme.font.body, fontWeight: '600', color: theme.colors.text },
  meta: { ...theme.font.small, color: theme.colors.textMuted, marginTop: 2 },
  marksInput: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    width: 64,
    textAlign: 'center',
    fontSize: 15,
    color: theme.colors.text,
  },
  pct: { ...theme.font.body, fontWeight: '700', minWidth: 44, textAlign: 'right' },
  gradeBadge: { paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, borderRadius: theme.radius.full, minWidth: 28, alignItems: 'center' },
  gradeText: { ...theme.font.small, fontWeight: '700' },
});
