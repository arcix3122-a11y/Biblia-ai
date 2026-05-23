import { TextStyle } from "react-native";

/** Reading scale: font sizes 14–28 with proportional line-height and letter-spacing */
export const READING_FONT_SIZES = [14, 16, 18, 20, 22, 24, 26, 28] as const;
export type ReadingFontSize = (typeof READING_FONT_SIZES)[number];

export const readingMetrics: Record<
  ReadingFontSize,
  { lineHeight: number; letterSpacing: number }
> = {
  14: { lineHeight: 22, letterSpacing: 0.15 },
  16: { lineHeight: 26, letterSpacing: 0.12 },
  18: { lineHeight: 30, letterSpacing: 0.1 },
  20: { lineHeight: 34, letterSpacing: 0.08 },
  22: { lineHeight: 36, letterSpacing: 0.06 },
  24: { lineHeight: 40, letterSpacing: 0.04 },
  26: { lineHeight: 42, letterSpacing: 0.02 },
  28: { lineHeight: 44, letterSpacing: 0 },
};

export function snapReadingFontSize(size: number): ReadingFontSize {
  let closest: ReadingFontSize = READING_FONT_SIZES[0];
  let minDiff = Math.abs(size - closest);
  for (const candidate of READING_FONT_SIZES) {
    const diff = Math.abs(size - candidate);
    if (diff < minDiff) {
      minDiff = diff;
      closest = candidate;
    }
  }
  return closest;
}

export function getReadingTypography(fontSize: number): {
  fontSize: ReadingFontSize;
  lineHeight: number;
  letterSpacing: number;
} {
  const snapped = snapReadingFontSize(fontSize);
  const metrics = readingMetrics[snapped];
  return {
    fontSize: snapped,
    lineHeight: metrics.lineHeight,
    letterSpacing: metrics.letterSpacing,
  };
}

export const typography = {
  hero: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.4,
    lineHeight: 36,
  } satisfies TextStyle,
  title: {
    fontSize: 22,
    fontWeight: "600",
    letterSpacing: -0.2,
    lineHeight: 30,
  } satisfies TextStyle,
  subtitle: {
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 24,
  } satisfies TextStyle,
  body: {
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 26,
    letterSpacing: 0.1,
  } satisfies TextStyle,
  verse: {
    fontSize: 18,
    fontWeight: "400",
    lineHeight: 30,
    letterSpacing: 0.1,
  } satisfies TextStyle,
  caption: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  } satisfies TextStyle,
  label: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  } satisfies TextStyle,
} as const;
