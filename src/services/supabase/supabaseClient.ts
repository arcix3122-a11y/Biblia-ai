import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;
let cachedUserId: string | null = null;

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

export async function ensureAnonymousSession(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      updateCachedUserId(sessionData.session.user.id);
      return;
    }

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      if (!isNetworkFailure(error)) {
        throw error;
      }
      return;
    }
    updateCachedUserId(data.user?.id ?? data.session?.user.id ?? null);
  } catch (error) {
    if (!isNetworkFailure(error)) {
      throw error;
    }
  }
}
