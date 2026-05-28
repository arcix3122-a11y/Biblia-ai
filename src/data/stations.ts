export interface StationVerseReference {
  bookSlug: string;
  chapter: number;
  verse: number;
}

export interface StationOfCross {
  number: number;
  title: string;
  verseRefs: readonly StationVerseReference[];
}

export const STATION_TOTAL = 14;

export const STATIONS_OF_CROSS: readonly StationOfCross[] = [
  {
    number: 1,
    title: "Jesus is condemned to death",
    verseRefs: [
      { bookSlug: "matthew", chapter: 27, verse: 22 },
      { bookSlug: "isaiah", chapter: 53, verse: 3 },
    ],
  },
  {
    number: 2,
    title: "Jesus takes up His cross",
    verseRefs: [
      { bookSlug: "john", chapter: 19, verse: 17 },
      { bookSlug: "luke", chapter: 9, verse: 23 },
    ],
  },
  {
    number: 3,
    title: "Jesus falls the first time",
    verseRefs: [
      { bookSlug: "isaiah", chapter: 53, verse: 4 },
      { bookSlug: "psalms", chapter: 38, verse: 4 },
    ],
  },
  {
    number: 4,
    title: "Jesus meets His mother",
    verseRefs: [
      { bookSlug: "john", chapter: 19, verse: 25 },
      { bookSlug: "luke", chapter: 2, verse: 35 },
    ],
  },
  {
    number: 5,
    title: "Simon helps carry the cross",
    verseRefs: [
      { bookSlug: "mark", chapter: 15, verse: 21 },
      { bookSlug: "galatians", chapter: 6, verse: 2 },
    ],
  },
  {
    number: 6,
    title: "Veronica wipes the face of Jesus",
    verseRefs: [
      { bookSlug: "psalms", chapter: 27, verse: 8 },
      { bookSlug: "2-corinthians", chapter: 4, verse: 6 },
    ],
  },
  {
    number: 7,
    title: "Jesus falls the second time",
    verseRefs: [
      { bookSlug: "psalms", chapter: 40, verse: 2 },
      { bookSlug: "isaiah", chapter: 53, verse: 5 },
    ],
  },
  {
    number: 8,
    title: "Jesus meets the women of Jerusalem",
    verseRefs: [
      { bookSlug: "luke", chapter: 23, verse: 28 },
      { bookSlug: "lamentations", chapter: 3, verse: 31 },
    ],
  },
  {
    number: 9,
    title: "Jesus falls the third time",
    verseRefs: [
      { bookSlug: "psalms", chapter: 22, verse: 14 },
      { bookSlug: "isaiah", chapter: 53, verse: 6 },
    ],
  },
  {
    number: 10,
    title: "Jesus is stripped of His garments",
    verseRefs: [
      { bookSlug: "john", chapter: 19, verse: 23 },
      { bookSlug: "psalms", chapter: 22, verse: 18 },
    ],
  },
  {
    number: 11,
    title: "Jesus is nailed to the cross",
    verseRefs: [
      { bookSlug: "luke", chapter: 23, verse: 33 },
      { bookSlug: "isaiah", chapter: 53, verse: 12 },
    ],
  },
  {
    number: 12,
    title: "Jesus dies on the cross",
    verseRefs: [
      { bookSlug: "john", chapter: 19, verse: 30 },
      { bookSlug: "psalms", chapter: 31, verse: 5 },
    ],
  },
  {
    number: 13,
    title: "Jesus is taken down from the cross",
    verseRefs: [
      { bookSlug: "john", chapter: 19, verse: 38 },
      { bookSlug: "mark", chapter: 15, verse: 46 },
    ],
  },
  {
    number: 14,
    title: "Jesus is laid in the tomb",
    verseRefs: [
      { bookSlug: "matthew", chapter: 27, verse: 59 },
      { bookSlug: "romans", chapter: 6, verse: 4 },
    ],
  },
] as const;

export function getStation(number: number): StationOfCross | undefined {
  return STATIONS_OF_CROSS.find((station) => station.number === number);
}