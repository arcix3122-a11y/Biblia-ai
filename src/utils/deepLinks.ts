import * as Linking from "expo-linking";
import i18n from "@/i18n";
import type { PracticeId } from "@/data/practices";

export const APP_SCHEME = "biblia-ai";

export interface ReaderDeepLinkTarget {
  type: "reader";
  bookSlug: string;
  chapter: number;
  verse?: number;
}

export interface InviteDeepLinkTarget {
  type: "invite";
}

export interface StreakDeepLinkTarget {
  type: "streak";
  days: number;
}

export interface PracticeDeepLinkTarget {
  type: "practice";
  practiceId: PracticeId;
  day: number;
}

export type AppDeepLinkTarget =
  | ReaderDeepLinkTarget
  | InviteDeepLinkTarget
  | StreakDeepLinkTarget
  | PracticeDeepLinkTarget;

const READER_PATH = /^\/reader\/([^/?#]+)\/(\d+)(?:\/(\d+))?/;
const STREAK_PATH = /^\/streak\/?$/;
const INVITE_PATH = /^\/invite\/?$/;
const PRACTICE_PATH = /^\/practice\/([^/?#]+)\/?$/;
const PRACTICE_IDS: readonly PracticeId[] = ["fasting", "stations", "rosary"];

function isPracticeId(value: string): value is PracticeId {
  return (PRACTICE_IDS as readonly string[]).includes(value);
}

function publicShareBase(): string | undefined {
  return process.env.EXPO_PUBLIC_SHARE_URL?.replace(/\/$/, "");
}

function buildAppPath(path: string, query?: Record<string, string | number>): string {
  const base = path.startsWith("/") ? path : `/${path}`;
  if (!query || Object.keys(query).length === 0) {
    return base;
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

function createAppUrl(path: string, query?: Record<string, string | number>): string {
  return Linking.createURL(buildAppPath(path, query).replace(/^\//, ""), { scheme: APP_SCHEME });
}

function createPublicUrl(path: string, query?: Record<string, string | number>): string {
  const publicBase = publicShareBase();
  if (!publicBase) {
    return createAppUrl(path, query);
  }
  return `${publicBase}${buildAppPath(path, query)}`;
}

/** Reusable link line for share templates (web + deep link when configured). */
export function formatShareLinkLine(deepLink: string, publicUrl: string): string {
  return publicUrl !== deepLink
    ? i18n.t("share.openInAppWithWeb", { webUrl: publicUrl, deepLink })
    : i18n.t("share.openInApp", { link: deepLink });
}

function parseReaderPath(pathname: string, searchParams: URLSearchParams): ReaderDeepLinkTarget | null {
  const match = READER_PATH.exec(pathname);
  if (!match) {
    return null;
  }

  const bookSlug = decodeURIComponent(match[1]);
  const chapter = Number(match[2]);
  if (!bookSlug || !Number.isFinite(chapter) || chapter < 1) {
    return null;
  }

  const verseFromPath = match[3] ? Number(match[3]) : undefined;
  const verseFromQuery = searchParams.get("verse");
  const verse =
    verseFromPath ??
    (verseFromQuery && Number.isFinite(Number(verseFromQuery))
      ? Number(verseFromQuery)
      : undefined);

  return { type: "reader", bookSlug, chapter, verse };
}

function parseStreakPath(pathname: string, searchParams: URLSearchParams): StreakDeepLinkTarget | null {
  if (!STREAK_PATH.test(pathname)) {
    return null;
  }
  const daysRaw = searchParams.get("days");
  const days = daysRaw && Number.isFinite(Number(daysRaw)) ? Math.max(1, Number(daysRaw)) : 1;
  return { type: "streak", days };
}

function parseInvitePath(pathname: string): InviteDeepLinkTarget | null {
  if (!INVITE_PATH.test(pathname)) {
    return null;
  }
  return { type: "invite" };
}

function parsePracticePath(pathname: string, searchParams: URLSearchParams): PracticeDeepLinkTarget | null {
  const match = PRACTICE_PATH.exec(pathname);
  if (!match) {
    return null;
  }
  const practiceId = decodeURIComponent(match[1] ?? "");
  if (!isPracticeId(practiceId)) {
    return null;
  }
  const dayRaw = searchParams.get("day");
  const day = dayRaw && Number.isFinite(Number(dayRaw)) ? Math.max(1, Number(dayRaw)) : 1;
  return { type: "practice", practiceId, day };
}

function parseAppPath(pathname: string, searchParams: URLSearchParams): AppDeepLinkTarget | null {
  return (
    parseReaderPath(pathname, searchParams) ??
    parseInvitePath(pathname) ??
    parseStreakPath(pathname, searchParams) ??
    parsePracticePath(pathname, searchParams)
  );
}

/** Build an in-app deep link, e.g. biblia-ai://reader/genesis/1?verse=16 */
export function buildReaderDeepLink(
  bookSlug: string,
  chapter: number,
  verse?: number
): string {
  const query =
    verse != null && Number.isFinite(verse) ? { verse: String(verse) } : undefined;
  return createAppUrl(`/reader/${encodeURIComponent(bookSlug)}/${chapter}`, query);
}

/** Public HTTPS landing URL when EXPO_PUBLIC_SHARE_URL is set; otherwise deep link only. */
export function buildShareUrl(bookSlug: string, chapter: number, verse?: number): string {
  const query =
    verse != null && Number.isFinite(verse) ? { verse: String(verse) } : undefined;
  return createPublicUrl(`/reader/${encodeURIComponent(bookSlug)}/${chapter}`, query);
}

export function buildInviteDeepLink(): string {
  return createAppUrl("/invite");
}

export function buildInviteShareUrl(): string {
  return createPublicUrl("/invite");
}

export function buildStreakShareDeepLink(days: number): string {
  return createAppUrl("/streak", { days: Math.max(1, Math.floor(days)) });
}

export function buildStreakShareUrl(days: number): string {
  return createPublicUrl("/streak", { days: Math.max(1, Math.floor(days)) });
}

export function buildPracticeShareDeepLink(practiceId: PracticeId, day: number): string {
  return createAppUrl(`/practice/${practiceId}`, { day: Math.max(1, Math.floor(day)) });
}

export function buildPracticeShareUrl(practiceId: PracticeId, day: number): string {
  return createPublicUrl(`/practice/${practiceId}`, { day: Math.max(1, Math.floor(day)) });
}

/** Parse biblia-ai:// or https share URLs into navigation targets. */
export function parseAppDeepLink(url: string): AppDeepLinkTarget | null {
  try {
    const parsed = Linking.parse(url);
    const path = parsed.path ? `/${parsed.path.replace(/^\/+/, "")}` : "";
    const params = new URLSearchParams();

    if (parsed.queryParams) {
      for (const [key, value] of Object.entries(parsed.queryParams)) {
        if (typeof value === "string") {
          params.set(key, value);
        } else if (Array.isArray(value) && typeof value[0] === "string") {
          params.set(key, value[0]);
        }
      }
    }

    return parseAppPath(path, params);
  } catch {
    return null;
  }
}

/** @deprecated Use parseAppDeepLink — reader-only helper for existing call sites. */
export function parseReaderDeepLink(url: string): Omit<ReaderDeepLinkTarget, "type"> | null {
  const target = parseAppDeepLink(url);
  if (!target || target.type !== "reader") {
    return null;
  }
  const { bookSlug, chapter, verse } = target;
  return { bookSlug, chapter, verse };
}

/** Expo Router href for reader navigation (supports verse query param). */
export function readerHref(
  bookSlug: string,
  chapter: number,
  verse?: number
): `/reader/${string}/${number}${string}` {
  const base = `/reader/${bookSlug}/${chapter}` as const;
  if (verse != null && Number.isFinite(verse)) {
    return `${base}?verse=${verse}` as `/reader/${string}/${number}${string}`;
  }
  return base;
}
