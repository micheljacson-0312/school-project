// RosterPicker — pick a class+section from the teacher's assignments.
// Shows only one chip per (class, section) pair; tapping selects.
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { theme } from '../config/theme';
import type { TeacherAssignment } from '../api/teacher';

interface Props {
  assignments: TeacherAssignment[];
  value: { classId: number; sectionId: number; subjectId?: number } | null;
  onChange: (v: { classId: number; sectionId: number; subjectId?: number }) => void;
  withSubject?: boolean;
}

export default function RosterPicker({ assignments, value, onChange, withSubject }: Props) {
  if (!assignments || assignments.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {assignments.map(a => {
        const active = value?.classId === a.class_id && value?.sectionId === a.section_id
          && (withSubject ? value?.subjectId === a.subject_id : true);
        const label = withSubject
          ? `${a.class_name} · ${a.section_name} · ${a.subject_name}`
          : `${a.class_name} · ${a.section_name}`;
        return (
          <Pressable
            key={a.id}
            onPress={() => onChange({ classId: a.class_id, sectionId: a.section_id, subjectId: a.subject_id })}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: theme.spacing.sm, paddingVertical: theme.spacing.sm },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 100,
  },
  chipActive: { backgroundColor: theme.colors.amber, borderColor: theme.colors.amber },
  chipText: { ...theme.font.body, fontWeight: '600', color: theme.colors.text },
  chipTextActive: { color: theme.colors.white },
});
