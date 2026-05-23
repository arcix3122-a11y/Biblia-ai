import React, { useEffect, useState } from "react";
import { ActivityIndicator, AppState, LogBox, Platform, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useTranslation } from "react-i18next";
import { GlobalAudioBar } from "@/components/audio/GlobalAudioBar";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { ChromeProvider } from "@/context/ChromeContext";
import { initI18n } from "@/i18n";
import { initializeErrorLogger, logError } from "@/services/errors/errorLogger";
import { getDatabase } from "@/services/db/database";
import { useBookmarksStore } from "@/store/bookmarksStore";
import { useHistoryStore } from "@/store/historyStore";
import { useLocaleStore } from "@/store/localeStore";
import { colors } from "@/theme";

LogBox.ignoreLogs(["Non-serializable values were found in the navigation state"]);

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
    </Stack>
  );
}

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);
  const locale = useLocaleStore((s) => s.locale);

  useEffect(() => {
    let mounted = true;

    const bootstrapI18n = async () => {
      await useLocaleStore.persist.rehydrate();
      const initialLocale = useLocaleStore.getState().resolveInitialLocale();
      await initI18n(initialLocale);
      if (mounted) {
        setI18nReady(true);
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

    void getDatabase()
      .then(() => {
        void useBookmarksStore.getState().loadBookmarks();
        void useHistoryStore.getState().loadHistory();
      })
      .catch((err: unknown) => {
        logError(err, "DatabaseInit");
      });

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        initializeErrorLogger();
      }
    });

    return () => subscription.remove();
  }, [i18nReady]);

  if (!i18nReady) {
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
