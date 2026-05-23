import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "@/theme";

type LoadingVariant = "full" | "inline" | "grid";

interface LoadingStateProps {
  message?: string;
  variant?: LoadingVariant;
}

function SkeletonBar({ width }: { width: `${number}%` | number }) {
  return <View style={[styles.skeletonBar, { width }]} />;
}

export function LoadingState({ message, variant = "full" }: LoadingStateProps) {
  if (variant === "inline") {
    return (
      <View style={styles.inline}>
        <ActivityIndicator color={colors.accent} size="small" />
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    );
  }

  if (variant === "grid") {
    return (
      <View style={styles.grid}>
        {Array.from({ length: 6 }).map((_, index) => (
          <View key={index} style={styles.gridTile} />
        ))}
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.full} accessibilityRole="progressbar">
      <ActivityIndicator color={colors.accent} size="large" />
      <View style={styles.skeletonStack}>
        <SkeletonBar width="72%" />
        <SkeletonBar width="100%" />
        <SkeletonBar width="88%" />
      </View>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  full: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.lg,
  },
  inline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  gridTile: {
    width: "47%",
    height: 88,
    borderRadius: radii.lg,
    backgroundColor: colors.tile,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    opacity: 0.55,
  },
  skeletonStack: {
    width: "100%",
    maxWidth: 280,
    gap: spacing.sm,
  },
  skeletonBar: {
    height: 12,
    borderRadius: radii.sm,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    opacity: 0.7,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
