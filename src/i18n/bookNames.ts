import { i18n, resolveAppLocale } from "@/i18n";
import type { AppLocale } from "@/i18n/types";

/**
 * Localized book label for UI chrome (grid tiles, headers, bookmarks, search).
 * Polish uses genitive forms as in traditional "Księga …" headings (e.g. Rodzaju, Mateusza).
 * Verse text comes from SQLite in the active scripture translation (KJV / Biblia Gdańska).
 */
export function getBookDisplayName(
  slug: string | undefined | null,
  locale?: AppLocale | null,
  fallback?: string
): string {
  if (!slug) {
    return fallback ?? "";
  }

  const lng = resolveAppLocale(locale ?? null);
  const key = `books.${slug}`;

  if (i18n.exists(key, { lng })) {
    return String(i18n.t(key, { lng, defaultValue: fallback ?? slug }));
  }

  return fallback ?? slug;
}

export function formatBookReference(
  slug: string | undefined | null,
  chapter: number,
  verse?: number,
  locale?: AppLocale | null,
  fallback?: string
): string {
  const name = getBookDisplayName(slug, locale, fallback);
  if (verse != null) {
    return `${name} ${chapter}:${verse}`;
  }
  return `${name} ${chapter}`;
}
