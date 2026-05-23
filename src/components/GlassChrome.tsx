import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { colors, glass } from "@/theme";
import type { GlassChromeProps } from "@/types/ui";

export function GlassChrome({
  children,
  style,
  intensity = glass.blurIntensity,
  sticky = false,
}: GlassChromeProps) {
  const containerStyle = [styles.shell, sticky && styles.sticky, style];

  if (Platform.OS === "web") {
    return (
      <View style={[containerStyle, styles.webFallback]}>
        {children}
      </View>
    );
  }

  return (
    <BlurView
      intensity={intensity}
      tint={glass.blurTint}
      style={containerStyle}
      experimentalBlurMethod="dimezisBlurView"
    >
      <View style={styles.innerBorder}>{children}</View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: "hidden",
    borderTopWidth: glass.borderWidth,
    borderTopColor: glass.borderColor,
    backgroundColor: glass.fallbackBackground,
  },
  sticky: {
    zIndex: 10,
  },
  webFallback: {
    backgroundColor: glass.overlay,
  },
  innerBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: glass.borderColor,
  },
});
