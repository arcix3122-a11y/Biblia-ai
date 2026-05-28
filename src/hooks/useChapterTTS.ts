import { useCallback, useEffect, useRef, useState } from "react";
import * as Speech from "expo-speech";
import type { ScriptureTranslation, Verse } from "@/types/scripture";

interface UseChapterTTSResult {
  isPlaying: boolean;
  currentVerseNumber: number | null;
  play: () => void;
  pause: () => void;
  toggle: () => void;
}

function ttsLanguageFor(translation: ScriptureTranslation): string {
  return translation === "pl" ? "pl-PL" : "en-US";
}

/**
 * Sequential TTS playback of chapter verses via expo-speech.
 * Speaks verses one after another; pause cancels the current utterance
 * and remembers the next-to-play index so resume picks up there.
 */
export function useChapterTTS(
  verses: readonly Verse[],
  translation: ScriptureTranslation,
  chapterKey: string
): UseChapterTTSResult {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVerseNumber, setCurrentVerseNumber] = useState<number | null>(null);
  const indexRef = useRef(0);
  const playingRef = useRef(false);

  const stopAll = useCallback(() => {
    playingRef.current = false;
    Speech.stop();
    setIsPlaying(false);
    setCurrentVerseNumber(null);
  }, []);

  // Reset when chapter or translation changes
  useEffect(() => {
    indexRef.current = 0;
    stopAll();
  }, [chapterKey, translation, stopAll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      playingRef.current = false;
      Speech.stop();
    };
  }, []);

  const speakFromIndex = useCallback(
    (startIndex: number) => {
      if (!playingRef.current) return;
      if (startIndex >= verses.length) {
        playingRef.current = false;
        setIsPlaying(false);
        setCurrentVerseNumber(null);
        indexRef.current = 0;
        return;
      }
      const verse = verses[startIndex];
      indexRef.current = startIndex;
      setCurrentVerseNumber(verse.number);
      Speech.speak(verse.text, {
        language: ttsLanguageFor(translation),
        rate: 0.95,
        pitch: 1.0,
        onDone: () => {
          if (!playingRef.current) return;
          speakFromIndex(startIndex + 1);
        },
        onStopped: () => {
          // pause path — do not advance
        },
        onError: () => {
          playingRef.current = false;
          setIsPlaying(false);
        },
      });
    },
    [translation, verses]
  );

  const play = useCallback(() => {
    if (verses.length === 0 || playingRef.current) return;
    playingRef.current = true;
    setIsPlaying(true);
    speakFromIndex(indexRef.current);
  }, [speakFromIndex, verses.length]);

  const pause = useCallback(() => {
    playingRef.current = false;
    Speech.stop();
    setIsPlaying(false);
    // keep currentVerseNumber + indexRef so resume is sensible
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  return {
    isPlaying,
    currentVerseNumber,
    play,
    pause,
    toggle,
  };
}
