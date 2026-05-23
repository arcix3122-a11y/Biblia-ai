import AsyncStorage from "@react-native-async-storage/async-storage";

const STATS_KEY = "@biblia-ai/user-stats";
const DEFAULT_DAILY_GOAL = 1;

export interface UserStats {
  streakDays: number;
  lastReadDate: string | null;
  chaptersReadToday: number;
  dailyGoal: number;
  goalMetToday: boolean;
}

interface StoredStats {
  streak_days: number;
  last_read_date: string | null;
  daily_goal: number;
  chapters_today: string[];
  chapters_date: string | null;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function chapterKey(bookSlug: string, chapter: number): string {
  return `${bookSlug}-${chapter}`;
}

async function readStored(): Promise<StoredStats> {
  const raw = await AsyncStorage.getItem(STATS_KEY);
  if (!raw) {
    return {
      streak_days: 0,
      last_read_date: null,
      daily_goal: DEFAULT_DAILY_GOAL,
      chapters_today: [],
      chapters_date: null,
    };
  }
  try {
    const parsed = JSON.parse(raw) as StoredStats;
    return {
      streak_days: parsed.streak_days ?? 0,
      last_read_date: parsed.last_read_date ?? null,
      daily_goal: parsed.daily_goal ?? DEFAULT_DAILY_GOAL,
      chapters_today: parsed.chapters_today ?? [],
      chapters_date: parsed.chapters_date ?? null,
    };
  } catch {
    return {
      streak_days: 0,
      last_read_date: null,
      daily_goal: DEFAULT_DAILY_GOAL,
      chapters_today: [],
      chapters_date: null,
    };
  }
}

async function writeStored(stats: StoredStats): Promise<void> {
  await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
  const { scheduleSync } = await import("@/services/sync/syncEngine");
  scheduleSync();
}

function normalizeChaptersForToday(stored: StoredStats): StoredStats {
  const today = todayKey();
  if (stored.chapters_date !== today) {
    return { ...stored, chapters_today: [], chapters_date: today };
  }
  return stored;
}

function toUserStats(stored: StoredStats): UserStats {
  const normalized = normalizeChaptersForToday(stored);
  const today = todayKey();
  const yesterday = yesterdayKey();

  let streakDays = stored.streak_days;
  let lastReadDate = stored.last_read_date;

  if (
    stored.last_read_date &&
    stored.last_read_date !== today &&
    stored.last_read_date !== yesterday
  ) {
    streakDays = 0;
    lastReadDate = null;
  }

  const chaptersReadToday = normalized.chapters_today.length;
  const dailyGoal = stored.daily_goal;

  return {
    streakDays,
    lastReadDate,
    chaptersReadToday,
    dailyGoal,
    goalMetToday: chaptersReadToday >= dailyGoal,
  };
}

export async function getUserStats(): Promise<UserStats> {
  const stored = await readStored();
  return toUserStats(stored);
}

export async function recordDailyRead(): Promise<UserStats> {
  const stored = await readStored();
  const today = todayKey();
  const yesterday = yesterdayKey();

  if (stored.last_read_date === today) {
    return toUserStats(stored);
  }

  const nextStreak =
    stored.last_read_date === yesterday ? stored.streak_days + 1 : 1;

  const next: StoredStats = {
    ...normalizeChaptersForToday(stored),
    streak_days: nextStreak,
    last_read_date: today,
  };
  await writeStored(next);

  return toUserStats(next);
}

export async function recordChapterRead(
  bookSlug: string,
  chapter: number
): Promise<UserStats> {
  const stored = await readStored();
  const normalized = normalizeChaptersForToday(stored);
  const key = chapterKey(bookSlug, chapter);

  if (normalized.chapters_today.includes(key)) {
    return toUserStats(normalized);
  }

  const next: StoredStats = {
    ...normalized,
    chapters_today: [...normalized.chapters_today, key],
  };

  await writeStored(next);
  return recordDailyRead();
}

export async function setDailyGoal(goal: number): Promise<UserStats> {
  const clamped = Math.min(5, Math.max(1, Math.round(goal)));
  const stored = await readStored();
  const next: StoredStats = { ...stored, daily_goal: clamped };
  await writeStored(next);
  return toUserStats(next);
}
