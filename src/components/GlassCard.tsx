import React, { type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, glass, radii, spacing } from "@/theme";

interface GlassCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function GlassCard({ children, style }: GlassCardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.tile,
    borderRadius: radii.lg,
    borderWidth: glass.borderWidth,
    borderColor: glass.borderColor,
    padding: spacing.md,
    overflow: "hidden",
  },
});
