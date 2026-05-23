import React from "react";
import { Text, type TextProps, type TextStyle } from "react-native";
import { colors } from "@/theme";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function HighlightedText({
  text,
  query,
  style,
  highlightStyle,
  numberOfLines,
}: {
  text: string;
  query: string;
  style?: TextStyle;
  highlightStyle?: TextStyle;
  numberOfLines?: number;
} & Pick<TextProps, "numberOfLines">) {
  const trimmed = query.trim();
  if (!trimmed) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  const pattern = new RegExp(`(${escapeRegExp(trimmed)})`, "gi");
  const parts = text.split(pattern);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, index) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <Text
            key={`${index}-${part}`}
            style={[style, highlightStyle ?? styles.highlight]}
          >
            {part}
          </Text>
        ) : (
          <Text key={`${index}-${part}`}>{part}</Text>
        )
      )}
    </Text>
  );
}

const styles = {
  highlight: {
    color: colors.accent,
    fontWeight: "700" as const,
    backgroundColor: colors.accentGlow,
  },
};
