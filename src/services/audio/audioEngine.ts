import * as Speech from "expo-speech";
import i18n from "@/i18n";
import type { AudioTrack } from "@/store/audioStore";
import { useAudioStore } from "@/store/audioStore";
import * as scriptureRepo from "@/services/db/scriptureRepository";
import { useLocaleStore } from "@/store/localeStore";
import { resolveScriptureTranslation, useTranslationStore } from "@/store/translationStore";

export interface AudioEngine {
  load(track: AudioTrack): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  skip(direction: "prev" | "next"): Promise<void>;
  dispose(): Promise<void>;
}

class SpeechAudioEngine implements AudioEngine {
  private verseTexts: string[] = [];
  private currentVerseIndex = 0;
  private speaking = false;

  async load(track: AudioTrack): Promise<void> {
    const store = useAudioStore.getState();
    // Stop any ongoing speech
    await Speech.stop();
    this.speaking = false;
    this.currentVerseIndex = 0;
    this.verseTexts = [];

    store.setTrack(track);
    store.setStatus("loading");

    try {
      const locale = useLocaleStore.getState().locale;
      const preference = useTranslationStore.getState().preference;
      const translation = resolveScriptureTranslation(preference, locale);
      const verses = await scriptureRepo.getVersesByBookAndChapter(
        track.bookId,
        track.chapter,
        translation
      );
      this.verseTexts = verses.map((v) =>
        i18n.t("audio.verseSpoken", { number: v.number, text: v.text })
      );
      // Estimate duration: ~150 words per minute, avg 20 words per verse
      const estimatedMs = verses.length * 8_000;
      store.setDuration(estimatedMs > 0 ? estimatedMs : 180_000);
    } catch {
      this.verseTexts = [
        i18n.t("audio.chapterSpoken", { book: track.bookName, chapter: track.chapter }),
      ];
      store.setDuration(30_000);
    }
    store.setStatus("paused");
  }

  async play(): Promise<void> {
    if (this.verseTexts.length === 0) return;
    const store = useAudioStore.getState();
    this.speaking = true;
    store.play();

    const speakNext = (index: number): void => {
      if (!this.speaking || index >= this.verseTexts.length) {
        this.speaking = false;
        store.pause();
        store.setPosition(store.durationMs);
        return;
      }
      this.currentVerseIndex = index;
      // Update position proportionally
      store.setPosition(Math.round((index / this.verseTexts.length) * store.durationMs));

      Speech.speak(this.verseTexts[index] ?? "", {
        language: resolveScriptureTranslation(
          useTranslationStore.getState().preference,
          useLocaleStore.getState().locale
        ) === "pl"
          ? "pl-PL"
          : "en-US",
        rate: 0.9,
        onDone: () => speakNext(index + 1),
        onStopped: () => {
          this.speaking = false;
        },
        onError: () => speakNext(index + 1),
      });
    };

    speakNext(this.currentVerseIndex);
  }

  async pause(): Promise<void> {
    this.speaking = false;
    await Speech.stop();
    useAudioStore.getState().pause();
  }

  async seek(_positionMs: number): Promise<void> {
    // expo-speech doesn't support seeking; stop and restart from closest verse
    const store = useAudioStore.getState();
    const fraction = _positionMs / Math.max(1, store.durationMs);
    this.currentVerseIndex = Math.floor(fraction * this.verseTexts.length);
    store.setPosition(_positionMs);
    if (this.speaking) {
      await this.pause();
      await this.play();
    }
  }

  async skip(direction: "prev" | "next"): Promise<void> {
    const store = useAudioStore.getState();
    const { currentBookId, currentChapter, currentBookName, currentBookSlug } = store;
    if (!currentBookId || !currentChapter) return;

    await Speech.stop();
    this.speaking = false;
    store.setStatus("loading");

    const adjacent = await scriptureRepo.getAdjacentChapter(currentBookId, currentChapter, direction);
    if (adjacent) {
      await this.load({
        bookId: currentBookId,
        bookName: currentBookName ?? "",
        bookSlug: currentBookSlug ?? "",
        chapter: adjacent.number,
      });
      await this.play();
    } else {
      store.setStatus("paused");
    }
  }

  async dispose(): Promise<void> {
    this.speaking = false;
    await Speech.stop();
    useAudioStore.getState().reset();
  }
}

export const audioEngine: AudioEngine = new SpeechAudioEngine();
