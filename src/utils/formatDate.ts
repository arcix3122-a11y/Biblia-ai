import { LOCALE_INTL, resolveAppLocale, type AppLocale } from "@/i18n";

export function formatShortDate(iso: string, locale: AppLocale | null): string {
  const resolved = resolveAppLocale(locale);
  return new Date(iso).toLocaleDateString(LOCALE_INTL[resolved], {
    month: "short",
    day: "numeric",
  });
}

export function formatNoteDate(iso: string, locale: AppLocale | null): string {
  const resolved = resolveAppLocale(locale);
  return new Date(iso).toLocaleDateString(LOCALE_INTL[resolved], {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatSavedDate(iso: string, locale: AppLocale | null): string {
  const resolved = resolveAppLocale(locale);
  return new Date(iso).toLocaleDateString(LOCALE_INTL[resolved]);
}
