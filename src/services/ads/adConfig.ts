import { isExpoGoClient } from "@/services/notifications/reminderService";
import { Platform } from "react-native";

const TEST_BANNER_ID = "ca-app-pub-3940256099942544/6300978111";
const TEST_INTERSTITIAL_ID = "ca-app-pub-3940256099942544/1033173712";

export function canServeAdMob(): boolean {
  return !isExpoGoClient();
}

export function getHomeBannerUnitId(): string {
  if (__DEV__) {
    return TEST_BANNER_ID;
  }

  if (Platform.OS === "android") {
    return (
      process.env.EXPO_PUBLIC_ADMOB_BANNER_HOME_ANDROID_ID?.trim() ||
      process.env.EXPO_PUBLIC_ADMOB_BANNER_HOME_ID?.trim() ||
      TEST_BANNER_ID
    );
  }

  if (Platform.OS === "ios") {
    return (
      process.env.EXPO_PUBLIC_ADMOB_BANNER_HOME_IOS_ID?.trim() ||
      process.env.EXPO_PUBLIC_ADMOB_BANNER_HOME_ID?.trim() ||
      TEST_BANNER_ID
    );
  }

  return TEST_BANNER_ID;
}

export function getCoreInterstitialUnitId(): string {
  if (__DEV__) {
    return TEST_INTERSTITIAL_ID;
  }

  if (Platform.OS === "android") {
    return (
      process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_CORE_ANDROID_ID?.trim() ||
      process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_CORE_ID?.trim() ||
      TEST_INTERSTITIAL_ID
    );
  }

  if (Platform.OS === "ios") {
    return (
      process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_CORE_IOS_ID?.trim() ||
      process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_CORE_ID?.trim() ||
      TEST_INTERSTITIAL_ID
    );
  }

  return TEST_INTERSTITIAL_ID;
}
