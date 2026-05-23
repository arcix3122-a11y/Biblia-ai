import { useCallback, useEffect, useRef, useState } from "react";
import { Audio } from "expo-av";
import * as Speech from "expo-speech";

export interface OnboardingSlideAudioState {
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  progress: number;
}

export interface UseOnboardingSlideAudioResult extends OnboardingSlideAudioState {
  play: () => Promise<void>;
  pause: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  skipBy: (deltaMs: number) => Promise<void>;
  reset: () => Promise<void>;
}

export function useOnboardingSlideAudio(
  sampleText: string,
  durationMs: number,
  locale: string
): UseOnboardingSlideAudioResult {
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const speakingRef = useRef(false);
  const positionRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopPlayback = useCallback(async () => {
    speakingRef.current = false;
    setIsPlaying(false);
    clearTimer();
    Speech.stop();
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {
        // ignore unload errors
      }
      soundRef.current = null;
    }
  }, [clearTimer]);

  const reset = useCallback(async () => {
    await stopPlayback();
    positionRef.current = 0;
    setPositionMs(0);
  }, [stopPlayback]);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(() => {
      if (!speakingRef.current) {
        return;
      }
      const next = Math.min(durationMs, positionRef.current + 250);
      positionRef.current = next;
      setPositionMs(next);
      if (next >= durationMs) {
        speakingRef.current = false;
        setIsPlaying(false);
        clearTimer();
      }
    }, 250);
  }, [clearTimer, durationMs]);

  const speakFromPosition = useCallback(
    async (startMs: number) => {
      await stopPlayback();
      positionRef.current = startMs;
      setPositionMs(startMs);

      if (startMs >= durationMs) {
        return;
      }

      speakingRef.current = true;
      setIsPlaying(true);
      startTimer();

      const fraction = startMs / Math.max(1, durationMs);
      const words = sampleText.split(/\s+/);
      const startWord = Math.floor(fraction * words.length);
      const remainder = words.slice(startWord).join(" ").trim();
      if (!remainder) {
        speakingRef.current = false;
        setIsPlaying(false);
        clearTimer();
        positionRef.current = durationMs;
        setPositionMs(durationMs);
        return;
      }

      Speech.speak(remainder, {
        language: locale.startsWith("pl") ? "pl-PL" : "en-US",
        rate: 0.92,
        onDone: () => {
          speakingRef.current = false;
          setIsPlaying(false);
          clearTimer();
          positionRef.current = durationMs;
          setPositionMs(durationMs);
        },
        onStopped: () => {
          speakingRef.current = false;
          setIsPlaying(false);
          clearTimer();
        },
        onError: () => {
          speakingRef.current = false;
          setIsPlaying(false);
          clearTimer();
        },
      });
    },
    [clearTimer, durationMs, locale, sampleText, startTimer, stopPlayback]
  );

  const play = useCallback(async () => {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    await speakFromPosition(positionRef.current);
  }, [speakFromPosition]);

  const pause = useCallback(async () => {
    await stopPlayback();
  }, [stopPlayback]);

  const togglePlayPause = useCallback(async () => {
    if (isPlaying) {
      await pause();
      return;
    }
    await play();
  }, [isPlaying, pause, play]);

  const seek = useCallback(
    async (nextMs: number) => {
      const clamped = Math.max(0, Math.min(durationMs, nextMs));
      if (speakingRef.current) {
        await speakFromPosition(clamped);
        return;
      }
      positionRef.current = clamped;
      setPositionMs(clamped);
    },
    [durationMs, speakFromPosition]
  );

  const skipBy = useCallback(
    async (deltaMs: number) => {
      await seek(positionRef.current + deltaMs);
    },
    [seek]
  );

  useEffect(() => {
    void Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    return () => {
      void stopPlayback();
    };
  }, [stopPlayback]);

  useEffect(() => {
    void reset();
  }, [sampleText, durationMs, reset]);

  const progress = durationMs > 0 ? positionMs / durationMs : 0;

  return {
    isPlaying,
    positionMs,
    durationMs,
    progress,
    play,
    pause,
    togglePlayPause,
    seek,
    skipBy,
    reset,
  };
}
