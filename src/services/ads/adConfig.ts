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

export async function requestAdsConsentIfNeeded(): Promise<void> {
  if (!canServeAdMob()) {
    return;
  }

  try {
    const ads = require("react-native-google-mobile-ads");
    if (ads && ads.AdsConsent) {
      console.log("[AdConsent] Requesting consent info update...");
      const consentInfo = await ads.AdsConsent.requestInfoUpdate();
      
      if (consentInfo.isConsentFormAvailable && consentInfo.status === "REQUIRED") {
        console.log("[AdConsent] Consent is required, presenting UMP form...");
        await ads.AdsConsent.showForm();
      } else {
        console.log("[AdConsent] Consent check passed or not required. Status:", consentInfo.status);
      }
    }
  } catch (err) {
    console.warn("[AdConsent] Failed to run UMP consent check:", err);
  }
}
