import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { scheduleSync, queueNoteDelete } from "@/services/sync/syncEngine";

export interface Note {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
}

interface NotesState {
  notes: Note[];
  isLoading: boolean;
  loadNotes: () => Promise<void>;
  saveNote: (id: string | null, title: string, body: string) => Promise<string>;
  deleteNote: (id: string) => Promise<void>;
}

const STORAGE_KEY = "@biblia-ai/notes";

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  isLoading: false,

  loadNotes: async () => {
    set({ isLoading: true });
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      const notes = data ? (JSON.parse(data) as Note[]) : [];
      // Sort notes by updatedAt descending
      notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      set({ notes, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  saveNote: async (id, title, body) => {
    const { notes } = get();
    const now = new Date().toISOString();
    let updatedNotes: Note[];
    let targetId = id;

    if (id) {
      updatedNotes = notes.map((n) =>
        n.id === id ? { ...n, title, body, updatedAt: now } : n
      );
    } else {
      targetId = `note-${Date.now()}`;
      const newNote: Note = {
        id: targetId,
        title,
        body,
        updatedAt: now,
      };
      updatedNotes = [newNote, ...notes];
    }

    // Sort by updated time
    updatedNotes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotes));
    set({ notes: updatedNotes });
    scheduleSync();
    return targetId!;
  },

  deleteNote: async (id) => {
    const { notes } = get();
    const updatedNotes = notes.filter((n) => n.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotes));
    set({ notes: updatedNotes });
    await queueNoteDelete(id);
    scheduleSync();
  },
}));
