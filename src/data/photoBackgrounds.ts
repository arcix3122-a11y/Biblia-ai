/**
 * Photo backgrounds for VOTD, hero cards, and category tiles.
 * Uses Lorem Picsum (picsum.photos) seeded URLs — same seed always returns
 * the same photo, so categories stay visually consistent across launches.
 *
 * For production: replace with locally-bundled, licensed JPGs in
 * assets/photos/* and switch lookups to `require()` paths.
 */

import type { AffirmationCategory } from "./affirmations";

const PICSUM = "https://picsum.photos";

/** Stable seed → stable photo on Picsum. */
function seededPhoto(seed: string, width: number, height: number): string {
  return `${PICSUM}/seed/${encodeURIComponent(seed)}/${width}/${height}`;
}

/** All photo category keys used across the app. */
export type PhotoCategoryKey =
  | "votd"
  | "continueReading"
  | "companion"
  | "aiChat"
  | "readingPlan"
  | "guidedPrayer"
  | "discoverAffirmations"
  | "discoverCompanion"
  | "guidedMeditation"
  | "guidedSilence"
  | "dailyPractice"
  | AffirmationCategory;

const PHOTO_SEEDS: Record<PhotoCategoryKey, string> = {
  votd: "biblia-votd-landscape",
  continueReading: "biblia-continue-path",
  companion: "biblia-companion-soft",
  aiChat: "biblia-ai-chat-light",
  readingPlan: "biblia-plan-dawn",
  guidedPrayer: "biblia-prayer-hands",
  discoverAffirmations: "biblia-discover-affirm",
  discoverCompanion: "biblia-discover-companion",
  guidedMeditation: "biblia-meditation-calm",
  guidedSilence: "biblia-silence-mist",
  dailyPractice: "biblia-daily-practice",
  identity: "affirm-identity",
  peace: "affirm-peace",
  strength: "affirm-strength",
  faith: "affirm-faith",
  healing: "affirm-healing",
  hope: "affirm-hope",
  love: "affirm-love",
  gratitude: "affirm-gratitude",
};

/** Resolve a stable photo URL for any category key. */
export function getCategoryPhotoUrl(
  key: PhotoCategoryKey | string,
  width = 800,
  height = 1200
): string {
  const seed = PHOTO_SEEDS[key as PhotoCategoryKey] ?? `biblia-${key}`;
  return seededPhoto(seed, width, height);
}

/** Daily-rotated photo for Verse of the Day, full-bleed portrait landscape. */
export function getVotdPhotoUrl(width = 900, height = 1200): string {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86_400_000
  );
  const set = [
    "biblia-votd-1",
    "biblia-votd-2",
    "biblia-votd-3",
    "biblia-votd-4",
    "biblia-votd-5",
    "biblia-votd-6",
    "biblia-votd-7",
  ];
  const seed = set[dayOfYear % set.length];
  return seededPhoto(seed, width, height);
}

/** Home action-tile photos (one per tile, hand-picked seeds). */
export const HOME_TILE_PHOTOS = {
  affirmations: getCategoryPhotoUrl("discoverAffirmations", 600, 600),
  companion: getCategoryPhotoUrl("discoverCompanion", 600, 600),
  plan: getCategoryPhotoUrl("readingPlan", 600, 600),
  prayer: getCategoryPhotoUrl("guidedPrayer", 600, 600),
  stats: seededPhoto("biblia-stats-calm", 600, 600),
} as const;
