import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@/theme";

interface Props {
  activeDates: string[]; // YYYY-MM-DD strings
}

export function StreakCalendar({ activeDates }: Props) {
  const activeSet = new Set(activeDates);
  const days: { date: string; label: string; active: boolean }[] = [];
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().split("T")[0]!;
    const label = String(d.getDate());
    days.push({ date: iso, label, active: activeSet.has(iso) });
  }

  return (
    <View style={styles.grid}>
      {days.map((day) => (
        <View
          key={day.date}
          style={[styles.cell, day.active ? styles.cellActive : styles.cellInactive]}
        >
          <Text style={[styles.cellLabel, day.active && styles.cellLabelActive]}>
            {day.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const CELL = 36;

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs + 2,
  },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: CELL / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  cellActive: {
    backgroundColor: colors.accent,
  },
  cellInactive: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  cellLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  cellLabelActive: {
    color: colors.canvas,
    fontWeight: "800",
  },
});
