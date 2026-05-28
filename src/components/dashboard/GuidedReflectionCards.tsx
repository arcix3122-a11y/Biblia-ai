import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ActionTile } from "@/components/dashboard/ActionTile";
import { getCategoryPhotoUrl } from "@/data/photoBackgrounds";
import { GuidedReflectionSheet, type ReflectionVariant } from "./GuidedReflectionSheet";
import { spacing, typography, colors } from "@/theme";

interface Props {
  verseText: string;
  verseReference: string;
  openVariant?: ReflectionVariant | null;
  onOpenVariantHandled?: () => void;
}

interface CardConfig {
  variant: ReflectionVariant;
  icon: React.ComponentProps<typeof import("@expo/vector-icons").Ionicons>["name"];
  titleKey: string;
  subKey: string;
  minKey: string;
  minutes: number;
  photoKey: "guidedMeditation" | "guidedSilence";
}

const CARDS: CardConfig[] = [
  {
    variant: "meditation",
    icon: "sparkles",
    titleKey: "viralFeed.reflectionTitle",
    subKey: "viralFeed.reflectionSub",
    minKey: "viralFeed.readTime",
    minutes: 3,
    photoKey: "guidedMeditation",
  },
  {
    variant: "silence",
    icon: "moon-outline",
    titleKey: "viralFeed.silenceTitle",
    subKey: "viralFeed.silenceSub",
    minKey: "viralFeed.readTime",
    minutes: 5,
    photoKey: "guidedSilence",
  },
];

export function GuidedReflectionCards({
  verseText,
  verseReference,
  openVariant,
  onOpenVariantHandled,
}: Props) {
  const { t: tAny } = useTranslation();
  const t = tAny as (key: string, options?: Record<string, unknown>) => string;
  const [activeVariant, setActiveVariant] = useState<ReflectionVariant | null>(null);

  React.useEffect(() => {
    if (openVariant) {
      setActiveVariant(openVariant);
      onOpenVariantHandled?.();
    }
  }, [onOpenVariantHandled, openVariant]);

  if (!verseText || !verseReference) return null;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.sectionLabel}>{t("home.verseReflectionSection")}</Text>
      <View style={styles.row}>
        {CARDS.map((card) => (
          <View key={card.variant} style={styles.tileWrap}>
            <ActionTile
              icon={card.icon}
              title={t(card.titleKey)}
              subtitle={t(card.minKey, { min: card.minutes })}
              imageUrl={getCategoryPhotoUrl(card.photoKey, 600, 600)}
              layout="vertical"
              onPress={() => setActiveVariant(card.variant)}
              accessibilityLabel={t(card.titleKey)}
            />
          </View>
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
  tileWrap: { flex: 1 },
});
