import AsyncStorage from "@react-native-async-storage/async-storage";

const STATS_KEY = "@biblia-ai/user-stats";

export interface UserStats {
  streakDays: number;
  lastReadDate: string | null;
}

interface StoredStats {
  streak_days: number;
  last_read_date: string | null;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function readStored(): Promise<StoredStats> {
  const raw = await AsyncStorage.getItem(STATS_KEY);
  if (!raw) {
    return { streak_days: 0, last_read_date: null };
  }
  try {
    const parsed = JSON.parse(raw) as StoredStats;
    return {
      streak_days: parsed.streak_days ?? 0,
      last_read_date: parsed.last_read_date ?? null,
    };
  } catch {
    return { streak_days: 0, last_read_date: null };
  }
}

async function writeStored(stats: StoredStats): Promise<void> {
  await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export async function getUserStats(): Promise<UserStats> {
  const stored = await readStored();
  const today = todayKey();
  const yesterday = yesterdayKey();

  if (
    stored.last_read_date &&
    stored.last_read_date !== today &&
    stored.last_read_date !== yesterday
  ) {
    return { streakDays: 0, lastReadDate: null };
  }

  return {
    streakDays: stored.streak_days,
    lastReadDate: stored.last_read_date,
  };
}

export async function recordDailyRead(): Promise<UserStats> {
  const stored = await readStored();
  const today = todayKey();
  const yesterday = yesterdayKey();

  if (stored.last_read_date === today) {
    return { streakDays: stored.streak_days, lastReadDate: today };
  }

  const nextStreak =
    stored.last_read_date === yesterday ? stored.streak_days + 1 : 1;

  const next: StoredStats = {
    streak_days: nextStreak,
    last_read_date: today,
  };
  await writeStored(next);

  return { streakDays: next.streak_days, lastReadDate: next.last_read_date };
}
