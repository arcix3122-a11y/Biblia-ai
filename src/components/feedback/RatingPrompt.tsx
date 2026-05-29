import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTranslation } from "@/hooks/useAppTranslation";
import { colors, radii, spacing, typography } from "@/theme";

interface RatingPromptProps {
  visible: boolean;
  onRateNow: () => void;
  onLater: () => void;
}

export function RatingPrompt({ visible, onRateNow, onLater }: RatingPromptProps) {
  const { t } = useAppTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onLater}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{t("home.ratingPromptTitle")}</Text>
          <Text style={styles.body}>{t("home.ratingPromptBody")}</Text>

          <View style={styles.actions}>
            <Pressable onPress={onLater} style={styles.secondaryButton} accessibilityRole="button">
              <Text style={styles.secondaryText}>{t("home.ratingPromptLater")}</Text>
            </Pressable>

            <Pressable onPress={onRateNow} style={styles.primaryButton} accessibilityRole="button">
              <Text style={styles.primaryText}>{t("home.ratingPromptRateNow")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.76)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.backgroundElevated,
    padding: spacing.xl,
    alignSelf: "center",
    width: "100%",
    maxWidth: 440,
    gap: spacing.sm,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  actions: {
    marginTop: spacing.sm,
    flexDirection: "row",
    gap: spacing.sm,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    minHeight: 52,
  },
  primaryText: {
    ...typography.body,
    color: colors.canvas,
    fontWeight: "700",
  },
  secondaryButton: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.textMuted,
    backgroundColor: colors.glassOverlay,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    minHeight: 52,
  },
  secondaryText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },
});
