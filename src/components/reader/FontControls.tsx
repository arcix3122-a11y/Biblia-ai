import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, getReadingTypography, radii, spacing, typography } from "@/theme";
import type { FontControlsProps } from "@/types/ui";

export function FontControls({
  fontSize,
  onIncrease,
  onDecrease,
  previewText,
}: FontControlsProps) {
  const { t } = useTranslation();
  const previewAnim = useRef(new Animated.Value(1)).current;
  const resolvedPreview = previewText ?? t("reader.fontPreview");

  useEffect(() => {
    previewAnim.setValue(0.92);
    Animated.spring(previewAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
      tension: 120,
    }).start();
  }, [fontSize, previewAnim]);

  const reading = getReadingTypography(fontSize);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onDecrease}
        style={styles.button}
        accessibilityLabel={t("reader.decreaseFont")}
      >
        <Text style={styles.buttonText}>A−</Text>
      </Pressable>
      <Animated.Text
        style={[
          styles.preview,
          {
            fontSize: reading.fontSize,
            lineHeight: reading.lineHeight,
            letterSpacing: reading.letterSpacing,
            transform: [{ scale: previewAnim }],
          },
        ]}
        numberOfLines={1}
      >
        {resolvedPreview}
      </Animated.Text>
      <Pressable
        onPress={onIncrease}
        style={styles.button}
        accessibilityLabel={t("reader.increaseFont")}
      >
        <Text style={styles.buttonText}>A+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.tile,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    maxWidth: 220,
  },
  button: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  buttonText: {
    ...typography.subtitle,
    color: colors.accent,
  },
  preview: {
    flex: 1,
    textAlign: "center",
    color: colors.textPrimary,
    marginHorizontal: spacing.xs,
  },
});
