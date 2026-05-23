import React from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";
import { colors, radii, spacing, typography } from "@/theme";
import type { ImmersiveModeToggleProps } from "@/types/ui";

export function ImmersiveModeToggle({
  immersive,
  onToggle,
  chromeOpacity,
}: ImmersiveModeToggleProps) {
  return (
    <Animated.View style={{ opacity: chromeOpacity }}>
      <Pressable
        onPress={onToggle}
        style={[styles.button, immersive && styles.buttonActive]}
        accessibilityRole="button"
        accessibilityLabel={immersive ? "Exit immersive reading" : "Enter immersive reading"}
      >
        <Text style={[styles.label, immersive && styles.labelActive]}>
          {immersive ? "Show chrome" : "Immersive"}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  buttonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentGlow,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  labelActive: {
    color: colors.accent,
  },
});
