import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors, radii, spacing, typography } from "@/theme";
import type { Book } from "@/types/scripture";

interface BookTileProps {
  book: Book;
  onPress: () => void;
}

export function BookTile({ book, onPress }: BookTileProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${book.name}`}
    >
      <Text style={styles.name} numberOfLines={2}>
        {book.name}
      </Text>
      <Text style={styles.meta}>{book.chapter_count} chapters</Text>
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
