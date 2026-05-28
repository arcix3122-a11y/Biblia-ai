import React from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { getTierById, type DonorTierId } from "@/data/donationTiers";
import { radii, spacing, typography } from "@/theme";

interface DonorTierBadgeProps {
  tierId: DonorTierId;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

export function DonorTierBadge({ tierId, style, compact = false }: DonorTierBadgeProps) {
  const { t } = useTranslation();
  const tier = getTierById(tierId);

  return (
    <View
      style={[
        styles.badge,
        compact && styles.badgeCompact,
        {
          backgroundColor: tier.badgeGlow,
          borderColor: tier.badgeBorder,
        },
        style,
      ]}
    >
      <Ionicons name="ribbon-outline" size={compact ? 14 : 16} color={tier.badgeColor} />
      <Text style={[styles.label, compact && styles.labelCompact, { color: tier.badgeColor }]}>
        {t(`donorTier.${tierId}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  badgeCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  label: {
    ...typography.caption,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  labelCompact: {
    fontSize: 11,
  },
});
