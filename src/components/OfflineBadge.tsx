import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors, radii, spacing, typography } from "@/theme";

interface OfflineBadgeProps {
  ready: boolean;
}

export function OfflineBadge({ ready }: OfflineBadgeProps) {
  const { t } = useTranslation();

  if (!ready) {
    return null;
  }

  return (
    <View style={styles.badge} accessibilityRole="text">
      <Ionicons name="cloud-offline-outline" size={12} color={colors.success} />
      <Text style={styles.label}>{t("home.offlineReady")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.25)",
    backgroundColor: "rgba(52, 211, 153, 0.08)",
  },
  label: {
    ...typography.caption,
    color: colors.success,
    fontSize: 11,
  },
});
