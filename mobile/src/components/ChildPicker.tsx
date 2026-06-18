// ChildPicker — horizontal scrollable row of child chips for parents
// with multiple children. Selecting a child updates the parent's
// per-screen childId so attendance/results/fees queries reload.
//
// Usage:
//   <ChildPicker
//     children={parent.children}
//     value={childId}
//     onChange={setChildId}
//   />
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../config/theme';
import type { ParentChild } from '../api/parent';

interface Props {
  children: ParentChild[];
  value: number | null;
  onChange: (studentId: number) => void;
}

export default function ChildPicker({ children, value, onChange }: Props) {
  if (!children || children.length === 0) return null;
  if (children.length === 1) {
    const c = children[0];
    return (
      <View style={styles.single}>
        <Text style={styles.singleName}>{c.student_name}</Text>
        <Text style={styles.singleMeta}>
          {c.class_name} · Section {c.section_name} · Adm. {c.admission_no}
        </Text>
      </View>
    );
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {children.map(c => {
        const active = c.student_id === value;
        return (
          <Pressable
            key={c.student_id}
            onPress={() => onChange(c.student_id)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipName, active && styles.chipNameActive]}>
              {c.student_name}
            </Text>
            <Text style={[styles.chipMeta, active && styles.chipMetaActive]}>
              {c.class_name} · {c.section_name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: theme.spacing.sm, paddingVertical: theme.spacing.sm },
  single: {
    backgroundColor: theme.colors.brandLight,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  singleName: { ...theme.font.body, fontWeight: '700', color: theme.colors.brand },
  singleMeta: { ...theme.font.small, color: theme.colors.textMuted, marginTop: 2 },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 140,
  },
  chipActive: { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand },
  chipName: { ...theme.font.body, fontWeight: '600', color: theme.colors.text },
  chipNameActive: { color: theme.colors.white },
  chipMeta: { ...theme.font.small, color: theme.colors.textMuted, marginTop: 2 },
  chipMetaActive: { color: theme.colors.brandLight },
});
