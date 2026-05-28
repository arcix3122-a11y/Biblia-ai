import React from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarInset } from "@/hooks/useTabBarInset";
import { colors, spacing } from "@/theme";

interface ScreenContainerProps extends ViewProps {
  children: React.ReactNode;
  withTopInset?: boolean;
  withBottomInset?: boolean;
  /** Reserve space for the bottom tab bar on tab screens (scroll clearance). */
  withTabBarInset?: boolean;
}

export function ScreenContainer({
  children,
  withTopInset = false,
  withBottomInset = false,
  withTabBarInset = false,
  style,
  ...rest
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const { paddingBottom: tabBarPaddingBottom } = useTabBarInset();

  return (
    <View
      style={[
        styles.container,
        withTopInset ? { paddingTop: insets.top } : null,
        withBottomInset ? { paddingBottom: insets.bottom + spacing.sm } : null,
        withTabBarInset ? { paddingBottom: tabBarPaddingBottom } : null,
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
