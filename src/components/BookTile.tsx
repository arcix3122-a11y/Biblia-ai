import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, radii, spacing, typography } from "@/theme";
import type { Book } from "@/types/scripture";

interface BookTileProps {
  book: Book;
  onPress: () => void;
}

export function BookTile({ book, onPress }: BookTileProps) {
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={t("book.openBook", { name: book.name })}
    >
      <Text style={styles.name} numberOfLines={2}>
        {book.name}
      </Text>
      <Text style={styles.meta}>{t("book.chapterCount", { count: book.chapter_count })}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: colors.tile,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.md,
    margin: spacing.xs,
    minHeight: 88,
    justifyContent: "space-between",
  },
  pressed: {
    backgroundColor: colors.cardHover,
    borderColor: colors.accentMuted,
  },
  name: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
