import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";

type NotificationsModule = typeof import("expo-notifications");

const MORNING_REMINDER_ID = "biblia-daily-morning";
const EVENING_REMINDER_ID = "biblia-evening-rescue";
const DEFAULT_EVENING_HOUR = 20;
const DEFAULT_EVENING_MINUTE = 30;

let notificationsPromise: Promise<NotificationsModule | null> | null = null;
let handlerInstalled = false;

export interface EveningRescueOptions {
  title: string;
  body: string;
  hour?: number;
  minute?: number;
}

export function isExpoGoClient(): boolean {
  const executionEnvironment = Constants.executionEnvironment;
  const appOwnership = Constants.appOwnership;
  return executionEnvironment === "storeClient" || appOwnership === "expo";
}

/** Local notification scheduling works in dev/production builds, not in Expo Go. */
export function canScheduleNotifications(): boolean {
  return !isExpoGoClient() && Device.isDevice;
}

async function getNotificationsModule(): Promise<NotificationsModule | null> {
  if (isExpoGoClient()) {
    return null;
  }

  if (!notificationsPromise) {
    notificationsPromise = import("expo-notifications");
  }

  return notificationsPromise;
}

async function ensureNotificationHandler(): Promise<NotificationsModule | null> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) {
    return null;
  }

  if (!handlerInstalled) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    handlerInstalled = true;
  }

  return Notifications;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) return false;

  const Notifications = await ensureNotificationHandler();
  if (!Notifications) {
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function updateEveningRescueStatus(): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  try {
    const { useDailyRhythmStore } = await import("@/store/dailyRhythmStore");
    const { useReminderStore } = await import("@/store/reminderStore");
    
    const isCompleted = useDailyRhythmStore.getState().isCompleteToday();
    const reminderEnabled = useReminderStore.getState().enabled;
    const eveningEnabled = useReminderStore.getState().eveningRescueEnabled;

    if (isCompleted || !reminderEnabled || !eveningEnabled) {
      await Notifications.cancelScheduledNotificationAsync(EVENING_REMINDER_ID);
    }
  } catch (err) {
    console.warn("Failed to update evening rescue status:", err);
  }
}

export async function scheduleDailyReminder(
  hour: number,
  minute: number,
  title: string,
  body: string,
  eveningRescue?: EveningRescueOptions
): Promise<void> {
  const Notifications = await ensureNotificationHandler();
  if (!Notifications) {
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(MORNING_REMINDER_ID);
  await Notifications.cancelScheduledNotificationAsync(EVENING_REMINDER_ID);

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("daily-reading", {
      name: "Daily Reading Reminder",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.setNotificationChannelAsync("evening-rescue", {
      name: "Evening Streak Reminder",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  let fullBody = body;
  let deepLinkUrl = "biblia-ai://(tabs)/library";

  try {
    const { getVerseOfTheDay } = await import("@/services/db/scriptureRepository");
    const { formatBookReference } = await import("@/i18n/bookNames");
    const { useLocaleStore } = await import("@/store/localeStore");
    
    const locale = useLocaleStore.getState().locale || "en";
    const translation = locale === "pl" ? "pl" : "en";
    
    const votd = await getVerseOfTheDay(translation);
    if (votd) {
      const ref = formatBookReference(
        votd.book_slug,
        votd.chapter_number,
        votd.number,
        locale,
        votd.book_name
      );
      fullBody = `${body}\n\n"${votd.text}" - ${ref}`;
      deepLinkUrl = `biblia-ai://reader/${votd.book_slug}/${votd.chapter_number}?verse=${votd.number}`;
    }
  } catch (err) {
    console.warn("Could not load VOTD text for morning reminder:", err);
  }

  await Notifications.scheduleNotificationAsync({
    identifier: MORNING_REMINDER_ID,
    content: {
      title,
      body: fullBody,
      sound: false,
      data: { url: deepLinkUrl }
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  if (eveningRescue) {
    await Notifications.scheduleNotificationAsync({
      identifier: EVENING_REMINDER_ID,
      content: {
        title: eveningRescue.title,
        body: eveningRescue.body,
        sound: false,
        data: { url: "biblia-ai://(tabs)" }
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: eveningRescue.hour ?? DEFAULT_EVENING_HOUR,
        minute: eveningRescue.minute ?? DEFAULT_EVENING_MINUTE,
        channelId: Platform.OS === "android" ? "evening-rescue" : undefined,
      },
    });

    // Check if tasks already completed today and cancel if so
    void updateEveningRescueStatus();
  }
}

export async function cancelDailyReminder(): Promise<void> {
  const Notifications = await ensureNotificationHandler();
  if (!Notifications) {
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(MORNING_REMINDER_ID);
  await Notifications.cancelScheduledNotificationAsync(EVENING_REMINDER_ID);
}

const GUIDED_PRAYER_REMINDER_ID = "biblia-guided-prayer";
const PRACTICE_REMINDER_ID_PREFIX = "biblia-practice-";

export async function scheduleGuidedPrayerReminder(
  hour: number,
  minute: number,
  title: string,
  body: string
): Promise<void> {
  const Notifications = await ensureNotificationHandler();
  if (!Notifications) {
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(GUIDED_PRAYER_REMINDER_ID);

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("guided-prayer", {
      name: "Guided Prayer Reminder",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.scheduleNotificationAsync({
    identifier: GUIDED_PRAYER_REMINDER_ID,
    content: {
      title,
      body,
      sound: false,
      data: { url: "biblia-ai://guided-prayer" }
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelGuidedPrayerReminder(): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(GUIDED_PRAYER_REMINDER_ID);
}

export async function schedulePracticeReminder(
  practiceId: string,
  hour: number,
  minute: number,
  title: string,
  body: string
): Promise<void> {
  const Notifications = await ensureNotificationHandler();
  if (!Notifications) {
    return;
  }

  const identifier = `${PRACTICE_REMINDER_ID_PREFIX}${practiceId}`;
  await Notifications.cancelScheduledNotificationAsync(identifier);

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("practices", {
      name: "Spiritual Practices Reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title,
      body,
      sound: false,
      data: { url: `biblia-ai://practice/${practiceId}` }
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelPracticeReminder(practiceId: string): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(`${PRACTICE_REMINDER_ID_PREFIX}${practiceId}`);
}

export async function presentLocalNotification(
  identifier: string,
  title: string,
  body: string,
  url?: string
): Promise<void> {
  const Notifications = await ensureNotificationHandler();
  if (!Notifications) {
    return;
  }

  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.status !== "granted") {
    return;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("community", {
      name: "Community",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title,
      body,
      sound: false,
      data: url ? { url } : undefined,
    },
    trigger: null,
  });
}
