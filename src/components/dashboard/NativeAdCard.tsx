import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "@/components/GlassCard";
import { useAppTranslation } from "@/hooks/useAppTranslation";
import { useDonorStore } from "@/store/donorStore";
import { colors, radii, spacing, typography } from "@/theme";

export function NativeAdCard() {
  const { t } = useAppTranslation();
  const donorTier = useDonorStore((s) => s.donorTier);

  if (donorTier !== null) {
    return null;
  }

  return (
    <GlassCard style={styles.card}>
      <View style={styles.badgeRow}>
        <View style={styles.adBadge}>
          <Text style={styles.adBadgeText}>{t("ad.sponsorLabel")}</Text>
        </View>
        <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
      </View>

      <View style={styles.contentRow}>
        <View style={styles.iconContainer}>
          <Ionicons name="phone-portrait-outline" size={22} color={colors.accent} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.adTitle} numberOfLines={1}>
            {t("ad.fallbackTitle")}
          </Text>
          <Text style={styles.adBody} numberOfLines={2}>
            {t("ad.fallbackBody")}
          </Text>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    borderColor: "rgba(229, 169, 60, 0.2)",
    borderWidth: 1,
    backgroundColor: "rgba(10, 10, 10, 0.45)",
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  adBadge: {
    backgroundColor: "rgba(229, 169, 60, 0.12)",
    borderColor: colors.accent,
    borderWidth: 0.5,
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  adBadgeText: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: "rgba(229, 169, 60, 0.06)",
    borderColor: "rgba(229, 169, 60, 0.2)",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  adTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  adBody: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 16,
  },
});
