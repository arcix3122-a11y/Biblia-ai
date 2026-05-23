import { create } from "zustand";

export type AudioStatus = "idle" | "loading" | "playing" | "paused" | "error";

export interface AudioTrack {
  bookId: number;
  bookName: string;
  bookSlug: string;
  chapter: number;
}

interface AudioState {
  status: AudioStatus;
  currentBookId: number | null;
  currentChapter: number | null;
  currentBookName: string | null;
  currentBookSlug: string | null;
  positionMs: number;
  durationMs: number;
  playbackRate: number;
  errorMessage: string | null;
  setTrack: (track: AudioTrack) => void;
  play: () => void;
  pause: () => void;
  seek: (ms: number) => void;
  skipChapter: (direction: "prev" | "next") => void;
  setStatus: (status: AudioStatus) => void;
  setPosition: (ms: number) => void;
  setDuration: (ms: number) => void;
  setPlaybackRate: (rate: number) => void;
  setError: (message: string | null) => void;
  reset: () => void;
}

const initialState = {
  status: "idle" as AudioStatus,
  currentBookId: null,
  currentChapter: null,
  currentBookName: null,
  currentBookSlug: null,
  positionMs: 0,
  durationMs: 0,
  playbackRate: 1,
  errorMessage: null,
};

export const useAudioStore = create<AudioState>((set, get) => ({
  ...initialState,

  setTrack: (track) =>
    set({
      currentBookId: track.bookId,
      currentChapter: track.chapter,
      currentBookName: track.bookName,
      currentBookSlug: track.bookSlug,
      status: "paused",
      positionMs: 0,
      durationMs: 180_000,
      errorMessage: null,
    }),

  play: () => {
    const { currentBookId } = get();
    if (!currentBookId) {
      return;
    }
    set({ status: "playing", errorMessage: null });
  },

  pause: () => {
    if (get().status === "playing") {
      set({ status: "paused" });
    }
  },

  seek: (ms) => {
    const duration = get().durationMs;
    const clamped = Math.max(0, Math.min(ms, duration || ms));
    set({ positionMs: clamped });
  },

  skipChapter: (direction) => {
    const chapter = get().currentChapter;
    if (chapter == null) {
      return;
    }
    const next = direction === "next" ? chapter + 1 : Math.max(1, chapter - 1);
    set({ currentChapter: next, positionMs: 0, status: "loading" });
  },

  setStatus: (status) => set({ status }),
  setPosition: (ms) => set({ positionMs: ms }),
  setDuration: (ms) => set({ durationMs: ms }),
  setPlaybackRate: (rate) => set({ playbackRate: rate }),
  setError: (message) => set({ errorMessage: message, status: message ? "error" : get().status }),
  reset: () => set(initialState),
}));
