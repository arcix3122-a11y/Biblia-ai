import AsyncStorage from "@react-native-async-storage/async-storage";
import type { VotdComment } from "@/services/social/votdSocialRepository";

const QUEUE_KEY = "@biblia-ai/pending-votd-comments";

export interface PendingVotdComment {
  localId: string;
  verse_ref: string;
  body: string;
  parent_comment_id?: string | null;
  created_at: string;
}

function makeLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function readQueue(): Promise<PendingVotdComment[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as PendingVotdComment[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(items: PendingVotdComment[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export function pendingToVotdComment(item: PendingVotdComment, userId: string): VotdComment {
  return {
    id: item.localId,
    user_id: userId,
    verse_ref: item.verse_ref,
    body: item.body,
    parent_comment_id: item.parent_comment_id ?? null,
    created_at: item.created_at,
  };
}

export async function getPendingComments(verseRef: string): Promise<PendingVotdComment[]> {
  const queue = await readQueue();
  return queue.filter((item) => item.verse_ref === verseRef);
}

export async function enqueueComment(
  verseRef: string,
  body: string,
  parentCommentId?: string | null
): Promise<PendingVotdComment> {
  const item: PendingVotdComment = {
    localId: makeLocalId(),
    verse_ref: verseRef,
    body,
    parent_comment_id: parentCommentId ?? null,
    created_at: new Date().toISOString(),
  };
  const queue = await readQueue();
  queue.unshift(item);
  await writeQueue(queue);
  return item;
}

export async function removePendingComment(localId: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.filter((item) => item.localId !== localId));
}

export async function listPendingComments(): Promise<PendingVotdComment[]> {
  return readQueue();
}
