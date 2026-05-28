export type RosarySetId = "joyful" | "luminous" | "sorrowful" | "glorious";

export interface RosaryVerseReference {
  bookSlug: string;
  chapter: number;
  verse: number;
}

export interface RosaryMystery {
  number: number;
  title: string;
  verseRefs: readonly RosaryVerseReference[];
}

export interface RosarySet {
  id: RosarySetId;
  title: string;
  subtitle: string;
  mysteries: readonly RosaryMystery[];
}

export const ROSARY_TOTAL_DECADES = 5;
export const ROSARY_SETS: readonly RosarySet[] = [
  {
    id: "joyful",
    title: "Joyful Mysteries",
    subtitle: "A path of humility, obedience, and quiet joy.",
    mysteries: [
      { number: 1, title: "The Annunciation", verseRefs: [{ bookSlug: "luke", chapter: 1, verse: 38 }, { bookSlug: "luke", chapter: 1, verse: 46 }] },
      { number: 2, title: "The Visitation", verseRefs: [{ bookSlug: "luke", chapter: 1, verse: 41 }, { bookSlug: "luke", chapter: 1, verse: 45 }] },
      { number: 3, title: "The Nativity", verseRefs: [{ bookSlug: "luke", chapter: 2, verse: 11 }, { bookSlug: "luke", chapter: 2, verse: 14 }] },
      { number: 4, title: "The Presentation", verseRefs: [{ bookSlug: "luke", chapter: 2, verse: 22 }, { bookSlug: "luke", chapter: 2, verse: 29 }] },
      { number: 5, title: "The Finding in the Temple", verseRefs: [{ bookSlug: "luke", chapter: 2, verse: 49 }, { bookSlug: "luke", chapter: 2, verse: 52 }] },
    ],
  },
  {
    id: "luminous",
    title: "Luminous Mysteries",
    subtitle: "A path of revelation, mission, and the light of Christ.",
    mysteries: [
      { number: 1, title: "The Baptism in the Jordan", verseRefs: [{ bookSlug: "matthew", chapter: 3, verse: 16 }, { bookSlug: "mark", chapter: 1, verse: 11 }] },
      { number: 2, title: "The Wedding at Cana", verseRefs: [{ bookSlug: "john", chapter: 2, verse: 5 }, { bookSlug: "john", chapter: 2, verse: 11 }] },
      { number: 3, title: "The Proclamation of the Kingdom", verseRefs: [{ bookSlug: "mark", chapter: 1, verse: 15 }, { bookSlug: "luke", chapter: 4, verse: 18 }] },
      { number: 4, title: "The Transfiguration", verseRefs: [{ bookSlug: "matthew", chapter: 17, verse: 2 }, { bookSlug: "luke", chapter: 9, verse: 35 }] },
      { number: 5, title: "The Institution of the Eucharist", verseRefs: [{ bookSlug: "luke", chapter: 22, verse: 19 }, { bookSlug: "1-corinthians", chapter: 11, verse: 26 }] },
    ],
  },
  {
    id: "sorrowful",
    title: "Sorrowful Mysteries",
    subtitle: "A path of surrender through pain, loss, and redemption.",
    mysteries: [
      { number: 1, title: "The Agony in the Garden", verseRefs: [{ bookSlug: "matthew", chapter: 26, verse: 39 }, { bookSlug: "luke", chapter: 22, verse: 44 }] },
      { number: 2, title: "The Scourging at the Pillar", verseRefs: [{ bookSlug: "john", chapter: 19, verse: 1 }, { bookSlug: "isaiah", chapter: 53, verse: 5 }] },
      { number: 3, title: "The Crowning with Thorns", verseRefs: [{ bookSlug: "matthew", chapter: 27, verse: 29 }, { bookSlug: "mark", chapter: 15, verse: 17 }] },
      { number: 4, title: "The Carrying of the Cross", verseRefs: [{ bookSlug: "luke", chapter: 23, verse: 26 }, { bookSlug: "matthew", chapter: 16, verse: 24 }] },
      { number: 5, title: "The Crucifixion", verseRefs: [{ bookSlug: "luke", chapter: 23, verse: 46 }, { bookSlug: "john", chapter: 19, verse: 30 }] },
    ],
  },
  {
    id: "glorious",
    title: "Glorious Mysteries",
    subtitle: "A path of hope, victory, and new creation.",
    mysteries: [
      { number: 1, title: "The Resurrection", verseRefs: [{ bookSlug: "matthew", chapter: 28, verse: 6 }, { bookSlug: "john", chapter: 20, verse: 18 }] },
      { number: 2, title: "The Ascension", verseRefs: [{ bookSlug: "acts", chapter: 1, verse: 9 }, { bookSlug: "mark", chapter: 16, verse: 19 }] },
      { number: 3, title: "The Descent of the Holy Spirit", verseRefs: [{ bookSlug: "acts", chapter: 2, verse: 4 }, { bookSlug: "acts", chapter: 2, verse: 17 }] },
      { number: 4, title: "The Assumption", verseRefs: [{ bookSlug: "luke", chapter: 1, verse: 48 }, { bookSlug: "revelation", chapter: 12, verse: 1 }] },
      { number: 5, title: "The Coronation of Mary", verseRefs: [{ bookSlug: "psalms", chapter: 45, verse: 9 }, { bookSlug: "revelation", chapter: 12, verse: 10 }] },
    ],
  },
] as const;

export function getRosarySet(setId: RosarySetId): RosarySet | undefined {
  return ROSARY_SETS.find((set) => set.id === setId);
}