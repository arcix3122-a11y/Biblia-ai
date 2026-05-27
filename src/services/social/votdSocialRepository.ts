import {
  ensureAnonymousSession,
  getSessionUserIdAsync,
  getSupabaseClient,
} from "@/services/supabase/supabaseClient";
import {
  enqueueComment,
  listPendingComments,
  pendingToVotdComment,
  removePendingComment,
} from "@/services/social/commentQueue";

export interface VotdComment {
  id: string;
  user_id: string;
  verse_ref: string;
  body: string;
  created_at: string;
}

export interface VotdLikeState {
  count: number;
  likedByMe: boolean;
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

export function buildVerseRef(bookSlug: string, chapter: number, verse: number): string {
  return `${bookSlug}-${chapter}-${verse}`;
}

function isSchemaMissing(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const code = "code" in error ? String((error as { code?: string }).code) : "";
  const message =
    "message" in error && typeof (error as { message?: string }).message === "string"
      ? (error as { message: string }).message
      : "";
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    message.includes("Could not find the table") ||
    (message.includes("relation") && message.includes("does not exist"))
  );
}

export function isSocialAvailable(): boolean {
  return getSupabaseClient() !== null;
}

/** Comments require Supabase + optional EXPO_PUBLIC_COMMENTS_ENABLED flag (default on). */
export function isCommentsEnabled(): boolean {
  if (process.env.EXPO_PUBLIC_COMMENTS_ENABLED === "false") {
    return false;
  }
  return isSocialAvailable();
}

export async function getLikeState(verseRef: string): Promise<VotdLikeState | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const userId = await getSessionUserIdAsync();

    const [countResult, mineResult] = await Promise.all([
      supabase
        .from("votd_likes")
        .select("id", { count: "exact", head: true })
        .eq("verse_ref", verseRef),
      userId
        ? supabase
            .from("votd_likes")
            .select("id")
            .eq("verse_ref", verseRef)
            .eq("user_id", userId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null } as const),
    ]);

    if (countResult.error) {
      if (isNetworkFailure(countResult.error)) {
        return null;
      }
      throw countResult.error;
    }

    return {
      count: countResult.count ?? 0,
      likedByMe: Boolean(mineResult && "data" in mineResult && mineResult.data),
    };
  } catch (error) {
    if (isNetworkFailure(error)) {
      return null;
    }
    throw error;
  }
}

export async function toggleLike(verseRef: string, nextLiked: boolean): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const userId = await getSessionUserIdAsync();
    if (!userId) {
      return;
    }

    if (nextLiked) {
      const { error } = await supabase
        .from("votd_likes")
        .insert({ user_id: userId, verse_ref: verseRef });
      if (error && error.code !== "23505") {
        if (isNetworkFailure(error)) {
          return;
        }
        throw error;
      }
    } else {
      const { error } = await supabase
        .from("votd_likes")
        .delete()
        .eq("user_id", userId)
        .eq("verse_ref", verseRef);
      if (error) {
        if (isNetworkFailure(error)) {
          return;
        }
        throw error;
      }
    }
  } catch (error) {
    if (isNetworkFailure(error)) {
      return;
    }
    throw error;
  }
}

export async function listComments(verseRef: string, limit = 50): Promise<VotdComment[]> {
  const supabase = getSupabaseClient();
  const userId = (await getSessionUserIdAsync()) ?? "offline";
  const pending = (await listPendingComments())
    .filter((item) => item.verse_ref === verseRef)
    .map((item) => pendingToVotdComment(item, userId));

  if (!supabase) {
    return pending;
  }

  try {
    const { data, error } = await supabase
      .from("votd_comments")
      .select("id, user_id, verse_ref, body, created_at")
      .eq("verse_ref", verseRef)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      if (isNetworkFailure(error) || isSchemaMissing(error)) {
        return pending;
      }
      throw error;
    }
    const remote = (data ?? []) as VotdComment[];
    const remoteBodies = new Set(remote.map((c) => c.body));
    const unmatchedPending = pending.filter((c) => !remoteBodies.has(c.body));
    return [...unmatchedPending, ...remote];
  } catch (error) {
    if (isNetworkFailure(error) || isSchemaMissing(error)) {
      return pending;
    }
    throw error;
  }
}

export async function getCommentCount(verseRef: string): Promise<number> {
  const supabase = getSupabaseClient();
  if (!supabase) return 0;

  try {
    const { count, error } = await supabase
      .from("votd_comments")
      .select("id", { count: "exact", head: true })
      .eq("verse_ref", verseRef);

    if (error) {
      if (isNetworkFailure(error)) {
        return 0;
      }
      throw error;
    }
    return count ?? 0;
  } catch (error) {
    if (isNetworkFailure(error)) {
      return 0;
    }
    throw error;
  }
}

export async function postComment(verseRef: string, body: string): Promise<VotdComment> {
  const supabase = getSupabaseClient();
  if (!supabase || !isCommentsEnabled()) {
    throw new Error("Comments disabled");
  }

  const trimmed = body.trim().slice(0, 600);
  if (trimmed.length === 0) {
    throw new Error("Empty comment");
  }

  await ensureAnonymousSession();
  const userId = await getSessionUserIdAsync();
  if (!userId) {
    const queued = await enqueueComment(verseRef, trimmed);
    return pendingToVotdComment(queued, "offline");
  }

  try {
    const { data, error } = await supabase
      .from("votd_comments")
      .insert({ user_id: userId, verse_ref: verseRef, body: trimmed })
      .select("id, user_id, verse_ref, body, created_at")
      .single();

    if (error || !data) {
      if (error && (isNetworkFailure(error) || isSchemaMissing(error))) {
        const queued = await enqueueComment(verseRef, trimmed);
        return pendingToVotdComment(queued, userId);
      }
      throw error ?? new Error("Insert failed");
    }
    return data as VotdComment;
  } catch (error) {
    if (isNetworkFailure(error) || isSchemaMissing(error)) {
      const queued = await enqueueComment(verseRef, trimmed);
      return pendingToVotdComment(queued, userId);
    }
    throw error;
  }
}

export async function flushPendingComments(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase || !isCommentsEnabled()) {
    return;
  }

  await ensureAnonymousSession();
  const userId = await getSessionUserIdAsync();
  if (!userId) {
    return;
  }

  const pending = await listPendingComments();
  if (pending.length === 0) {
    return;
  }

  for (const item of pending) {
    try {
      const { data, error } = await supabase
        .from("votd_comments")
        .insert({ user_id: userId, verse_ref: item.verse_ref, body: item.body })
        .select("id")
        .single();

      if (error) {
        if (isNetworkFailure(error)) {
          return;
        }
        if (isSchemaMissing(error)) {
          return;
        }
        continue;
      }
      if (data) {
        await removePendingComment(item.localId);
      }
    } catch (error) {
      if (isNetworkFailure(error)) {
        return;
      }
      if (isSchemaMissing(error)) {
        return;
      }
    }
  }
}

export async function deleteComment(commentId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const userId = await getSessionUserIdAsync();
  if (!userId) {
    return;
  }
  try {
    const { error } = await supabase
      .from("votd_comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", userId);
    if (error) {
      if (isNetworkFailure(error)) {
        return;
      }
      throw error;
    }
  } catch (error) {
    if (isNetworkFailure(error)) {
      return;
    }
    throw error;
  }
}

/** Short display tag from a UUID (last 6 chars uppercased) — used as anonymous author handle. */
export function authorTag(userId: string): string {
  return userId.slice(-6).toUpperCase();
}
