import React from "react";
import { Platform, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useChrome } from "@/context/ChromeContext";
import { useLocaleStore } from "@/store/localeStore";
import { colors, glass } from "@/theme";

function TabBarBackground() {
  if (Platform.OS === "web") {
    return null;
  }
  return (
    <BlurView
      intensity={glass.blurIntensity}
      tint={glass.blurTint}
      style={StyleSheet.absoluteFill}
    />
  );
}

export default function TabsLayout() {
  const { tabBarHidden } = useChrome();
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);

  return (
    <Tabs
      key={locale}
      screenOptions={{
        headerStyle: { backgroundColor: colors.backgroundElevated },
        headerTintColor: colors.accent,
        headerTitleStyle: { color: colors.textPrimary },
        sceneStyle: { backgroundColor: colors.canvas },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.OS === "ios" ? "transparent" : colors.backgroundElevated,
          borderTopColor: colors.glassBorder,
          display: tabBarHidden ? "none" : "flex",
        },
        tabBarBackground: () => <TabBarBackground />,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.scripture"),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: t("tabs.library"),
          headerTitle: t("tabs.headerLibrary"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: t("tabs.companion"),
          headerTitle: t("tabs.headerCompanion"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="workspace"
        options={{
          title: t("tabs.workspace"),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="journal-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
