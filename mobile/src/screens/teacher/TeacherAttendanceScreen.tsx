// Teacher → mark attendance. THE daily-driver feature.
//
// Flow:
//   1. Pick a class+section from your assignments (RosterPicker).
//   2. Pick a date (defaults to today).
//   3. See roster — tap a status pill to cycle through Present/Absent/Late/Leave.
//   4. Hit "Save" — POST /api/teacher/attendance with all entries at once.
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Screen from '../../components/Screen';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import ErrorBanner from '../../components/ErrorBanner';
import Button from '../../components/Button';
import RosterPicker from '../../components/RosterPicker';
import { teacherApi, TeacherAssignment, RosterStudent } from '../../api/teacher';
import { theme } from '../../config/theme';

type Status = 'present' | 'absent' | 'late' | 'leave';
const STATUS_ORDER: Status[] = ['present', 'absent', 'late', 'leave'];
const STATUS_COLORS: Record<Status, { bg: string; fg: string; label: string }> = {
  present: { bg: theme.colors.emeraldLight, fg: theme.colors.emerald, label: 'Present' },
  absent:  { bg: theme.colors.redLight,     fg: theme.colors.red,     label: 'Absent'  },
  late:    { bg: theme.colors.amberLight,   fg: theme.colors.amber,   label: 'Late'    },
  leave:   { bg: theme.colors.brandLight,   fg: theme.colors.brand,   label: 'Leave'   },
};

function todayISO() { return new Date().toISOString().slice(0, 10); }

export default function TeacherAttendanceScreen() {
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [picked, setPicked] = useState<{ classId: number; sectionId: number } | null>(null);
  const [date, setDate] = useState(todayISO());
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [statuses, setStatuses] = useState<Record<number, Status>>({});
  const [remarks, setRemarks] = useState<Record<number, string>>({});
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  // Load assignments once.
  useEffect(() => {
    (async () => {
      try {
        const d = await teacherApi.subjects();
        setAssignments(d.items || []);
        if (!picked && d.items?.length) {
          const first = d.items[0];
          setPicked({ classId: first.class_id, sectionId: first.section_id });
        }
      } catch (e: any) {
        setError(e?.response?.data?.error || e?.message || 'Could not load assignments');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRoster = useCallback(async (classId: number, sectionId: number) => {
    setLoadingRoster(true); setError(null);
    try {
      const d = await teacherApi.roster(classId, sectionId);
      const items = d.items || [];
      setRoster(items);
      // Default everyone to "present" so the teacher just taps outliers.
      const init: Record<number, Status> = {};
      items.forEach(s => { init[s.student_id] = 'present'; });
      setStatuses(init);
      setRemarks({});
      setSavedMsg(null);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Could not load roster');
    } finally { setLoadingRoster(false); }
  }, []);

  useEffect(() => { if (picked) loadRoster(picked.classId, picked.sectionId); }, [picked, loadRoster]);

  function cycle(studentId: number) {
    setStatuses(prev => {
      const cur = prev[studentId] || 'present';
      const next = STATUS_ORDER[(STATUS_ORDER.indexOf(cur) + 1) % STATUS_ORDER.length];
      return { ...prev, [studentId]: next };
    });
  }
  function setStatus(studentId: number, s: Status) { setStatuses(prev => ({ ...prev, [studentId]: s })); }

  async function save() {
    if (!picked) return;
    setSaving(true); setError(null); setSavedMsg(null);
    try {
      const entries = roster.map(s => ({
        student_id: s.student_id,
        status: statuses[s.student_id] || 'present',
        ...(remarks[s.student_id] ? { remarks: remarks[s.student_id] } : {}),
      }));
      const r = await teacherApi.markAttendance({
        class_id: picked.classId,
        section_id: picked.sectionId,
        date,
        entries,
      });
      setSavedMsg(`Saved · ${(r as any).marked ?? entries.length} marked · ${(r as any).updated ?? 0} updated`);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Could not save');
    } finally { setSaving(false); }
  }

  return (
    <Screen>
      <Text style={styles.h1}>Mark attendance</Text>

      <RosterPicker
        assignments={assignments}
        value={picked ? { classId: picked.classId, sectionId: picked.sectionId } : null}
        onChange={(v) => setPicked({ classId: v.classId, sectionId: v.sectionId })}
      />

      <Card>
        <View style={styles.dateRow}>
          <Text style={styles.label}>Date</Text>
          <TextInput
            style={styles.dateInput}
            value={date}
            onChangeText={(t) => /^\d{0,4}-?\d{0,2}-?\d{0,2}$/.test(t) && setDate(t)}
            placeholder="YYYY-MM-DD"
          />
          <Pressable onPress={() => setDate(todayISO())} style={styles.todayBtn}>
            <Text style={styles.todayBtnText}>Today</Text>
          </Pressable>
        </View>
      </Card>

      {error && <ErrorBanner message={error} onRetry={() => picked && loadRoster(picked.classId, picked.sectionId)} />}
      {savedMsg && <Text style={styles.savedMsg}>{savedMsg}</Text>}

      {picked == null ? (
        <EmptyState title="No assignments yet" hint="Ask the admin to assign you to a class." icon="📋" />
      ) : loadingRoster ? <Text style={styles.loading}>Loading roster…</Text> :
        roster.length === 0 ? <EmptyState title="No students in this class" icon="👥" /> :
        <Card title={`Roster (${roster.length})`} hint="Tap a status pill to cycle through Present → Absent → Late → Leave.">
          {roster.map(s => {
            const cur = statuses[s.student_id] || 'present';
            const c = STATUS_COLORS[cur];
            return (
              <View key={s.student_id} style={styles.studentRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.studentName}>{s.full_name}</Text>
                  <Text style={styles.studentMeta}>Adm. {s.admission_no}</Text>
                  <TextInput
                    style={styles.remarksInput}
                    placeholder="Remarks (optional)"
                    value={remarks[s.student_id] || ''}
                    onChangeText={t => setRemarks(prev => ({ ...prev, [s.student_id]: t }))}
                  />
                </View>
                <View style={styles.statusGroup}>
                  <Pressable onPress={() => cycle(s.student_id)}
                             style={[styles.statusPill, { backgroundColor: c.bg }]}>
                    <Text style={[styles.statusText, { color: c.fg }]}>{c.label}</Text>
                  </Pressable>
                  <View style={styles.statusRow}>
                    {STATUS_ORDER.map(s2 => (
                      <Pressable key={s2}
                                 onPress={() => setStatus(s.student_id, s2)}
                                 style={[styles.dot, { backgroundColor: STATUS_COLORS[s2].bg },
                                        cur === s2 && { borderWidth: 2, borderColor: STATUS_COLORS[s2].fg }]} />
                    ))}
                  </View>
                </View>
              </View>
            );
          })}
        </Card>
      }

      <Button title={saving ? 'Saving…' : 'Save attendance'} onPress={save} disabled={!picked || roster.length === 0} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { ...theme.font.body, color: theme.colors.textMuted, padding: theme.spacing.lg },
  h1: { ...theme.font.h1, color: theme.colors.text, marginBottom: theme.spacing.md },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  label: { ...theme.font.label, color: theme.colors.textMuted },
  dateInput: {
    flex: 1,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 15,
    color: theme.colors.text,
  },
  todayBtn: {
    backgroundColor: theme.colors.brandLight,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
  },
  todayBtnText: { ...theme.font.label, color: theme.colors.brand, fontWeight: '600' },
  savedMsg: { ...theme.font.body, color: theme.colors.emerald, marginBottom: theme.spacing.sm, paddingHorizontal: theme.spacing.md },
  studentRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: theme.spacing.md },
  studentName: { ...theme.font.body, fontWeight: '600', color: theme.colors.text },
  studentMeta: { ...theme.font.small, color: theme.colors.textMuted, marginTop: 2 },
  remarksInput: {
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    fontSize: 13,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  statusGroup: { alignItems: 'center', minWidth: 110 },
  statusPill: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    minWidth: 80,
    alignItems: 'center',
  },
  statusText: { ...theme.font.small, fontWeight: '700', textTransform: 'uppercase' },
  statusRow: { flexDirection: 'row', gap: theme.spacing.xs, marginTop: theme.spacing.xs },
  dot: { width: 18, height: 18, borderRadius: 9 },
});
