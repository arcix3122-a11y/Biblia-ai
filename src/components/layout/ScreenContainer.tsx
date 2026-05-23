import React from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "@/theme";

interface ScreenContainerProps extends ViewProps {
  children: React.ReactNode;
  withTopInset?: boolean;
  withBottomInset?: boolean;
}

export function ScreenContainer({
  children,
  withTopInset = false,
  withBottomInset = false,
  style,
  ...rest
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        withTopInset ? { paddingTop: insets.top } : null,
        withBottomInset ? { paddingBottom: insets.bottom + spacing.sm } : null,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
});
