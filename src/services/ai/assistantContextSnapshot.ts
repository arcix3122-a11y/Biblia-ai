import { FOUNDATION_WEEK_PLAN, getActivePlanDay } from "@/data/readingPlans";
import { formatBookReference } from "@/i18n/bookNames";
import type { AppLocale } from "@/i18n";
import { getVerseOfTheDay } from "@/services/db/scriptureRepository";
import { useReadingPlanStore } from "@/store/readingPlanStore";
import { useYearPlanStore } from "@/store/yearPlanStore";
import type { ScriptureTranslation } from "@/types/scripture";

export interface AssistantReadingPlanContext {
  planId: string;
  activeDay: number;
  totalDays: number;
  completedDays: number[];
  bookSlug: string;
  chapter: number;
  bookReference: string;
  allComplete: boolean;
}

export interface AssistantYearPlanContext {
  currentDay: number;
  progressPercent: number;
  completedCount: number;
}

export interface AssistantMemoryVerseContext {
  reference: string;
  text: string;
}

export interface AssistantContextSnapshot {
  readingPlan: AssistantReadingPlanContext | null;
  yearPlan: AssistantYearPlanContext | null;
  memoryVerse: AssistantMemoryVerseContext | null;
}

function buildReadingPlanContext(locale: AppLocale): AssistantReadingPlanContext | null {
  const completedDays = useReadingPlanStore.getState().completedDays;
  const activeDay = getActivePlanDay(FOUNDATION_WEEK_PLAN, completedDays);
  const totalDays = FOUNDATION_WEEK_PLAN.days.length;
  const allComplete = completedDays.length >= totalDays;

  return {
    planId: FOUNDATION_WEEK_PLAN.id,
    activeDay: activeDay.day,
    totalDays,
    completedDays,
    bookSlug: activeDay.bookSlug,
    chapter: activeDay.chapter,
    bookReference: formatBookReference(
      activeDay.bookSlug,
      activeDay.chapter,
      undefined,
      locale
    ),
    allComplete,
  };
}

function buildYearPlanContext(): AssistantYearPlanContext | null {
  const { startDate, completedDays, getCurrentDay, getProgress } = useYearPlanStore.getState();
  if (!startDate) {
    return null;
  }

  return {
    currentDay: getCurrentDay(),
    progressPercent: getProgress(),
    completedCount: completedDays.length,
  };
}

async function buildMemoryVerseContext(
  locale: AppLocale,
  translation: ScriptureTranslation
): Promise<AssistantMemoryVerseContext | null> {
  const votd = await getVerseOfTheDay(translation);
  if (!votd) {
    return null;
  }

  return {
    reference: formatBookReference(
      votd.book_slug,
      votd.chapter_number,
      votd.number,
      locale,
      votd.book_name
    ),
    text: votd.text,
  };
}

/** Builds structured assistant context from local stores and verse-of-the-day. */
export async function buildAssistantContextSnapshot(
  locale: AppLocale,
  translation: ScriptureTranslation
): Promise<AssistantContextSnapshot> {
  const [memoryVerse] = await Promise.all([
    buildMemoryVerseContext(locale, translation),
  ]);

  return {
    readingPlan: buildReadingPlanContext(locale),
    yearPlan: buildYearPlanContext(),
    memoryVerse,
  };
}
