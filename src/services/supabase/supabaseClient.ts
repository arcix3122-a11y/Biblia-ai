import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;
let cachedUserId: string | null = null;
let anonymousAuthBlocked = false;

function isAnonymousDisabledError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : String(error);
  return (
    message.includes("Anonymous sign-ins are disabled") ||
    message.includes("anonymous_provider_disabled") ||
    message.includes("Anonymous sign-ins are disabled for this project")
  );
}

function isNetworkFailure(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : String(error);
  return (
    message.includes("Network request failed") ||
    message.includes("Failed to fetch") ||
    message.includes("AbortError")
  );
}

function updateCachedUserId(userId: string | null): void {
  cachedUserId = userId;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (client !== undefined) {
    return client;
  }

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    client = null;
    return null;
  }

  client = createClient(url, anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  void client.auth
    .getSession()
    .then(({ data }) => {
      updateCachedUserId(data.session?.user.id ?? null);
    })
    .catch(() => {
      // offline / network — session will retry on next call
    });

  client.auth.onAuthStateChange((_event, session) => {
    updateCachedUserId(session?.user.id ?? null);
  });

  return client;
}

/** Synchronous read of last known session user id (updated after auth init / state change). */
export function getSessionUserId(): string | null {
  return cachedUserId;
}

export async function getSessionUserIdAsync(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }
  try {
    const { data } = await supabase.auth.getSession();
    updateCachedUserId(data.session?.user.id ?? null);
    return cachedUserId;
  } catch {
    return cachedUserId;
  }
}

/** True when Supabase Dashboard has Anonymous sign-in disabled. */
export function isAnonymousAuthBlocked(): boolean {
  return anonymousAuthBlocked;
}

export async function ensureAnonymousSession(): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return false;
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      updateCachedUserId(sessionData.session.user.id);
      anonymousAuthBlocked = false;
      return true;
    }

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      if (isAnonymousDisabledError(error)) {
        anonymousAuthBlocked = true;
        return false;
      }
      if (!isNetworkFailure(error)) {
        throw error;
      }
      return false;
    }
    anonymousAuthBlocked = false;
    updateCachedUserId(data.user?.id ?? data.session?.user.id ?? null);
    return Boolean(cachedUserId);
  } catch (error) {
    if (isAnonymousDisabledError(error)) {
      anonymousAuthBlocked = true;
      return false;
    }
    if (!isNetworkFailure(error)) {
      throw error;
    }
    return false;
  }
}
