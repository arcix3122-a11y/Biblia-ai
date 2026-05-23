import type { HighlightColor } from "@/types/scripture";
import { colors } from "@/theme";

export const HIGHLIGHT_SWATCHES: readonly HighlightColor[] = [
  "gold",
  "blue",
  "green",
  "rose",
] as const;

export function getHighlightBackground(color: HighlightColor): string {
  switch (color) {
    case "gold":
      return colors.accentGlow;
    case "blue":
      return "rgba(59, 130, 246, 0.18)";
    case "green":
      return "rgba(52, 211, 153, 0.18)";
    case "rose":
      return "rgba(244, 63, 94, 0.18)";
    default:
      return colors.accentGlow;
  }
}

export function getHighlightSwatchColor(color: HighlightColor): string {
  switch (color) {
    case "gold":
      return colors.accent;
    case "blue":
      return "#3B82F6";
    case "green":
      return colors.success;
    case "rose":
      return "#F43F5E";
    default:
      return colors.accent;
  }
}
