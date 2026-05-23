import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { FOUNDATION_WEEK_PLAN } from "@/data/readingPlans";
import * as highlightsRepo from "@/services/db/highlightsRepository";
import { logError } from "@/services/errors/errorLogger";
import {
  getSessionUserIdAsync,
  getSupabaseClient,
} from "@/services/supabase/supabaseClient";
import {
  getUserStats,
} from "@/services/stats/userStats";
import type { Note } from "@/store/notesStore";
import type { HighlightColor } from "@/types/scripture";

const DEBOUNCE_MS = 2500;
const LAST_SYNC_KEY = "@biblia-ai/last-sync-at";
const NOTES_KEY = "@biblia-ai/notes";
const READING_PLAN_KEY = "@biblia-ai/reading-plan";
const YEAR_PLAN_KEY = "@biblia-ai/year-plan";
const STATS_KEY = "@biblia-ai/user-stats";
const PENDING_HIGHLIGHT_DELETES_KEY = "@biblia-ai/sync-pending-highlight-deletes";
const PENDING_NOTE_DELETES_KEY = "@biblia-ai/sync-pending-note-deletes";
const YEAR_PLAN_SLUG = "bible-in-a-year";

interface HighlightDeleteKey {
  book_slug: string;
  chapter: number;
  verse: number;
}

interface CloudHighlight {
  id: string;
  user_id: string;
  book_slug: string;
  chapter: number;
  verse: number;
  color: HighlightColor;
  created_at: string;
  updated_at: string;
}

interface CloudNote {
  id: string;
  user_id: string;
  title: string;
  content: string;
  reference_verses: string[];
  updated_at: string;
}

interface CloudPlanProgress {
  id: string;
  user_id: string;
  plan_slug: string;
  completed_days: number[];
  updated_at: string;
}

interface CloudProfile {
  id: string;
  streak_days: number;
  daily_goal_chapters: number;
  language: string;
  updated_at: string;
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncInFlight = false;

function highlightKey(bookSlug: string, chapter: number, verse: number): string {
  return `${bookSlug}:${chapter}:${verse}`;
}

function parseIsoMs(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? 0 : ms;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

async function readJsonArray<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeJsonArray<T>(key: string, value: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function queueHighlightDelete(
  bookSlug: string,
  chapter: number,
  verse: number
): Promise<void> {
  const pending = await readJsonArray<HighlightDeleteKey>(PENDING_HIGHLIGHT_DELETES_KEY);
  const key = highlightKey(bookSlug, chapter, verse);
  const next = pending.filter(
    (item) => highlightKey(item.book_slug, item.chapter, item.verse) !== key
  );
  next.push({ book_slug: bookSlug, chapter, verse });
  await writeJsonArray(PENDING_HIGHLIGHT_DELETES_KEY, next);
}

export async function queueNoteDelete(noteId: string): Promise<void> {
  const pending = await readJsonArray<string>(PENDING_NOTE_DELETES_KEY);
  if (!pending.includes(noteId)) {
    pending.push(noteId);
    await writeJsonArray(PENDING_NOTE_DELETES_KEY, pending);
  }
}

export async function getLastSyncAt(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_SYNC_KEY);
}

export function scheduleSync(): void {
  if (syncTimer) {
    clearTimeout(syncTimer);
  }
  syncTimer = setTimeout(() => {
    void runSync();
  }, DEBOUNCE_MS);
}

export async function runSync(): Promise<void> {
  if (syncInFlight) {
    return;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  if (!(await isOnline())) {
    return;
  }

  const userId = await getSessionUserIdAsync();
  if (!userId) {
    return;
  }

  syncInFlight = true;
  try {
    await syncHighlights(userId);
    await syncNotes(userId);
    await syncReadingPlans(userId);
    await syncUserProfile(userId);
    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  } catch (error) {
    logError(error, "SyncEngine");
  } finally {
    syncInFlight = false;
  }
}

async function syncHighlights(userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  const pendingDeletes = await readJsonArray<HighlightDeleteKey>(
    PENDING_HIGHLIGHT_DELETES_KEY
  );
  for (const item of pendingDeletes) {
    await supabase
      .from("verse_highlights")
      .delete()
      .eq("user_id", userId)
      .eq("book_slug", item.book_slug)
      .eq("chapter", item.chapter)
      .eq("verse", item.verse);
  }

  const local = await highlightsRepo.listHighlightsWithReferences();
  const nowIso = new Date().toISOString();

  if (local.length > 0) {
    const rows = local.map((item) => ({
      user_id: userId,
      book_slug: item.book_slug,
      chapter: item.chapter,
      verse: item.verse,
      color: item.color,
      updated_at: item.created_at ?? nowIso,
    }));

    await supabase.from("verse_highlights").upsert(rows, {
      onConflict: "user_id,book_slug,chapter,verse",
    });
  }

  const { data: remoteRows, error } = await supabase
    .from("verse_highlights")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  const remote = (remoteRows ?? []) as CloudHighlight[];
  const localByKey = new Map(
    local.map((item) => [highlightKey(item.book_slug, item.chapter, item.verse), item])
  );

  for (const remoteItem of remote) {
    const key = highlightKey(remoteItem.book_slug, remoteItem.chapter, remoteItem.verse);
    const localItem = localByKey.get(key);
    const remoteMs = parseIsoMs(remoteItem.updated_at);
    const localMs = parseIsoMs(localItem?.created_at);

    if (localItem && localMs >= remoteMs) {
      continue;
    }

    const verseId = await highlightsRepo.findVerseIdByReference(
      remoteItem.book_slug,
      remoteItem.chapter,
      remoteItem.verse
    );
    if (!verseId) {
      continue;
    }

    await highlightsRepo.setVerseHighlight(verseId, remoteItem.color);
  }

  await writeJsonArray(PENDING_HIGHLIGHT_DELETES_KEY, []);
  const { useHighlightsStore } = await import("@/store/highlightsStore");
  await useHighlightsStore.getState().loadHighlights();
}

async function syncNotes(userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  const notesRaw = await AsyncStorage.getItem(NOTES_KEY);
  const localNotes: Note[] = notesRaw ? (JSON.parse(notesRaw) as Note[]) : [];
  const pendingDeletes = await readJsonArray<string>(PENDING_NOTE_DELETES_KEY);

  for (const noteId of pendingDeletes) {
    if (isUuid(noteId)) {
      await supabase.from("user_notes_sync").delete().eq("user_id", userId).eq("id", noteId);
    }
  }

  const upsertRows = localNotes.map((note) => ({
    id: isUuid(note.id) ? note.id : undefined,
    user_id: userId,
    title: note.title,
    content: note.body,
    reference_verses: [] as string[],
    updated_at: note.updatedAt,
  }));

  if (upsertRows.length > 0) {
    const { data: upserted, error: upsertError } = await supabase
      .from("user_notes_sync")
      .upsert(upsertRows, { onConflict: "id" })
      .select("id, updated_at");

    if (upsertError) {
      throw upsertError;
    }

    if (upserted && upserted.length > 0) {
      const idByUpdatedAt = new Map<string, string>();
      for (const row of upserted as { id: string; updated_at: string }[]) {
        idByUpdatedAt.set(row.updated_at, row.id);
      }

      let remapped = false;
      const nextNotes = localNotes.map((note) => {
        if (isUuid(note.id)) {
          return note;
        }
        const cloudId = idByUpdatedAt.get(note.updatedAt);
        if (cloudId) {
          remapped = true;
          return { ...note, id: cloudId };
        }
        return note;
      });

      if (remapped) {
        await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(nextNotes));
      }
    }
  }

  const { data: remoteRows, error } = await supabase
    .from("user_notes_sync")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  const remote = (remoteRows ?? []) as CloudNote[];
  const merged = new Map<string, Note>();

  const currentRaw = await AsyncStorage.getItem(NOTES_KEY);
  const currentNotes: Note[] = currentRaw ? (JSON.parse(currentRaw) as Note[]) : [];

  for (const note of currentNotes) {
    merged.set(note.id, note);
  }

  for (const remoteNote of remote) {
    const existing = merged.get(remoteNote.id);
    const remoteMs = parseIsoMs(remoteNote.updated_at);
    const localMs = parseIsoMs(existing?.updatedAt);

    if (existing && localMs > remoteMs) {
      continue;
    }

    merged.set(remoteNote.id, {
      id: remoteNote.id,
      title: remoteNote.title,
      body: remoteNote.content,
      updatedAt: remoteNote.updated_at,
    });
  }

  const mergedNotes = Array.from(merged.values()).sort(
    (a, b) => parseIsoMs(b.updatedAt) - parseIsoMs(a.updatedAt)
  );
  await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(mergedNotes));
  await writeJsonArray(PENDING_NOTE_DELETES_KEY, []);
  const { useNotesStore } = await import("@/store/notesStore");
  await useNotesStore.getState().loadNotes();
}

async function syncReadingPlans(userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  const foundationRaw = await AsyncStorage.getItem(READING_PLAN_KEY);
  const yearRaw = await AsyncStorage.getItem(YEAR_PLAN_KEY);

  const foundationParsed = foundationRaw
    ? (JSON.parse(foundationRaw) as { completedDays?: number[]; updated_at?: string })
    : { completedDays: [] as number[] };
  const foundationCompleted = foundationParsed.completedDays ?? [];
  const foundationUpdatedAt = foundationParsed.updated_at ?? new Date().toISOString();

  const yearParsed = yearRaw
    ? (JSON.parse(yearRaw) as { completedDays?: number[]; updated_at?: string })
    : { completedDays: [] as number[] };
  const yearCompleted = yearParsed.completedDays ?? [];
  const yearUpdatedAt = yearParsed.updated_at ?? new Date().toISOString();

  const localPlans = [
    {
      plan_slug: FOUNDATION_WEEK_PLAN.id,
      completed_days: foundationCompleted,
      updated_at: foundationUpdatedAt,
    },
    {
      plan_slug: YEAR_PLAN_SLUG,
      completed_days: yearCompleted,
      updated_at: yearUpdatedAt,
    },
  ];

  await supabase.from("reading_plans_progress").upsert(
    localPlans.map((plan) => ({
      user_id: userId,
      plan_slug: plan.plan_slug,
      completed_days: plan.completed_days,
      updated_at: plan.updated_at,
    })),
    { onConflict: "user_id,plan_slug" }
  );

  const { data: remoteRows, error } = await supabase
    .from("reading_plans_progress")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  for (const remote of (remoteRows ?? []) as CloudPlanProgress[]) {
    if (remote.plan_slug === FOUNDATION_WEEK_PLAN.id) {
      const localMs = foundationRaw ? parseIsoMs(JSON.parse(foundationRaw).updated_at) : 0;
      const remoteMs = parseIsoMs(remote.updated_at);
      if (remoteMs >= localMs) {
        await AsyncStorage.setItem(
          READING_PLAN_KEY,
          JSON.stringify({
            planId: FOUNDATION_WEEK_PLAN.id,
            completedDays: remote.completed_days ?? [],
            updated_at: remote.updated_at,
          })
        );
        const { useReadingPlanStore } = await import("@/store/readingPlanStore");
        await useReadingPlanStore.getState().loadProgress();
      }
    }

    if (remote.plan_slug === YEAR_PLAN_SLUG) {
      const parsedYear = yearRaw ? JSON.parse(yearRaw) : {};
      const localMs = parseIsoMs(parsedYear.updated_at);
      const remoteMs = parseIsoMs(remote.updated_at);
      if (remoteMs >= localMs) {
        await AsyncStorage.setItem(
          YEAR_PLAN_KEY,
          JSON.stringify({
            startDate: parsedYear.startDate ?? null,
            completedDays: remote.completed_days ?? [],
            updated_at: remote.updated_at,
          })
        );
        const { useYearPlanStore } = await import("@/store/yearPlanStore");
        await useYearPlanStore.getState().load();
      }
    }
  }
}

async function syncUserProfile(userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  const stats = await getUserStats();
  const { useLocaleStore } = await import("@/store/localeStore");
  const locale = useLocaleStore.getState().resolveInitialLocale();
  const nowIso = new Date().toISOString();

  await supabase.from("user_profiles").upsert(
    {
      id: userId,
      streak_days: stats.streakDays,
      daily_goal_chapters: stats.dailyGoal,
      language: locale,
      updated_at: nowIso,
    },
    { onConflict: "id" }
  );

  const statsRawAfterPush = await AsyncStorage.getItem(STATS_KEY);
  const storedAfterPush = statsRawAfterPush ? JSON.parse(statsRawAfterPush) : {};
  await AsyncStorage.setItem(
    STATS_KEY,
    JSON.stringify({ ...storedAfterPush, profile_updated_at: nowIso })
  );

  const { data: remoteRow, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!remoteRow) {
    return;
  }

  const remote = remoteRow as CloudProfile;
  const statsRaw = await AsyncStorage.getItem(STATS_KEY);
  const stored = statsRaw ? JSON.parse(statsRaw) : {};
  const localProfileMs = parseIsoMs(stored.profile_updated_at);
  const remoteMs = parseIsoMs(remote.updated_at);

  if (remoteMs <= localProfileMs) {
    return;
  }

  const nextStats = {
    ...stored,
    streak_days: remote.streak_days,
    daily_goal: remote.daily_goal_chapters,
    profile_updated_at: remote.updated_at,
  };
  await AsyncStorage.setItem(STATS_KEY, JSON.stringify(nextStats));

  if (remote.language === "pl" || remote.language === "en") {
    await useLocaleStore.getState().setLocale(remote.language);
  }
}

export function initSyncEngine(): void {
  void NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      scheduleSync();
    }
  });
}
