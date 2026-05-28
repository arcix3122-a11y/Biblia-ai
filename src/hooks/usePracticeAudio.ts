import { useCallback, useRef } from "react";
import * as Speech from "expo-speech";

import type { AppLocale } from "@/i18n";

const SPEAK_LOCALE: Record<AppLocale, string> = {
  en: "en-US",
  pl: "pl-PL",
};

export function usePracticeAudio(locale: AppLocale) {
  const speakingRef = useRef(false);

  const stop = useCallback(() => {
    Speech.stop();
    speakingRef.current = false;
  }, []);

  const speak = useCallback(
    (text: string) => {
      stop();
      speakingRef.current = true;
      Speech.speak(text, {
        language: SPEAK_LOCALE[locale],
        rate: 0.9,
        pitch: 1,
        onDone: () => {
          speakingRef.current = false;
        },
        onStopped: () => {
          speakingRef.current = false;
        },
        onError: () => {
          speakingRef.current = false;
        },
      });
    },
    [locale, stop]
  );

  return { speak, stop, isSpeaking: () => speakingRef.current };
}
