import type { PhotoCategoryKey } from "./photoBackgrounds";

export type DailyPracticeId =
  | "breath"
  | "gratitude"
  | "scripture"
  | "silence"
  | "service"
  | "trust"
  | "rest";

export interface DailyPracticeDefinition {
  id: DailyPracticeId;
  titleKey: `home.dailyPractice.themes.${DailyPracticeId}.title`;
  promptKey: `home.dailyPractice.themes.${DailyPracticeId}.prompt`;
  stepKeys: readonly [
    `home.dailyPractice.themes.${DailyPracticeId}.step1`,
    `home.dailyPractice.themes.${DailyPracticeId}.step2`,
    `home.dailyPractice.themes.${DailyPracticeId}.step3`,
  ];
  minutes: number;
  photoKey: PhotoCategoryKey;
}

export const DAILY_PRACTICES: readonly DailyPracticeDefinition[] = [
  {
    id: "breath",
    titleKey: "home.dailyPractice.themes.breath.title",
    promptKey: "home.dailyPractice.themes.breath.prompt",
    stepKeys: [
      "home.dailyPractice.themes.breath.step1",
      "home.dailyPractice.themes.breath.step2",
      "home.dailyPractice.themes.breath.step3",
    ],
    minutes: 3,
    photoKey: "guidedMeditation",
  },
  {
    id: "gratitude",
    titleKey: "home.dailyPractice.themes.gratitude.title",
    promptKey: "home.dailyPractice.themes.gratitude.prompt",
    stepKeys: [
      "home.dailyPractice.themes.gratitude.step1",
      "home.dailyPractice.themes.gratitude.step2",
      "home.dailyPractice.themes.gratitude.step3",
    ],
    minutes: 4,
    photoKey: "discoverAffirmations",
  },
  {
    id: "scripture",
    titleKey: "home.dailyPractice.themes.scripture.title",
    promptKey: "home.dailyPractice.themes.scripture.prompt",
    stepKeys: [
      "home.dailyPractice.themes.scripture.step1",
      "home.dailyPractice.themes.scripture.step2",
      "home.dailyPractice.themes.scripture.step3",
    ],
    minutes: 5,
    photoKey: "continueReading",
  },
  {
    id: "silence",
    titleKey: "home.dailyPractice.themes.silence.title",
    promptKey: "home.dailyPractice.themes.silence.prompt",
    stepKeys: [
      "home.dailyPractice.themes.silence.step1",
      "home.dailyPractice.themes.silence.step2",
      "home.dailyPractice.themes.silence.step3",
    ],
    minutes: 4,
    photoKey: "guidedSilence",
  },
  {
    id: "service",
    titleKey: "home.dailyPractice.themes.service.title",
    promptKey: "home.dailyPractice.themes.service.prompt",
    stepKeys: [
      "home.dailyPractice.themes.service.step1",
      "home.dailyPractice.themes.service.step2",
      "home.dailyPractice.themes.service.step3",
    ],
    minutes: 5,
    photoKey: "guidedPrayer",
  },
  {
    id: "trust",
    titleKey: "home.dailyPractice.themes.trust.title",
    promptKey: "home.dailyPractice.themes.trust.prompt",
    stepKeys: [
      "home.dailyPractice.themes.trust.step1",
      "home.dailyPractice.themes.trust.step2",
      "home.dailyPractice.themes.trust.step3",
    ],
    minutes: 4,
    photoKey: "readingPlan",
  },
  {
    id: "rest",
    titleKey: "home.dailyPractice.themes.rest.title",
    promptKey: "home.dailyPractice.themes.rest.prompt",
    stepKeys: [
      "home.dailyPractice.themes.rest.step1",
      "home.dailyPractice.themes.rest.step2",
      "home.dailyPractice.themes.rest.step3",
    ],
    minutes: 3,
    photoKey: "dailyPractice",
  },
] as const;

/** Stable daily rotation — same practice for everyone on the same calendar day. */
export function getDailyPracticeForDate(date = new Date()): DailyPracticeDefinition {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86_400_000
  );
  return DAILY_PRACTICES[dayOfYear % DAILY_PRACTICES.length];
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
