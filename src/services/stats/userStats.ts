import AsyncStorage from "@react-native-async-storage/async-storage";

const STATS_KEY = "@biblia-ai/user-stats";
const DEFAULT_DAILY_GOAL = 1;

export type DailyActivityType = "scripture" | "practice" | "reflection" | "prayer";

export interface DailyActivities {
  scripture: boolean;
  practice: boolean;
  reflection: boolean;
  prayer: boolean;
}

export interface UserStats {
  streakDays: number;
  lastReadDate: string | null;
  lastActiveDate: string | null;
  chaptersReadToday: number;
  dailyGoal: number;
  goalMetToday: boolean;
  activitiesToday: DailyActivities;
  activitiesCompletedCount: number;
  streakCompleteToday: boolean;
  freezeAvailable: boolean;
  freezeUsedThisWeek: boolean;
}

interface StoredStats {
  streak_days: number;
  last_read_date: string | null;
  last_active_date: string | null;
  daily_goal: number;
  chapters_today: string[];
  chapters_date: string | null;
  activities_date: string | null;
  activities_today: DailyActivities;
  freeze_week: string | null;
}

const EMPTY_ACTIVITIES: DailyActivities = {
  scripture: false,
  practice: false,
  reflection: false,
  prayer: false,
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function weekKey(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  return monday.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T12:00:00`);
  const b = new Date(`${to}T12:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function chapterKey(bookSlug: string, chapter: number): string {
  return `${bookSlug}-${chapter}`;
}

function countActivities(activities: DailyActivities): number {
  return Object.values(activities).filter(Boolean).length;
}

function normalizeStored(parsed: Partial<StoredStats>): StoredStats {
  return {
    streak_days: parsed.streak_days ?? 0,
    last_read_date: parsed.last_read_date ?? null,
    last_active_date: parsed.last_active_date ?? parsed.last_read_date ?? null,
    daily_goal: parsed.daily_goal ?? DEFAULT_DAILY_GOAL,
    chapters_today: parsed.chapters_today ?? [],
    chapters_date: parsed.chapters_date ?? null,
    activities_date: parsed.activities_date ?? null,
    activities_today: parsed.activities_today ?? { ...EMPTY_ACTIVITIES },
    freeze_week: parsed.freeze_week ?? null,
  };
}

async function readStored(): Promise<StoredStats> {
  const raw = await AsyncStorage.getItem(STATS_KEY);
  if (!raw) {
    return normalizeStored({});
  }
  try {
    return normalizeStored(JSON.parse(raw) as Partial<StoredStats>);
  } catch {
    return normalizeStored({});
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

function normalizeActivitiesForToday(stored: StoredStats): StoredStats {
  const today = todayKey();
  if (stored.activities_date !== today) {
    return { ...stored, activities_today: { ...EMPTY_ACTIVITIES }, activities_date: today };
  }
  return stored;
}

function isFreezeAvailable(stored: StoredStats): boolean {
  return stored.freeze_week !== weekKey();
}

function applyStreakForNewDay(stored: StoredStats): { streakDays: number; lastActiveDate: string } {
  const today = todayKey();
  const yesterday = yesterdayKey();
  const lastActive = stored.last_active_date;

  if (lastActive === today) {
    return { streakDays: stored.streak_days, lastActiveDate: today };
  }

  if (!lastActive) {
    return { streakDays: 1, lastActiveDate: today };
  }

  if (lastActive === yesterday) {
    return { streakDays: stored.streak_days + 1, lastActiveDate: today };
  }

  const gap = daysBetween(lastActive, today);
  if (gap === 2 && isFreezeAvailable(stored)) {
    return {
      streakDays: stored.streak_days + 1,
      lastActiveDate: today,
      // freeze applied below by caller
    };
  }

  return { streakDays: 1, lastActiveDate: today };
}

function toUserStats(stored: StoredStats): UserStats {
  const withChapters = normalizeChaptersForToday(stored);
  const normalized = normalizeActivitiesForToday(withChapters);
  const today = todayKey();
  const yesterday = yesterdayKey();

  let streakDays = stored.streak_days;
  let lastActiveDate = stored.last_active_date;

  if (
    lastActiveDate &&
    lastActiveDate !== today &&
    lastActiveDate !== yesterday &&
    daysBetween(lastActiveDate, today) > 2 &&
    !(daysBetween(lastActiveDate, today) === 2 && stored.freeze_week === weekKey())
  ) {
    streakDays = 0;
    lastActiveDate = null;
  }

  const chaptersReadToday = normalized.chapters_today.length;
  const dailyGoal = stored.daily_goal;
  const activitiesToday = normalized.activities_today;
  const activitiesCompletedCount = countActivities(activitiesToday);

  return {
    streakDays,
    lastReadDate: stored.last_read_date,
    lastActiveDate,
    chaptersReadToday,
    dailyGoal,
    goalMetToday: chaptersReadToday >= dailyGoal,
    activitiesToday,
    activitiesCompletedCount,
    streakCompleteToday: activitiesCompletedCount > 0,
    freezeAvailable: isFreezeAvailable(stored),
    freezeUsedThisWeek: stored.freeze_week === weekKey(),
  };
}

export async function getUserStats(): Promise<UserStats> {
  const stored = await readStored();
  return toUserStats(stored);
}

export async function recordActivity(type: DailyActivityType): Promise<UserStats> {
  const stored = await readStored();
  const withChapters = normalizeChaptersForToday(stored);
  const normalized = normalizeActivitiesForToday(withChapters);
  const today = todayKey();

  if (normalized.activities_today[type]) {
    return toUserStats(normalized);
  }

  const activitiesToday: DailyActivities = {
    ...normalized.activities_today,
    [type]: true,
  };

  const isFirstActivityToday = normalized.last_active_date !== today;
  let next: StoredStats = {
    ...normalized,
    activities_today: activitiesToday,
    activities_date: today,
  };

  if (isFirstActivityToday) {
    const gap =
      normalized.last_active_date != null
        ? daysBetween(normalized.last_active_date, today)
        : 0;
    const streakUpdate = applyStreakForNewDay(normalized);

    next = {
      ...next,
      streak_days: streakUpdate.streakDays,
      last_active_date: streakUpdate.lastActiveDate,
      last_read_date: today,
    };

    if (gap === 2 && isFreezeAvailable(normalized)) {
      next = { ...next, freeze_week: weekKey() };
    }
  }

  await writeStored(next);
  return toUserStats(next);
}

/** @deprecated Prefer recordActivity('scripture') — kept for legacy callers */
export async function recordDailyRead(): Promise<UserStats> {
  return recordActivity("scripture");
}

export async function recordChapterRead(
  bookSlug: string,
  chapter: number
): Promise<UserStats> {
  const stored = await readStored();
  const normalized = normalizeChaptersForToday(stored);
  const key = chapterKey(bookSlug, chapter);

  if (!normalized.chapters_today.includes(key)) {
    const next: StoredStats = {
      ...normalized,
      chapters_today: [...normalized.chapters_today, key],
    };
    await writeStored(next);
  }

  return recordActivity("scripture");
}

export async function setDailyGoal(goal: number): Promise<UserStats> {
  const clamped = Math.min(5, Math.max(1, Math.round(goal)));
  const stored = await readStored();
  const next: StoredStats = { ...stored, daily_goal: clamped };
  await writeStored(next);
  return toUserStats(next);
}

export async function applyStreakFreeze(): Promise<UserStats> {
  const stored = await readStored();
  const today = todayKey();
  const yesterday = yesterdayKey();

  if (!isFreezeAvailable(stored) || stored.last_active_date === today) {
    return toUserStats(stored);
  }

  if (stored.last_active_date !== yesterday && daysBetween(stored.last_active_date ?? yesterday, today) !== 2) {
    return toUserStats(stored);
  }

  const next: StoredStats = {
    ...stored,
    freeze_week: weekKey(),
    last_active_date: yesterday,
  };
  await writeStored(next);
  return toUserStats(next);
}

export function isMissionComplete(
  activities: DailyActivities,
  mission: "scripture" | "prayer" | "reflection"
): boolean {
  if (mission === "scripture") return activities.scripture;
  if (mission === "prayer") return activities.practice || activities.prayer;
  return activities.reflection;
}
