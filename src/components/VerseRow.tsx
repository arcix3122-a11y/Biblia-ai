import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getReadingTypography } from "@/theme/typography";
import { colors, spacing, typography } from "@/theme";
import type { Verse } from "@/types/scripture";

interface VerseRowProps {
  verse: Verse;
  fontSize: number;
  isBookmarked: boolean;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onToggleBookmark: () => void;
}

export function VerseRow({
  verse,
  fontSize,
  isBookmarked,
  isSelected,
  onPress,
  onLongPress,
  onToggleBookmark,
}: VerseRowProps) {
  const reading = getReadingTypography(fontSize);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.row, isSelected && styles.rowSelected]}
    >
      <View style={styles.header}>
        <Text style={[styles.number, isSelected && styles.numberActive]}>{verse.number}</Text>
        <Pressable
          onPress={onToggleBookmark}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={isBookmarked ? "Remove bookmark" : "Add bookmark"}
        >
          <Text style={[styles.bookmark, isBookmarked && styles.bookmarkActive]}>
            {isBookmarked ? "★" : "☆"}
          </Text>
        </Pressable>
      </View>
      <Text
        style={[
          styles.text,
          {
            fontSize: reading.fontSize,
            lineHeight: reading.lineHeight,
            letterSpacing: reading.letterSpacing,
          },
          isSelected && styles.textSelected,
        ]}
      >
        {verse.text}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
    borderRadius: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  rowSelected: {
    backgroundColor: colors.accentGlow,
    borderBottomColor: colors.accentMuted,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  number: {
    ...typography.caption,
    color: colors.textMuted,
  },
  numberActive: {
    color: colors.accent,
  },
  bookmark: {
    fontSize: 20,
    color: colors.textMuted,
  },
  bookmarkActive: {
    color: colors.accent,
  },
  text: {
    color: colors.textPrimary,
    fontWeight: "400",
  },
  textSelected: {
    color: colors.textPrimary,
  },
});
