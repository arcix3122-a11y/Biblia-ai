import { FASTING_PLAN, FASTING_TOTAL_DAYS } from "@/data/fastingPlan";
import { ROSARY_SETS, ROSARY_TOTAL_DECADES } from "@/data/rosary";
import { STATIONS_OF_CROSS, STATION_TOTAL } from "@/data/stations";
import type { PhotoCategoryKey } from "@/data/photoBackgrounds";

export type PracticeId = "fasting" | "stations" | "rosary";

export type PracticeCategoryId = "lent" | "devotion" | "prayer";

export type PracticeTitleKey =
  | "practices.items.fasting.title"
  | "practices.items.stations.title"
  | "practices.items.rosary.title";

export type PracticeSubtitleKey =
  | "practices.items.fasting.subtitle"
  | "practices.items.stations.subtitle"
  | "practices.items.rosary.subtitle";

export type PracticeDescriptionKey =
  | "practices.items.fasting.description"
  | "practices.items.stations.description"
  | "practices.items.rosary.description";

export type PracticeCategoryLabelKey =
  | "practices.categories.lent"
  | "practices.categories.devotion"
  | "practices.categories.prayer";

export interface PracticeStepPreview {
  index: number;
  titleKey: string;
}

export interface PracticeDefinition {
  id: PracticeId;
  category: PracticeCategoryId;
  categoryLabelKey: PracticeCategoryLabelKey;
  titleKey: PracticeTitleKey;
  subtitleKey: PracticeSubtitleKey;
  descriptionKey: PracticeDescriptionKey;
  imageCategory: PhotoCategoryKey;
  stepCount: number;
  durationMinutes: number;
  beadsPerDecade?: number;
  legacyRoute: `/fasting` | `/stations` | `/rosary`;
}

export const PRACTICE_IDS: readonly PracticeId[] = ["fasting", "stations", "rosary"] as const;

export const PRACTICES: readonly PracticeDefinition[] = [
  {
    id: "fasting",
    category: "lent",
    categoryLabelKey: "practices.categories.lent",
    titleKey: "practices.items.fasting.title",
    subtitleKey: "practices.items.fasting.subtitle",
    descriptionKey: "practices.items.fasting.description",
    imageCategory: "guidedMeditation",
    stepCount: FASTING_TOTAL_DAYS,
    durationMinutes: 40,
    legacyRoute: "/fasting",
  },
  {
    id: "stations",
    category: "devotion",
    categoryLabelKey: "practices.categories.devotion",
    titleKey: "practices.items.stations.title",
    subtitleKey: "practices.items.stations.subtitle",
    descriptionKey: "practices.items.stations.description",
    imageCategory: "guidedPrayer",
    stepCount: STATION_TOTAL,
    durationMinutes: 45,
    legacyRoute: "/stations",
  },
  {
    id: "rosary",
    category: "prayer",
    categoryLabelKey: "practices.categories.prayer",
    titleKey: "practices.items.rosary.title",
    subtitleKey: "practices.items.rosary.subtitle",
    descriptionKey: "practices.items.rosary.description",
    imageCategory: "guidedSilence",
    stepCount: ROSARY_TOTAL_DECADES,
    durationMinutes: 25,
    beadsPerDecade: 10,
    legacyRoute: "/rosary",
  },
] as const;

const PRACTICE_BY_ID = new Map(PRACTICES.map((practice) => [practice.id, practice]));

export function getPractice(id: string | undefined): PracticeDefinition | undefined {
  if (!id) {
    return undefined;
  }
  return PRACTICE_BY_ID.get(id as PracticeId);
}

export function isPracticeId(id: string | undefined): id is PracticeId {
  return Boolean(id && PRACTICE_BY_ID.has(id as PracticeId));
}

export function getPracticeStepPreviews(practiceId: PracticeId): readonly PracticeStepPreview[] {
  switch (practiceId) {
    case "fasting":
      return FASTING_PLAN.map((day) => ({
        index: day.day,
        titleKey: `practices.steps.fasting.day`,
      }));
    case "stations":
      return STATIONS_OF_CROSS.map((station) => ({
        index: station.number,
        titleKey: `practices.steps.stations.station`,
      }));
    case "rosary":
      return ROSARY_SETS[0]!.mysteries.map((mystery, index) => ({
        index: index + 1,
        titleKey: `practices.steps.rosary.decade`,
      }));
    default:
      return [];
  }
}
