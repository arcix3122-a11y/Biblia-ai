import React, { useCallback } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAppTranslation } from "@/hooks/useAppTranslation";
import { useDailyReminderSchedule } from "@/hooks/useDailyReminderSchedule";
import { useReminderStore } from "@/store/reminderStore";
import { colors, radii, spacing, typography } from "@/theme";

interface ReminderFunnelPromptProps {
  visible: boolean;
  onClose: () => void;
}

export function ReminderFunnelPrompt({ visible, onClose }: ReminderFunnelPromptProps) {
  const { t } = useAppTranslation();
  const router = useRouter();
  const markSeen = useReminderStore((s) => s.markReminderFunnelPromptSeen);
  const { enableReminders, canSchedule } = useDailyReminderSchedule();

  const dismiss = useCallback(() => {
    markSeen();
    onClose();
  }, [markSeen, onClose]);

  const handleEnable = useCallback(async () => {
    if (!canSchedule) {
      markSeen();
      onClose();
      router.push("/settings");
      return;
    }
    const result = await enableReminders();
    markSeen();
    onClose();
    if (result === "denied") {
      router.push("/settings");
    }
  }, [canSchedule, enableReminders, markSeen, onClose, router]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.badgeRow}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>{t("home.reminderFunnelBadge")}</Text>
          </View>
          <Text style={styles.title}>{t("home.reminderFunnelTitle")}</Text>
          <Text style={styles.body}>{t("home.reminderFunnelBody")}</Text>
          {!canSchedule ? (
            <Text style={styles.note}>{t("settings.notificationsExpoGoNote")}</Text>
          ) : null}
          <View style={styles.actions}>
            <Pressable onPress={dismiss} style={styles.secondaryButton} accessibilityRole="button">
              <Text style={styles.secondaryText}>{t("home.reminderFunnelLater")}</Text>
            </Pressable>
            <Pressable
              onPress={() => void handleEnable()}
              style={styles.primaryButton}
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>{t("home.reminderFunnelEnable")}</Text>
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
    gap: spacing.sm,
    alignSelf: "center",
    width: "100%",
    maxWidth: 440,
  },
  badgeRow: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accentGlow,
    backgroundColor: colors.accentMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  badgeText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "700",
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  body: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  note: {
    ...typography.caption,
    color: colors.textSecondary,
    backgroundColor: colors.glassOverlay,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    lineHeight: 18,
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
