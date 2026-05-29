import React, { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassChrome } from "@/components/GlassChrome";
import { useAppTranslation } from "@/hooks/useAppTranslation";
import { audioEngine } from "@/services/audio/audioEngine";
import { useAudioStore } from "@/store/audioStore";
import { colors, spacing, typography } from "@/theme";
import type { GlobalAudioBarProps } from "@/types/ui";

export function GlobalAudioBar({ style }: GlobalAudioBarProps) {
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
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
  const reference = `${bookName ?? ""} ${chapter ?? ""}`.trim();

  return (
    <GlassChrome style={[styles.bar, style]} intensity={56}>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {t("audio.nowPlaying", { reference })}
        </Text>
        <View style={styles.controls}>
          <Pressable
            onPress={() => void audioEngine.skip("prev")}
            hitSlop={8}
            style={styles.controlButton}
            accessibilityRole="button"
            accessibilityLabel={t("audio.previousChapter")}
          >
            <Ionicons name="play-skip-back" size={18} color={colors.accent} />
          </Pressable>
          <Pressable
            onPress={() => void onPlayPause()}
            hitSlop={8}
            style={[styles.controlButton, styles.primaryControlButton]}
            accessibilityRole="button"
            accessibilityLabel={status === "playing" ? t("audio.pause") : t("audio.play")}
          >
            <Ionicons
              name={status === "playing" ? "pause" : "play"}
              size={18}
              color={colors.canvas}
            />
          </Pressable>
          <Pressable
            onPress={() => void audioEngine.skip("next")}
            hitSlop={8}
            style={styles.controlButton}
            accessibilityRole="button"
            accessibilityLabel={t("audio.nextChapter")}
          >
            <Ionicons name="play-skip-forward" size={18} color={colors.accent} />
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
      {insets.bottom > 0 ? <View style={{ height: insets.bottom }} /> : null}
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
  controlButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.backgroundElevated,
  },
  primaryControlButton: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  slider: {
    width: "100%",
    height: 28,
  },
});
