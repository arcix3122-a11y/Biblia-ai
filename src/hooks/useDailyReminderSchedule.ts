import { useCallback } from "react";
import { useAppTranslation } from "@/hooks/useAppTranslation";
import {
  cancelDailyReminder,
  canScheduleNotifications,
  requestNotificationPermission,
  scheduleDailyReminder,
  type EveningRescueOptions,
} from "@/services/notifications/reminderService";
import { useReminderStore } from "@/store/reminderStore";

export type ReminderScheduleResult = "ok" | "denied" | "unavailable";

export function useDailyReminderSchedule() {
  const { t } = useAppTranslation();
  const hour = useReminderStore((s) => s.hour);
  const minute = useReminderStore((s) => s.minute);
  const eveningRescueEnabled = useReminderStore((s) => s.eveningRescueEnabled);
  const setEnabled = useReminderStore((s) => s.setEnabled);
  const setTime = useReminderStore((s) => s.setTime);
  const setEveningRescueEnabled = useReminderStore((s) => s.setEveningRescueEnabled);

  const buildEveningRescue = useCallback((): EveningRescueOptions | undefined => {
    if (!eveningRescueEnabled) {
      return undefined;
    }
    return {
      title: t("settings.eveningRescueTitle"),
      body: t("settings.eveningRescueBody"),
    };
  }, [eveningRescueEnabled, t]);

  const applySchedule = useCallback(
    async (nextHour: number, nextMinute: number): Promise<void> => {
      if (!canScheduleNotifications()) {
        return;
      }
      await scheduleDailyReminder(
        nextHour,
        nextMinute,
        t("common.appName"),
        t("settings.notificationsBody"),
        buildEveningRescue()
      );
    },
    [buildEveningRescue, t]
  );

  const enableReminders = useCallback(async (): Promise<ReminderScheduleResult> => {
    if (!canScheduleNotifications()) {
      return "unavailable";
    }
    const granted = await requestNotificationPermission();
    if (!granted) {
      return "denied";
    }
    await applySchedule(hour, minute);
    setEnabled(true);
    return "ok";
  }, [applySchedule, hour, minute, setEnabled]);

  const disableReminders = useCallback(async (): Promise<void> => {
    if (canScheduleNotifications()) {
      await cancelDailyReminder();
    }
    setEnabled(false);
  }, [setEnabled]);

  const updateTime = useCallback(
    async (nextHour: number, nextMinute: number, reschedule: boolean): Promise<void> => {
      setTime(nextHour, nextMinute);
      if (reschedule) {
        await applySchedule(nextHour, nextMinute);
      }
    },
    [applySchedule, setTime]
  );

  const updateEveningRescue = useCallback(
    async (enabled: boolean, reminderOn: boolean): Promise<void> => {
      setEveningRescueEnabled(enabled);
      if (reminderOn) {
        await applySchedule(hour, minute);
      }
    },
    [applySchedule, hour, minute, setEveningRescueEnabled]
  );

  return {
    hour,
    minute,
    eveningRescueEnabled,
    canSchedule: canScheduleNotifications(),
    enableReminders,
    disableReminders,
    applySchedule,
    updateTime,
    updateEveningRescue,
  };
}
