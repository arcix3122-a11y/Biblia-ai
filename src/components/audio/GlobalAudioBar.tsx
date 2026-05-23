import React, { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Slider from "@react-native-community/slider";
import { GlassChrome } from "@/components/GlassChrome";
import { audioEngine } from "@/services/audio/audioEngine";
import { useAudioStore } from "@/store/audioStore";
import { colors, spacing, typography } from "@/theme";
import type { GlobalAudioBarProps } from "@/types/ui";

export function GlobalAudioBar({ style }: GlobalAudioBarProps) {
  const status = useAudioStore((s) => s.status);
  const bookName = useAudioStore((s) => s.currentBookName);
  const chapter = useAudioStore((s) => s.currentChapter);
  const positionMs = useAudioStore((s) => s.positionMs);
  const durationMs = useAudioStore((s) => s.durationMs);
  const seek = useAudioStore((s) => s.seek);

  const onPlayPause = useCallback(async () => {
    if (status === "playing") {
      await audioEngine.pause();
    } else {
      await audioEngine.play();
    }
  }, [status]);

  if (status === "idle") {
    return null;
  }

  const progress = durationMs > 0 ? positionMs / durationMs : 0;

  return (
    <GlassChrome style={[styles.bar, style]} intensity={56}>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {bookName} {chapter}
        </Text>
        <View style={styles.controls}>
          <Pressable onPress={() => void audioEngine.skip("prev")} hitSlop={8}>
            <Text style={styles.control}>‹‹</Text>
          </Pressable>
          <Pressable onPress={() => void onPlayPause()} hitSlop={8}>
            <Text style={styles.control}>{status === "playing" ? "❚❚" : "▶"}</Text>
          </Pressable>
          <Pressable onPress={() => void audioEngine.skip("next")} hitSlop={8}>
            <Text style={styles.control}>››</Text>
          </Pressable>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={1}
          value={progress}
          onSlidingComplete={(v) => {
            const ms = v * durationMs;
            seek(ms);
            void audioEngine.seek(ms);
          }}
          minimumTrackTintColor={colors.accent}
          maximumTrackTintColor={colors.glassBorder}
          thumbTintColor={colors.accent}
        />
      </View>
    </GlassChrome>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.glassBorder,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    marginBottom: spacing.xs,
  },
  control: {
    ...typography.subtitle,
    color: colors.accent,
  },
  slider: {
    width: "100%",
    height: 28,
  },
});
