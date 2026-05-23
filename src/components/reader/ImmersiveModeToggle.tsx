import React from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, radii, spacing, typography } from "@/theme";
import type { ImmersiveModeToggleProps } from "@/types/ui";

export function ImmersiveModeToggle({
  immersive,
  onToggle,
  chromeOpacity,
}: ImmersiveModeToggleProps) {
  const { t } = useTranslation();

  return (
    <Animated.View style={{ opacity: chromeOpacity }}>
      <Pressable
        onPress={onToggle}
        style={[styles.button, immersive && styles.buttonActive]}
        accessibilityRole="button"
        accessibilityLabel={
          immersive ? t("reader.exitImmersiveA11y") : t("reader.enterImmersive")
        }
      >
        <Text style={[styles.label, immersive && styles.labelActive]}>
          {immersive ? t("reader.showChrome") : t("reader.immersive")}
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
