import { useContext, useMemo } from "react";
import { Platform, type ViewStyle } from "react-native";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing } from "@/theme";

/** UIKit tab bar content height before home-indicator inset. */
const TAB_BAR_CONTENT_HEIGHT = Platform.select({ ios: 49, android: 56, default: 49 }) ?? 49;

/** Extra scroll clearance below the tab bar (16–24px range). */
export const TAB_BAR_SCROLL_EXTRA = spacing.lg;

export type TabBarInsetResult = {
  paddingBottom: number;
  contentContainerStyle: Pick<ViewStyle, "paddingBottom">;
  tabBarHeight: number;
  extra: number;
};

/**
 * Bottom padding for scroll content behind an absolute-positioned tab bar.
 * Uses measured tab bar height inside tabs; falls back to safe-area inset on stack screens.
 */
export function useTabBarInset(extra: number = TAB_BAR_SCROLL_EXTRA): TabBarInsetResult {
  const insets = useSafeAreaInsets();
  const measuredTabBarHeight = useContext(BottomTabBarHeightContext);

  return useMemo(() => {
    const tabBarHeight =
      typeof measuredTabBarHeight === "number" && measuredTabBarHeight > 0
        ? measuredTabBarHeight
        : TAB_BAR_CONTENT_HEIGHT + insets.bottom;

    const onTabScreen = measuredTabBarHeight !== undefined;
    const paddingBottom = onTabScreen ? tabBarHeight + extra : insets.bottom + extra;

    return {
      paddingBottom,
      contentContainerStyle: { paddingBottom },
      tabBarHeight: onTabScreen ? tabBarHeight : 0,
      extra,
    };
  }, [extra, insets.bottom, measuredTabBarHeight]);
}
