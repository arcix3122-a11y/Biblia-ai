import { useCallback, useEffect, useRef, useState } from "react";
import * as Speech from "expo-speech";
import { Audio } from "expo-av";
import type { ScriptureTranslation, Verse } from "@/types/scripture";

interface UseChapterTTSResult {
  isPlaying: boolean;
  currentVerseNumber: number | null;
  play: () => void;
  pause: () => void;
  toggle: () => void;
}

interface SpeechVoice {
  identifier: string;
  name: string;
  language: string;
  quality: string;
}

function ttsLanguageFor(translation: ScriptureTranslation): string {
  return translation === "pl" ? "pl-PL" : "en-US";
}

let bestVoiceCache: Record<string, SpeechVoice | null> = {};

async function getBestVoiceForLanguage(lang: string): Promise<string | undefined> {
  if (bestVoiceCache[lang] !== undefined) {
    return bestVoiceCache[lang]?.identifier;
  }

  try {
    const speechApi = Speech as any;
    if (typeof speechApi.getAvailableVoicesAsync !== "function") {
      bestVoiceCache[lang] = null;
      return undefined;
    }
    const voices: SpeechVoice[] = await speechApi.getAvailableVoicesAsync();
    const targetPrefix = lang.toLowerCase().split("-")[0];
    const matchingVoices = voices.filter((v: SpeechVoice) =>
      v.language.toLowerCase().startsWith(targetPrefix)
    );

    if (matchingVoices.length === 0) {
      bestVoiceCache[lang] = null;
      return undefined;
    }

    const sorted = matchingVoices.sort((a: SpeechVoice, b: SpeechVoice) => {
      const aEnhanced =
        a.quality === "Enhanced" ||
        a.identifier.toLowerCase().includes("enhanced") ||
        a.name.toLowerCase().includes("premium");
      const bEnhanced =
        b.quality === "Enhanced" ||
        b.identifier.toLowerCase().includes("enhanced") ||
        b.name.toLowerCase().includes("premium");
      if (aEnhanced && !bEnhanced) return -1;
      if (!aEnhanced && bEnhanced) return 1;
      return 0;
    });

    const bestVoice = sorted[0];
    bestVoiceCache[lang] = bestVoice;
    return bestVoice.identifier;
  } catch (err) {
    console.warn("Failed to retrieve available voices:", err);
    bestVoiceCache[lang] = null;
    return undefined;
  }
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
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | undefined>(undefined);
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

  // Query best voice dynamically based on active translation language
  useEffect(() => {
    let active = true;
    async function loadVoice() {
      const best = await getBestVoiceForLanguage(ttsLanguageFor(translation));
      if (active) {
        setSelectedVoiceId(best);
      }
    }
    void loadVoice();
    return () => {
      active = false;
    };
  }, [translation]);

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
        voice: selectedVoiceId,
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
    [translation, verses, selectedVoiceId]
  );

  const play = useCallback(async () => {
    if (verses.length === 0 || playingRef.current) return;
    
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (err) {
      console.warn("Failed to set audio mode for background playback:", err);
    }

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
      void play();
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
