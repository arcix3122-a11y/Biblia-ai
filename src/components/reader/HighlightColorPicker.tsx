import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { HighlightColor } from "@/types/scripture";
import {
  getHighlightSwatchColor,
  HIGHLIGHT_SWATCHES,
} from "@/utils/highlightColors";
import { colors, radii, spacing, typography } from "@/theme";

interface HighlightColorPickerProps {
  activeColor?: HighlightColor;
  onSelect: (color: HighlightColor) => void;
  onClear: () => void;
}

export function HighlightColorPicker({
  activeColor,
  onSelect,
  onClear,
}: HighlightColorPickerProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t("reader.highlight")}</Text>
      <View style={styles.swatches}>
        {HIGHLIGHT_SWATCHES.map((color) => (
          <Pressable
            key={color}
            onPress={() => onSelect(color)}
            style={[
              styles.swatch,
              { backgroundColor: getHighlightSwatchColor(color) },
              activeColor === color && styles.swatchActive,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t(`reader.highlightColor.${color}`)}
          />
        ))}
        {activeColor ? (
          <Pressable
            onPress={onClear}
            style={styles.clearBtn}
            accessibilityRole="button"
            accessibilityLabel={t("reader.clearHighlight")}
          >
            <Text style={styles.clearText}>×</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  swatches: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: "transparent",
  },
  swatchActive: {
    borderColor: colors.textPrimary,
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  clearText: {
    color: colors.textMuted,
    fontSize: 18,
    lineHeight: 20,
  },
});
