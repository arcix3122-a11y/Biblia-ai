import React, { useState } from "react";
import {
  ImageBackground,
  StyleSheet,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { colors, radii } from "@/theme";

interface PhotoBackgroundProps {
  uri: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  borderRadius?: number;
  /** 0–1 scrim opacity over the photo for text legibility. Default 0.52 */
  scrimOpacity?: number;
  /** When true, uses RN ImageBackground (useful for view-shot capture). */
  useLegacyImage?: boolean;
}

export function PhotoBackground({
  uri,
  children,
  style,
  imageStyle,
  borderRadius = radii.xl,
  scrimOpacity = 0.52,
  useLegacyImage = false,
}: PhotoBackgroundProps) {
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return (
      <View style={[styles.fallback, { borderRadius }, style]}>
        <View style={styles.glowTopRight} />
        <View style={styles.glowBottomLeft} />
        <View
          style={[
            styles.scrim,
            { backgroundColor: `rgba(0,0,0,${Math.min(0.72, scrimOpacity + 0.12)})` },
          ]}
        />
        {children}
      </View>
    );
  }

  const scrim = (
    <View
      style={[styles.scrim, { backgroundColor: `rgba(0,0,0,${scrimOpacity})` }]}
      pointerEvents="none"
    />
  );

  if (useLegacyImage) {
    return (
      <ImageBackground
        source={{ uri }}
        style={[styles.container, { borderRadius }, style]}
        imageStyle={[{ borderRadius }, imageStyle]}
        resizeMode="cover"
        onError={() => setFailed(true)}
      >
        {scrim}
        {children}
      </ImageBackground>
    );
  }

  return (
    <View style={[styles.container, { borderRadius }, style]}>
      <Image
        source={{ uri }}
        style={[StyleSheet.absoluteFill, { borderRadius }, imageStyle]}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={200}
        onError={() => setFailed(true)}
      />
      {scrim}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    backgroundColor: "#0E1B33",
  },
  fallback: {
    overflow: "hidden",
    backgroundColor: colors.backgroundElevated,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  glowTopRight: {
    position: "absolute",
    top: -48,
    right: -32,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(229,169,60,0.14)",
  },
  glowBottomLeft: {
    position: "absolute",
    bottom: -64,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(80,120,200,0.12)",
  },
});
