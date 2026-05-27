import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";

type NotificationsModule = typeof import("expo-notifications");

let notificationsPromise: Promise<NotificationsModule | null> | null = null;
let handlerInstalled = false;

function isExpoGoClient(): boolean {
  // storeClient means Expo Go. appOwnership fallback keeps compatibility.
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
  body: string
): Promise<void> {
  const Notifications = await ensureNotificationHandler();
  if (!Notifications) {
    return;
  }

  await Notifications.cancelAllScheduledNotificationsAsync();

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("daily-reading", {
      name: "Daily Reading Reminder",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: false },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelDailyReminder(): Promise<void> {
  const Notifications = await ensureNotificationHandler();
  if (!Notifications) {
    return;
  }

  await Notifications.cancelAllScheduledNotificationsAsync();
}
