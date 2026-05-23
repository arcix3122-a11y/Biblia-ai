import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTranslation } from "@/hooks/useAppTranslation";
import type { AppLocale } from "@/i18n";
import { colors, radii, spacing, typography } from "@/theme";

const OPTIONS: readonly AppLocale[] = ["pl", "en"];

interface LanguageSwitcherProps {
  style?: object;
}

export function LanguageSwitcher({ style }: LanguageSwitcherProps) {
  const { t, locale, setLocale } = useAppTranslation();

  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="tablist"
      accessibilityLabel={t("languageSwitcher.accessibilityLabel")}
    >
      {OPTIONS.map((option) => {
        const active = locale === option;
        return (
          <Pressable
            key={option}
            onPress={() => void setLocale(option)}
            style={[styles.segment, active && styles.segmentActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t(`settings.language${option === "pl" ? "Pl" : "En"}`)}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
              {t(`languageSwitcher.${option}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.inputBackground,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
  segmentActive: {
    backgroundColor: colors.accentGlow,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  segmentText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: colors.accent,
  },
});
