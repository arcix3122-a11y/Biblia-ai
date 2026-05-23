import { useTranslation } from "react-i18next";
import type { AppLocale } from "@/i18n";
import { useLocaleStore } from "@/store/localeStore";

export function useAppTranslation() {
  const { t, i18n } = useTranslation();
  const storedLocale = useLocaleStore((state) => state.locale);
  const locale = storedLocale ?? (i18n.language as AppLocale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  return {
    t,
    i18n,
    locale,
    setLocale,
  };
}

export type { TranslationKey } from "@/i18n/types";
