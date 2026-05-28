import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

export interface GlassChromeProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  sticky?: boolean;
}

export interface ReadingCanvasProps {
  children: ReactNode;
  fontSize: number;
  style?: StyleProp<ViewStyle>;
}

export interface ImmersiveModeToggleProps {
  immersive: boolean;
  onToggle: () => void;
  chromeOpacity: import("react-native").Animated.Value;
}

export interface FontControlsProps {
  fontSize: number;
  onIncrease: () => void;
  onDecrease: () => void;
  previewText?: string;
}

export interface ContextPillsProps {
  onSelectTemplate: (templateId: ContextPillTemplateId) => void;
  disabled?: boolean;
}

export type ContextPillTemplateId =
  | "historical"
  | "application"
  | "prayer"
  | "hope"
  | "original-language";

export interface MomentumDashboardProps {
  style?: StyleProp<ViewStyle>;
}

export interface TopicGridProps {
  onTopicPress: (slug: string) => void;
}

export interface GlobalAudioBarProps {
  style?: StyleProp<ViewStyle>;
}

export interface ShareVerseCardProps {
  reference: string;
  text: string;
  width?: number;
  height?: number;
}
