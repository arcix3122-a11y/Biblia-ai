import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, radii, spacing, typography } from "@/theme";

interface ChapterTileProps {
  number: number;
  onPress: () => void;
}

export function ChapterTile({ number, onPress }: ChapterTileProps) {
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={t("book.chapterA11y", { number })}
    >
      <Text style={styles.number}>{number}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 64,
    height: 64,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: "center",
    justifyContent: "center",
    margin: spacing.xs,
  },
  pressed: {
    backgroundColor: colors.cardHover,
    borderColor: colors.accent,
  },
  number: {
    ...typography.subtitle,
    color: colors.accent,
  },
});
