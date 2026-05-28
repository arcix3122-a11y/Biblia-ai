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
          <Text style={styles.title}>{t("home.reminderFunnelTitle")}</Text>
          <Text style={styles.body}>{t("home.reminderFunnelBody")}</Text>
          {!canSchedule ? (
            <Text style={styles.note}>{t("settings.notificationsExpoGoNote")}</Text>
          ) : null}
          <View style={styles.actions}>
            <Pressable
              onPress={() => void handleEnable()}
              style={styles.primaryButton}
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>{t("home.reminderFunnelEnable")}</Text>
            </Pressable>
            <Pressable onPress={dismiss} style={styles.secondaryButton} accessibilityRole="button">
              <Text style={styles.secondaryText}>{t("home.reminderFunnelLater")}</Text>
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
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.backgroundElevated,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    ...typography.subtitle,
    color: colors.accent,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  note: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  primaryText: {
    ...typography.body,
    color: colors.canvas,
    fontWeight: "700",
  },
  secondaryButton: {
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  secondaryText: {
    ...typography.body,
    color: colors.textMuted,
  },
});
