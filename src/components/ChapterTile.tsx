import React, { memo, useCallback } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, radii, spacing, typography } from "@/theme";
import { hapticLight } from "@/utils/haptics";

interface ChapterTileProps {
  number: number;
  onPress: () => void;
}

function ChapterTileComponent({ number, onPress }: ChapterTileProps) {
  const { t } = useTranslation();

  const handlePress = useCallback(() => {
    void hapticLight();
    onPress();
  }, [onPress]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={t("book.chapterA11y", { number })}
    >
      <Text style={styles.number}>{number}</Text>
    </Pressable>
  );
}

export const ChapterTile = memo(ChapterTileComponent);

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
    opacity: 0.92,
  },
  number: {
    ...typography.subtitle,
    color: colors.accent,
  },
});
