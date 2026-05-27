export interface ReadingPlanDay {
  day: number;
  bookSlug: string;
  chapter: number;
}

export interface ReadingPlanDefinition {
  id: string;
  days: ReadingPlanDay[];
}

/** Seven-day foundation plan — works with sample seed (days 1–4) and full Bible imports. */
export const FOUNDATION_WEEK_PLAN: ReadingPlanDefinition = {
  id: "foundation-week",
  days: [
    { day: 1, bookSlug: "genesis", chapter: 1 },
    { day: 2, bookSlug: "psalms", chapter: 23 },
    { day: 3, bookSlug: "john", chapter: 1 },
    { day: 4, bookSlug: "romans", chapter: 8 },
    { day: 5, bookSlug: "genesis", chapter: 1 },
    { day: 6, bookSlug: "john", chapter: 1 },
    { day: 7, bookSlug: "romans", chapter: 8 },
  ],
};

export function getActivePlanDay(
  plan: ReadingPlanDefinition,
  completedDays: number[]
): ReadingPlanDay {
  const next = plan.days.find((d) => !completedDays.includes(d.day));
  return next ?? plan.days[plan.days.length - 1]!;
}
