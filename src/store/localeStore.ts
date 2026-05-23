import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getDeviceLocale, i18n } from "@/i18n";
import type { AppLocale } from "@/i18n";

interface LocaleState {
  locale: AppLocale | null;
  hydrated: boolean;
  setLocale: (locale: AppLocale) => Promise<void>;
  resolveInitialLocale: () => AppLocale;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: null,
      hydrated: false,
      resolveInitialLocale: () => get().locale ?? getDeviceLocale(),
      setLocale: async (locale) => {
        await i18n.changeLanguage(locale);
        set({ locale });
      },
    }),
    {
      name: "@biblia-ai/locale",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => () => {
        useLocaleStore.setState({ hydrated: true });
      },
      partialize: (state) => ({ locale: state.locale }),
    }
  )
);
