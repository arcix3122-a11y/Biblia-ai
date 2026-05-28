import React, { useEffect, useState } from "react";
import { ActivityIndicator, AppState, LogBox, Platform, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useTranslation } from "react-i18next";
import { GlobalAudioBar } from "@/components/audio/GlobalAudioBar";
import { AudioOnboarding } from "@/components/AudioOnboarding";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { ScriptureImportScreen } from "@/components/ScriptureImportScreen";
import { ChromeProvider } from "@/context/ChromeContext";
import { initI18n } from "@/i18n";
import i18n from "@/i18n";
import { initializeErrorLogger, logError } from "@/services/errors/errorLogger";
import { getDatabase, resetDatabaseInit } from "@/services/db/database";
import { ensureAnonymousSession } from "@/services/supabase/supabaseClient";
import { flushPendingComments } from "@/services/social/votdSocialRepository";
import { initSyncEngine, scheduleSync } from "@/services/sync/syncEngine";
import { useBookmarksStore } from "@/store/bookmarksStore";
import { useHighlightsStore } from "@/store/highlightsStore";
import { useHistoryStore } from "@/store/historyStore";
import { useAudioOnboardingStore } from "@/store/audioOnboardingStore";
import { useLocaleStore } from "@/store/localeStore";
import { useReminderStore } from "@/store/reminderStore";
import { useSeedProgressStore } from "@/store/seedProgressStore";
import { useYearPlanStore } from "@/store/yearPlanStore";
import { scheduleDailyReminder, requestNotificationPermission } from "@/services/notifications/reminderService";
import { colors } from "@/theme";

LogBox.ignoreLogs([
  "Non-serializable values were found in the navigation state",
  "TypeError: Network request failed",
  "Network request failed",
  "AbortError",
]);

function isBenignNetworkError(error: Error): boolean {
  const msg = error.message ?? "";
  return (
    msg.includes("Network request failed") ||
    msg.includes("Failed to fetch") ||
    msg.includes("AbortError")
  );
}

function installGlobalErrorHandler(): void {
  const errorUtils = (
    globalThis as typeof globalThis & {
      ErrorUtils?: {
        getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
        setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
      };
    }
  ).ErrorUtils;

  if (!errorUtils) {
    return;
  }

  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    logError(error, isFatal ? "FatalJSException" : "JSException", {
      platform: Platform.OS,
      isFatal: Boolean(isFatal),
    });
    if (isBenignNetworkError(error) && !isFatal) {
      return;
    }
    previous(error, isFatal);
  });
}

function RootStack() {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.backgroundElevated },
        headerTintColor: colors.accent,
        headerTitleStyle: { color: colors.textPrimary },
        contentStyle: { backgroundColor: colors.canvas },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="book/[bookSlug]"
        options={{ title: t("navigation.chapters"), presentation: "card" }}
      />
      <Stack.Screen
        name="reader/[bookSlug]/[chapter]"
        options={{ title: t("navigation.reader"), headerShown: false }}
      />
      <Stack.Screen name="topic/[slug]" options={{ title: t("navigation.topic") }} />
      <Stack.Screen name="settings" options={{ title: t("navigation.settings") }} />
      <Stack.Screen name="reading-plan" options={{ headerShown: false }} />
      <Stack.Screen name="fasting" options={{ headerShown: false }} />
      <Stack.Screen name="devotional-hub" options={{ headerShown: false }} />
      <Stack.Screen name="practice/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="practice/[id]/session" options={{ headerShown: false }} />
      <Stack.Screen name="stations" options={{ headerShown: false }} />
      <Stack.Screen name="rosary" options={{ headerShown: false }} />
      <Stack.Screen name="stats" options={{ headerShown: false }} />
      <Stack.Screen
        name="study"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="guided-prayer"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
      <Stack.Screen name="affirmations" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);
  const [storesReady, setStoresReady] = useState(false);
  const locale = useLocaleStore((s) => s.locale);
  const hasCompletedAudioOnboarding = useAudioOnboardingStore((s) => s.hasCompleted);
  const completeAudioOnboarding = useAudioOnboardingStore((s) => s.complete);
  const seedingActive = useSeedProgressStore((s) => s.active);
  const [dbBootstrapped, setDbBootstrapped] = useState(false);

  useEffect(() => {
    let mounted = true;

    const bootstrapI18n = async () => {
      await useLocaleStore.persist.rehydrate();
      await useAudioOnboardingStore.persist.rehydrate();
      const initialLocale = useLocaleStore.getState().resolveInitialLocale();
      await initI18n(initialLocale);
      if (mounted) {
        setI18nReady(true);
        setStoresReady(true);
      }
    };

    void bootstrapI18n();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!i18nReady) {
      return;
    }

    installGlobalErrorHandler();
    initializeErrorLogger();
    initSyncEngine();

    void ensureAnonymousSession()
      .then(() => {
        scheduleSync();
        void flushPendingComments();
      })
      .catch((err: unknown) => {
        logError(err, "AnonymousAuthInit");
      });

    void getDatabase()
      .then(() => {
        setDbBootstrapped(true);
        void useBookmarksStore.getState().loadBookmarks();
        void useHighlightsStore.getState().loadHighlights();
        void useHistoryStore.getState().loadHistory();
        void useReminderStore.getState().load().then(async () => {
          const { enabled, hour, minute } = useReminderStore.getState();
          if (!enabled) {
            return;
          }
          const granted = await requestNotificationPermission();
          if (!granted) {
            return;
          }
          await scheduleDailyReminder(
            hour,
            minute,
            i18n.t("common.appName"),
            i18n.t("settings.notificationsHint")
          );
        });
        void useYearPlanStore.getState().load();
      })
      .catch((err: unknown) => {
        setDbBootstrapped(true);
        resetDatabaseInit();
        logError(err, "DatabaseInit");
      });

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        initializeErrorLogger();
      }
    });

    return () => subscription.remove();
  }, [i18nReady]);

  if (!i18nReady || !storesReady || !dbBootstrapped) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.canvas,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!hasCompletedAudioOnboarding) {
    return (
      <GlobalErrorBoundary>
        <ChromeProvider>
          <StatusBar style="light" />
          <View style={{ flex: 1, backgroundColor: colors.canvas }} key={locale ?? "en"}>
            <AudioOnboarding onComplete={completeAudioOnboarding} />
          </View>
        </ChromeProvider>
      </GlobalErrorBoundary>
    );
  }

  if (seedingActive) {
    return (
      <GlobalErrorBoundary>
        <ChromeProvider>
          <StatusBar style="light" />
          <View style={{ flex: 1, backgroundColor: colors.canvas }} key={locale ?? "en"}>
            <ScriptureImportScreen />
          </View>
        </ChromeProvider>
      </GlobalErrorBoundary>
    );
  }

  return (
    <GlobalErrorBoundary>
      <ChromeProvider>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: colors.canvas }} key={locale ?? "en"}>
          <RootStack />
          <GlobalAudioBar />
        </View>
      </ChromeProvider>
    </GlobalErrorBoundary>
  );
}
