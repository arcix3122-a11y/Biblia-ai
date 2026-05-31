export type RosarySetId = "joyful" | "luminous" | "sorrowful" | "glorious";

export interface RosaryVerseReference {
  bookSlug: string;
  chapter: number;
  verse: number;
}

export interface RosaryMystery {
  number: number;
  titleKey: string;
  verseRefs: readonly RosaryVerseReference[];
}

export interface RosarySet {
  id: RosarySetId;
  titleKey: string;
  subtitleKey: string;
  mysteries: readonly RosaryMystery[];
}

export const ROSARY_TOTAL_DECADES = 5;
export const ROSARY_SETS: readonly RosarySet[] = [
  {
    id: "joyful",
    titleKey: "rosary.sets.joyful.title",
    subtitleKey: "rosary.sets.joyful.subtitle",
    mysteries: [
      { number: 1, titleKey: "rosary.mysteries.joyful.annunciation", verseRefs: [{ bookSlug: "luke", chapter: 1, verse: 38 }, { bookSlug: "luke", chapter: 1, verse: 46 }] },
      { number: 2, titleKey: "rosary.mysteries.joyful.visitation", verseRefs: [{ bookSlug: "luke", chapter: 1, verse: 41 }, { bookSlug: "luke", chapter: 1, verse: 45 }] },
      { number: 3, titleKey: "rosary.mysteries.joyful.nativity", verseRefs: [{ bookSlug: "luke", chapter: 2, verse: 11 }, { bookSlug: "luke", chapter: 2, verse: 14 }] },
      { number: 4, titleKey: "rosary.mysteries.joyful.presentation", verseRefs: [{ bookSlug: "luke", chapter: 2, verse: 22 }, { bookSlug: "luke", chapter: 2, verse: 29 }] },
      { number: 5, titleKey: "rosary.mysteries.joyful.findingInTemple", verseRefs: [{ bookSlug: "luke", chapter: 2, verse: 49 }, { bookSlug: "luke", chapter: 2, verse: 52 }] },
    ],
  },
  {
    id: "luminous",
    titleKey: "rosary.sets.luminous.title",
    subtitleKey: "rosary.sets.luminous.subtitle",
    mysteries: [
      { number: 1, titleKey: "rosary.mysteries.luminous.baptism", verseRefs: [{ bookSlug: "matthew", chapter: 3, verse: 16 }, { bookSlug: "mark", chapter: 1, verse: 11 }] },
      { number: 2, titleKey: "rosary.mysteries.luminous.cana", verseRefs: [{ bookSlug: "john", chapter: 2, verse: 5 }, { bookSlug: "john", chapter: 2, verse: 11 }] },
      { number: 3, titleKey: "rosary.mysteries.luminous.proclamation", verseRefs: [{ bookSlug: "mark", chapter: 1, verse: 15 }, { bookSlug: "luke", chapter: 4, verse: 18 }] },
      { number: 4, titleKey: "rosary.mysteries.luminous.transfiguration", verseRefs: [{ bookSlug: "matthew", chapter: 17, verse: 2 }, { bookSlug: "luke", chapter: 9, verse: 35 }] },
      { number: 5, titleKey: "rosary.mysteries.luminous.eucharist", verseRefs: [{ bookSlug: "luke", chapter: 22, verse: 19 }, { bookSlug: "1-corinthians", chapter: 11, verse: 26 }] },
    ],
  },
  {
    id: "sorrowful",
    titleKey: "rosary.sets.sorrowful.title",
    subtitleKey: "rosary.sets.sorrowful.subtitle",
    mysteries: [
      { number: 1, titleKey: "rosary.mysteries.sorrowful.agony", verseRefs: [{ bookSlug: "matthew", chapter: 26, verse: 39 }, { bookSlug: "luke", chapter: 22, verse: 44 }] },
      { number: 2, titleKey: "rosary.mysteries.sorrowful.scourging", verseRefs: [{ bookSlug: "john", chapter: 19, verse: 1 }, { bookSlug: "isaiah", chapter: 53, verse: 5 }] },
      { number: 3, titleKey: "rosary.mysteries.sorrowful.crowning", verseRefs: [{ bookSlug: "matthew", chapter: 27, verse: 29 }, { bookSlug: "mark", chapter: 15, verse: 17 }] },
      { number: 4, titleKey: "rosary.mysteries.sorrowful.carrying", verseRefs: [{ bookSlug: "luke", chapter: 23, verse: 26 }, { bookSlug: "matthew", chapter: 16, verse: 24 }] },
      { number: 5, titleKey: "rosary.mysteries.sorrowful.crucifixion", verseRefs: [{ bookSlug: "luke", chapter: 23, verse: 46 }, { bookSlug: "john", chapter: 19, verse: 30 }] },
    ],
  },
  {
    id: "glorious",
    titleKey: "rosary.sets.glorious.title",
    subtitleKey: "rosary.sets.glorious.subtitle",
    mysteries: [
      { number: 1, titleKey: "rosary.mysteries.glorious.resurrection", verseRefs: [{ bookSlug: "matthew", chapter: 28, verse: 6 }, { bookSlug: "john", chapter: 20, verse: 18 }] },
      { number: 2, titleKey: "rosary.mysteries.glorious.ascension", verseRefs: [{ bookSlug: "acts", chapter: 1, verse: 9 }, { bookSlug: "mark", chapter: 16, verse: 19 }] },
      { number: 3, titleKey: "rosary.mysteries.glorious.descent", verseRefs: [{ bookSlug: "acts", chapter: 2, verse: 4 }, { bookSlug: "acts", chapter: 2, verse: 17 }] },
      { number: 4, titleKey: "rosary.mysteries.glorious.assumption", verseRefs: [{ bookSlug: "luke", chapter: 1, verse: 48 }, { bookSlug: "revelation", chapter: 12, verse: 1 }] },
      { number: 5, titleKey: "rosary.mysteries.glorious.coronation", verseRefs: [{ bookSlug: "psalms", chapter: 45, verse: 9 }, { bookSlug: "revelation", chapter: 12, verse: 10 }] },
    ],
  },
] as const;

export function getRosarySet(setId: RosarySetId): RosarySet | undefined {
  return ROSARY_SETS.find((set) => set.id === setId);
}