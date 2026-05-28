import React, { memo } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { PhotoBackground } from "@/components/PhotoBackground";
import { getBookPhotoUrl } from "@/data/photoBackgrounds";
import { getBookDisplayName } from "@/i18n/bookNames";
import { useLocaleStore } from "@/store/localeStore";
import { colors, radii, spacing, typography } from "@/theme";
import type { Book } from "@/types/scripture";

interface BookTileProps {
  book: Book;
  onPress: () => void;
}

function BookTileComponent({ book, onPress }: BookTileProps) {
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const displayName = getBookDisplayName(book.slug, locale, book.name);
  const photoUrl = getBookPhotoUrl(book.slug, 420, 260);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={t("book.openBook", { name: displayName })}
    >
      <PhotoBackground
        uri={photoUrl}
        style={StyleSheet.absoluteFill}
        borderRadius={radii.lg}
        scrimOpacity={0.58}
      />
      <Text style={styles.name} numberOfLines={2}>
        {displayName}
      </Text>
      <Text style={styles.meta}>{t("book.chapterCount", { count: book.chapter_count })}</Text>
    </Pressable>
  );
}

export const BookTile = memo(BookTileComponent);

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: "45%",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.md,
    margin: spacing.xs,
    minHeight: 96,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  pressed: {
    borderColor: colors.accentMuted,
    opacity: 0.92,
  },
  name: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  meta: {
    ...typography.caption,
    color: "rgba(255,255,255,0.78)",
    marginTop: spacing.sm,
  },
});
