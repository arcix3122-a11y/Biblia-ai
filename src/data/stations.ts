export interface StationVerseReference {
  bookSlug: string;
  chapter: number;
  verse: number;
}

export interface StationOfCross {
  number: number;
  titleKey: string;
  verseRefs: readonly StationVerseReference[];
}

export const STATION_TOTAL = 14;

export const STATIONS_OF_CROSS: readonly StationOfCross[] = [
  {
    number: 1,
    titleKey: "stations.items.station1.title",
    verseRefs: [
      { bookSlug: "matthew", chapter: 27, verse: 22 },
      { bookSlug: "isaiah", chapter: 53, verse: 3 },
    ],
  },
  {
    number: 2,
    titleKey: "stations.items.station2.title",
    verseRefs: [
      { bookSlug: "john", chapter: 19, verse: 17 },
      { bookSlug: "luke", chapter: 9, verse: 23 },
    ],
  },
  {
    number: 3,
    titleKey: "stations.items.station3.title",
    verseRefs: [
      { bookSlug: "isaiah", chapter: 53, verse: 4 },
      { bookSlug: "psalms", chapter: 38, verse: 4 },
    ],
  },
  {
    number: 4,
    titleKey: "stations.items.station4.title",
    verseRefs: [
      { bookSlug: "john", chapter: 19, verse: 25 },
      { bookSlug: "luke", chapter: 2, verse: 35 },
    ],
  },
  {
    number: 5,
    titleKey: "stations.items.station5.title",
    verseRefs: [
      { bookSlug: "mark", chapter: 15, verse: 21 },
      { bookSlug: "galatians", chapter: 6, verse: 2 },
    ],
  },
  {
    number: 6,
    titleKey: "stations.items.station6.title",
    verseRefs: [
      { bookSlug: "psalms", chapter: 27, verse: 8 },
      { bookSlug: "2-corinthians", chapter: 4, verse: 6 },
    ],
  },
  {
    number: 7,
    titleKey: "stations.items.station7.title",
    verseRefs: [
      { bookSlug: "psalms", chapter: 40, verse: 2 },
      { bookSlug: "isaiah", chapter: 53, verse: 5 },
    ],
  },
  {
    number: 8,
    titleKey: "stations.items.station8.title",
    verseRefs: [
      { bookSlug: "luke", chapter: 23, verse: 28 },
      { bookSlug: "lamentations", chapter: 3, verse: 31 },
    ],
  },
  {
    number: 9,
    titleKey: "stations.items.station9.title",
    verseRefs: [
      { bookSlug: "psalms", chapter: 22, verse: 14 },
      { bookSlug: "isaiah", chapter: 53, verse: 6 },
    ],
  },
  {
    number: 10,
    titleKey: "stations.items.station10.title",
    verseRefs: [
      { bookSlug: "john", chapter: 19, verse: 23 },
      { bookSlug: "psalms", chapter: 22, verse: 18 },
    ],
  },
  {
    number: 11,
    titleKey: "stations.items.station11.title",
    verseRefs: [
      { bookSlug: "luke", chapter: 23, verse: 33 },
      { bookSlug: "isaiah", chapter: 53, verse: 12 },
    ],
  },
  {
    number: 12,
    titleKey: "stations.items.station12.title",
    verseRefs: [
      { bookSlug: "john", chapter: 19, verse: 30 },
      { bookSlug: "psalms", chapter: 31, verse: 5 },
    ],
  },
  {
    number: 13,
    titleKey: "stations.items.station13.title",
    verseRefs: [
      { bookSlug: "john", chapter: 19, verse: 38 },
      { bookSlug: "mark", chapter: 15, verse: 46 },
    ],
  },
  {
    number: 14,
    titleKey: "stations.items.station14.title",
    verseRefs: [
      { bookSlug: "matthew", chapter: 27, verse: 59 },
      { bookSlug: "romans", chapter: 6, verse: 4 },
    ],
  },
] as const;

export function getStation(number: number): StationOfCross | undefined {
  return STATIONS_OF_CROSS.find((station) => station.number === number);
}