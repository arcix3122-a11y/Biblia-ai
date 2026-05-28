import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing, typography } from "@/theme";

export type AiAssistantMode = "live" | "offline" | "fallback";

type Props = {
  mode: AiAssistantMode;
  label: string;
  reason?: string;
  compact?: boolean;
};

export function AiModePill({ mode, label, reason, compact = false }: Props) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View
        style={[
          styles.badge,
          compact && styles.badgeCompact,
          mode === "live"
            ? styles.badgeLive
            : mode === "fallback"
              ? styles.badgeFallback
              : styles.badgeOffline,
        ]}
      >
        <Ionicons
          name={
            mode === "live"
              ? "radio-outline"
              : mode === "fallback"
                ? "refresh-outline"
                : "moon-outline"
          }
          size={compact ? 12 : 13}
          color={colors.accent}
        />
        <Text style={[styles.badgeText, compact && styles.badgeTextCompact]}>{label}</Text>
      </View>
      {reason ? (
        <Text
          style={[styles.reason, compact && styles.reasonCompact]}
          numberOfLines={compact ? 2 : 3}
        >
          {reason}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "flex-end",
    gap: 4,
    maxWidth: 168,
  },
  wrapCompact: {
    maxWidth: 148,
    marginRight: spacing.xs,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
  },
  badgeCompact: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
  },
  badgeLive: {
    backgroundColor: "rgba(23, 179, 126, 0.08)",
    borderColor: "rgba(23, 179, 126, 0.18)",
  },
  badgeFallback: {
    backgroundColor: colors.accentGlow,
    borderColor: "rgba(229,169,60,0.18)",
  },
  badgeOffline: {
    backgroundColor: "rgba(108, 122, 148, 0.12)",
    borderColor: colors.glassBorder,
  },
  badgeText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  badgeTextCompact: {
    fontSize: 11,
  },
  reason: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "right",
  },
  reasonCompact: {
    fontSize: 10,
    lineHeight: 13,
  },
});
