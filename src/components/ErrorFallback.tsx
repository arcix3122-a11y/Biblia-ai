import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, radii, spacing, typography } from "@/theme";

interface ErrorFallbackProps {
  message: string;
  onRetry: () => void;
}

export function ErrorFallback({ message, onRetry }: ErrorFallbackProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("errors.somethingWrong")}</Text>
      <Text style={styles.message} numberOfLines={4}>
        {message || t("errors.unexpected")}
      </Text>
      <Pressable onPress={onRetry} style={styles.button}>
        <Text style={styles.buttonText}>{t("common.tryAgain")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.accentGlow,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  buttonText: {
    ...typography.subtitle,
    color: colors.accent,
  },
});
