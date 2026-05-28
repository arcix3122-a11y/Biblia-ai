export type FastingThemeId =
  | "surrender"
  | "hunger"
  | "silence"
  | "repentance"
  | "trust"
  | "mercy"
  | "endurance"
  | "joy";

export type FastingThemeTitleKey =
  | "fasting.themes.surrender.title"
  | "fasting.themes.hunger.title"
  | "fasting.themes.silence.title"
  | "fasting.themes.repentance.title"
  | "fasting.themes.trust.title"
  | "fasting.themes.mercy.title"
  | "fasting.themes.endurance.title"
  | "fasting.themes.joy.title";

export type FastingThemeSubtitleKey =
  | "fasting.themes.surrender.subtitle"
  | "fasting.themes.hunger.subtitle"
  | "fasting.themes.silence.subtitle"
  | "fasting.themes.repentance.subtitle"
  | "fasting.themes.trust.subtitle"
  | "fasting.themes.mercy.subtitle"
  | "fasting.themes.endurance.subtitle"
  | "fasting.themes.joy.subtitle";

export interface FastingVerseReference {
  bookSlug: string;
  chapter: number;
  verse: number;
}

export interface FastingThemeDefinition {
  id: FastingThemeId;
  titleKey: FastingThemeTitleKey;
  subtitleKey: FastingThemeSubtitleKey;
  verseRefs: readonly FastingVerseReference[];
}

export interface FastingDayPlan {
  day: number;
  week: number;
  themeId: FastingThemeId;
  verseRefs: readonly FastingVerseReference[];
}

export const FASTING_TOTAL_DAYS = 40;
export const FASTING_WEEK_LENGTH = 8;

export const FASTING_THEMES: readonly FastingThemeDefinition[] = [
  {
    id: "surrender",
    titleKey: "fasting.themes.surrender.title",
    subtitleKey: "fasting.themes.surrender.subtitle",
    verseRefs: [
      { bookSlug: "matthew", chapter: 6, verse: 33 },
      { bookSlug: "psalms", chapter: 46, verse: 10 },
      { bookSlug: "luke", chapter: 9, verse: 23 },
    ],
  },
  {
    id: "hunger",
    titleKey: "fasting.themes.hunger.title",
    subtitleKey: "fasting.themes.hunger.subtitle",
    verseRefs: [
      { bookSlug: "matthew", chapter: 4, verse: 4 },
      { bookSlug: "psalms", chapter: 63, verse: 1 },
      { bookSlug: "john", chapter: 6, verse: 35 },
    ],
  },
  {
    id: "silence",
    titleKey: "fasting.themes.silence.title",
    subtitleKey: "fasting.themes.silence.subtitle",
    verseRefs: [
      { bookSlug: "psalms", chapter: 62, verse: 1 },
      { bookSlug: "lamentations", chapter: 3, verse: 25 },
      { bookSlug: "james", chapter: 1, verse: 19 },
    ],
  },
  {
    id: "repentance",
    titleKey: "fasting.themes.repentance.title",
    subtitleKey: "fasting.themes.repentance.subtitle",
    verseRefs: [
      { bookSlug: "psalms", chapter: 51, verse: 10 },
      { bookSlug: "joel", chapter: 2, verse: 13 },
      { bookSlug: "1-john", chapter: 1, verse: 9 },
    ],
  },
  {
    id: "trust",
    titleKey: "fasting.themes.trust.title",
    subtitleKey: "fasting.themes.trust.subtitle",
    verseRefs: [
      { bookSlug: "proverbs", chapter: 3, verse: 5 },
      { bookSlug: "isaiah", chapter: 26, verse: 3 },
      { bookSlug: "romans", chapter: 8, verse: 28 },
    ],
  },
  {
    id: "mercy",
    titleKey: "fasting.themes.mercy.title",
    subtitleKey: "fasting.themes.mercy.subtitle",
    verseRefs: [
      { bookSlug: "hebrews", chapter: 4, verse: 16 },
      { bookSlug: "psalms", chapter: 103, verse: 8 },
      { bookSlug: "lamentations", chapter: 3, verse: 22 },
    ],
  },
  {
    id: "endurance",
    titleKey: "fasting.themes.endurance.title",
    subtitleKey: "fasting.themes.endurance.subtitle",
    verseRefs: [
      { bookSlug: "galatians", chapter: 6, verse: 9 },
      { bookSlug: "james", chapter: 1, verse: 12 },
      { bookSlug: "hebrews", chapter: 12, verse: 1 },
    ],
  },
  {
    id: "joy",
    titleKey: "fasting.themes.joy.title",
    subtitleKey: "fasting.themes.joy.subtitle",
    verseRefs: [
      { bookSlug: "nehemiah", chapter: 8, verse: 10 },
      { bookSlug: "philippians", chapter: 4, verse: 4 },
      { bookSlug: "psalms", chapter: 16, verse: 11 },
    ],
  },
] as const;

const FASTING_THEME_BY_ID = new Map(FASTING_THEMES.map((theme) => [theme.id, theme]));

export const FASTING_PLAN: readonly FastingDayPlan[] = Array.from(
  { length: FASTING_TOTAL_DAYS },
  (_, index) => {
    const day = index + 1;
    const week = Math.floor(index / FASTING_WEEK_LENGTH) + 1;
    const theme = FASTING_THEMES[index % FASTING_THEMES.length]!;

    return {
      day,
      week,
      themeId: theme.id,
      verseRefs: theme.verseRefs,
    };
  }
);

export function getFastingTheme(themeId: FastingThemeId): FastingThemeDefinition | undefined {
  return FASTING_THEME_BY_ID.get(themeId);
}

export function getFastingDayPlan(day: number): FastingDayPlan | undefined {
  if (day < 1 || day > FASTING_TOTAL_DAYS) {
    return undefined;
  }

  return FASTING_PLAN[day - 1];
}