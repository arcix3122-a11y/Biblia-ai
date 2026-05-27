import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { GuidedReflectionSheet, type ReflectionVariant } from "./GuidedReflectionSheet";
import { colors, radii, spacing, typography } from "@/theme";

interface Props {
  verseText: string;
  verseReference: string;
}

interface CardConfig {
  variant: ReflectionVariant;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  titleKey: string;
  subKey: string;
  minKey: string;
  minutes: number;
}

const CARDS: CardConfig[] = [
  {
    variant: "meditation",
    icon: "sparkles",
    titleKey: "viralFeed.reflectionTitle",
    subKey: "viralFeed.reflectionSub",
    minKey: "viralFeed.readTime",
    minutes: 3,
  },
  {
    variant: "silence",
    icon: "moon-outline",
    titleKey: "viralFeed.silenceTitle",
    subKey: "viralFeed.silenceSub",
    minKey: "viralFeed.readTime",
    minutes: 5,
  },
];

export function GuidedReflectionCards({ verseText, verseReference }: Props) {
  const { t: tAny } = useTranslation();
  const t = tAny as any;
  const [activeVariant, setActiveVariant] = useState<ReflectionVariant | null>(null);

  if (!verseText || !verseReference) return null;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.sectionLabel}>{t("viralFeed.guidedSection")}</Text>
      <View style={styles.row}>
        {CARDS.map((card) => (
          <Pressable
            key={card.variant}
            onPress={() => setActiveVariant(card.variant)}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            accessibilityRole="button"
            accessibilityLabel={t(card.titleKey)}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={card.icon} size={20} color={colors.accent} />
            </View>
            <Text style={styles.cardTitle} numberOfLines={2}>{t(card.titleKey)}</Text>
            <Text style={styles.cardSub} numberOfLines={2}>{t(card.subKey)}</Text>
            <View style={styles.durationRow}>
              <Ionicons name="play-circle-outline" size={12} color={colors.textMuted} />
              <Text style={styles.duration}>{t(card.minKey, { min: card.minutes })}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <GuidedReflectionSheet
        visible={activeVariant !== null}
        variant={activeVariant ?? "meditation"}
        verseText={verseText}
        verseReference={verseReference}
        onClose={() => setActiveVariant(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: "row", gap: spacing.sm },
  card: {
    flex: 1,
    backgroundColor: colors.backgroundElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardPressed: { opacity: 0.8, borderColor: colors.accent },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.accentGlow,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  cardTitle: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "700",
    lineHeight: 18,
  },
  cardSub: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: spacing.xs,
  },
  duration: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
});
