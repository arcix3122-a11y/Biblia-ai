import React, { useEffect } from "react";
import { AppState, LogBox, Platform, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GlobalAudioBar } from "@/components/audio/GlobalAudioBar";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { ChromeProvider } from "@/context/ChromeContext";
import { initializeErrorLogger, logError } from "@/services/errors/errorLogger";
import { getDatabase } from "@/services/db/database";
import { useBookmarksStore } from "@/store/bookmarksStore";
import { useHistoryStore } from "@/store/historyStore";
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

export default function RootLayout() {
  useEffect(() => {
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
  }, []);

  return (
    <GlobalErrorBoundary>
      <ChromeProvider>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: colors.canvas }}>
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
              options={{ title: "Chapters", presentation: "card" }}
            />
            <Stack.Screen
              name="reader/[bookSlug]/[chapter]"
              options={{ title: "Reader", headerShown: false }}
            />
            <Stack.Screen name="topic/[slug]" options={{ title: "Topic" }} />
            <Stack.Screen name="settings" options={{ title: "Settings" }} />
          </Stack>
          <GlobalAudioBar />
        </View>
      </ChromeProvider>
    </GlobalErrorBoundary>
  );
}
