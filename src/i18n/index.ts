import { getLocales } from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import pl from "./locales/pl.json";
import type { AppLocale } from "./types";
import { SUPPORTED_LOCALES } from "./types";

export type { AppLocale, TranslationResources } from "./types";
export { SUPPORTED_LOCALES };

export const LOCALE_INTL: Record<AppLocale, string> = {
  en: "en-US",
  pl: "pl-PL",
};

export function getDeviceLocale(): AppLocale {
  const languageCode = getLocales()[0]?.languageCode?.toLowerCase();
  return languageCode === "pl" ? "pl" : "en";
}

export function resolveAppLocale(locale: AppLocale | null | undefined): AppLocale {
  return locale ?? getDeviceLocale();
}

export async function initI18n(locale: AppLocale): Promise<typeof i18n> {
  if (i18n.isInitialized) {
    if (i18n.language !== locale) {
      await i18n.changeLanguage(locale);
    }
    return i18n;
  }

  await i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      pl: { translation: pl },
    },
    lng: locale,
    fallbackLng: "en",
    supportedLngs: [...SUPPORTED_LOCALES],
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: "v4",
  });

  return i18n;
}

export { i18n };
export default i18n;
