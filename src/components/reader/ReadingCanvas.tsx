import React from "react";
import { StyleSheet, View } from "react-native";
import { colors, spacing } from "@/theme";
import type { ReadingCanvasProps } from "@/types/ui";

const MAX_READABLE_WIDTH = 680;

export function ReadingCanvas({ children, fontSize: _fontSize, style }: ReadingCanvasProps) {
  return (
    <View style={[styles.outer, style]}>
      <View style={styles.column}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: "center",
  },
  column: {
    width: "100%",
    maxWidth: MAX_READABLE_WIDTH,
    paddingHorizontal: spacing.lg,
    flex: 1,
  },
});
