import React, { memo, useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { getReadingTypography } from "@/theme/typography";
import { colors, spacing, typography } from "@/theme";
import type { HighlightColor, Verse } from "@/types/scripture";
import { getHighlightBackground } from "@/utils/highlightColors";
import { hapticSelection } from "@/utils/haptics";

interface VerseRowProps {
  verse: Verse;
  fontSize: number;
  isBookmarked: boolean;
  isSelected: boolean;
  highlightColor?: HighlightColor;
  onPress: () => void;
  onLongPress: () => void;
  onToggleBookmark: () => void;
}

function VerseRowComponent({
  verse,
  fontSize,
  isBookmarked,
  isSelected,
  highlightColor,
  onPress,
  onLongPress,
  onToggleBookmark,
}: VerseRowProps) {
  const { t } = useTranslation();
  const reading = getReadingTypography(fontSize);
  const highlightBg = highlightColor ? getHighlightBackground(highlightColor) : undefined;

  const handleBookmarkPress = useCallback(() => {
    void hapticSelection();
    onToggleBookmark();
  }, [onToggleBookmark]);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.row,
        highlightBg ? { backgroundColor: highlightBg } : null,
        isSelected && styles.rowSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.number, isSelected && styles.numberActive]}>{verse.number}</Text>
        <Pressable
          onPress={handleBookmarkPress}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={isBookmarked ? t("reader.removeBookmark") : t("reader.addBookmark")}
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
            lineHeight: Math.round(reading.lineHeight * 1.14),
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

export const VerseRow = memo(VerseRowComponent);

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
  pressed: {
    opacity: 0.92,
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
    opacity: 0.62,
    fontSize: 11,
    letterSpacing: 0.4,
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
