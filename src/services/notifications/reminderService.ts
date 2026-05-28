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

function isExpoGoClient(): boolean {
  const executionEnvironment = Constants.executionEnvironment;
  const appOwnership = Constants.appOwnership;
  return executionEnvironment === "storeClient" || appOwnership === "expo";
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

  await Notifications.scheduleNotificationAsync({
    identifier: MORNING_REMINDER_ID,
    content: { title, body, sound: false },
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
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: eveningRescue.hour ?? DEFAULT_EVENING_HOUR,
        minute: eveningRescue.minute ?? DEFAULT_EVENING_MINUTE,
        channelId: Platform.OS === "android" ? "evening-rescue" : undefined,
      },
    });
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
