import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getDeviceLocale } from "@/i18n";
import type { AppLocale } from "@/i18n";
import type { ScriptureTranslation, TranslationPreference } from "@/types/scripture";

interface TranslationState {
  preference: TranslationPreference;
  hydrated: boolean;
  setPreference: (preference: TranslationPreference) => void;
  resolveTranslation: (locale?: AppLocale | null) => ScriptureTranslation;
}

export function resolveScriptureTranslation(
  preference: TranslationPreference,
  locale?: AppLocale | null
): ScriptureTranslation {
  if (preference === "en" || preference === "pl") {
    return preference;
  }
  const lng = locale ?? getDeviceLocale();
  return lng === "pl" ? "pl" : "en";
}

export const useTranslationStore = create<TranslationState>()(
  persist(
    (set, get) => ({
      preference: "auto",
      hydrated: false,
      setPreference: (preference) => set({ preference }),
      resolveTranslation: (locale) =>
        resolveScriptureTranslation(get().preference, locale),
    }),
    {
      name: "@biblia-ai/scripture-translation",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => () => {
        useTranslationStore.setState({ hydrated: true });
      },
      partialize: (state) => ({ preference: state.preference }),
    }
  )
);

export function useActiveTranslation(locale?: AppLocale | null): ScriptureTranslation {
  const preference = useTranslationStore((s) => s.preference);
  return resolveScriptureTranslation(preference, locale);
}
