import * as Linking from "expo-linking";

export const APP_SCHEME = "biblia-ai";

export interface ReaderDeepLinkTarget {
  bookSlug: string;
  chapter: number;
  verse?: number;
}

const READER_PATH = /^\/reader\/([^/?#]+)\/(\d+)(?:\/(\d+))?/;

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

  return { bookSlug, chapter, verse };
}

/** Build an in-app deep link, e.g. biblia-ai://reader/genesis/1?verse=16 */
export function buildReaderDeepLink(
  bookSlug: string,
  chapter: number,
  verse?: number
): string {
  const base = `/reader/${encodeURIComponent(bookSlug)}/${chapter}`;
  const query = verse != null && Number.isFinite(verse) ? `?verse=${verse}` : "";
  return Linking.createURL(`${base}${query}`, { scheme: APP_SCHEME });
}

/** Public HTTPS landing URL when EXPO_PUBLIC_SHARE_URL is set; otherwise deep link only. */
export function buildShareUrl(bookSlug: string, chapter: number, verse?: number): string {
  const publicBase = process.env.EXPO_PUBLIC_SHARE_URL?.replace(/\/$/, "");
  if (!publicBase) {
    return buildReaderDeepLink(bookSlug, chapter, verse);
  }

  const path = `/reader/${encodeURIComponent(bookSlug)}/${chapter}`;
  const query = verse != null && Number.isFinite(verse) ? `?verse=${verse}` : "";
  return `${publicBase}${path}${query}`;
}

/** Parse biblia-ai:// or https share URLs into reader navigation targets. */
export function parseReaderDeepLink(url: string): ReaderDeepLinkTarget | null {
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

    return parseReaderPath(path, params);
  } catch {
    return null;
  }
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
