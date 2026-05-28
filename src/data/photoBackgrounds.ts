/**
 * Photo backgrounds for VOTD, hero cards, books, topics, and category tiles.
 * Uses Lorem Picsum (picsum.photos) seeded URLs — same seed always returns
 * the same photo, so categories stay visually consistent across launches.
 *
 * For production: replace with locally-bundled, licensed JPGs in
 * assets/photos/* and switch lookups to `require()` paths.
 */

import type { AffirmationCategory } from "./affirmations";
import { PLAN_BOOKS } from "./readingPlan";
import { SEMANTIC_TOPICS } from "./semanticTopics";

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

/** One stable seed per canonical Bible book (66 slugs from PLAN_BOOKS). */
const BOOK_PHOTO_SEEDS: Record<string, string> = Object.fromEntries(
  PLAN_BOOKS.map((book) => [book.slug, `biblia-book-${book.slug}`])
);

/** One stable seed per semantic topic tile. */
const TOPIC_PHOTO_SEEDS: Record<string, string> = Object.fromEntries(
  SEMANTIC_TOPICS.map((topic) => [topic.slug, `biblia-topic-${topic.slug}`])
);

/** Resolve a stable photo URL for any category key. */
export function getCategoryPhotoUrl(
  key: PhotoCategoryKey | string,
  width = 800,
  height = 1200
): string {
  const seed = PHOTO_SEEDS[key as PhotoCategoryKey] ?? `biblia-${key}`;
  return seededPhoto(seed, width, height);
}

/** Dedicated photo for a Bible book tile or chapter list header. */
export function getBookPhotoUrl(slug: string, width = 600, height = 600): string {
  const seed = BOOK_PHOTO_SEEDS[slug] ?? `biblia-book-${slug}`;
  return seededPhoto(seed, width, height);
}

/** Dedicated photo for a semantic topic tile. */
export function getTopicPhotoUrl(topic: string, width = 480, height = 480): string {
  const seed = TOPIC_PHOTO_SEEDS[topic] ?? `biblia-topic-${topic}`;
  return seededPhoto(seed, width, height);
}

/** Daily-rotated photo for Verse of the Day, full-bleed portrait landscape. */
export function getVotdPhotoUrl(width = 900, height = 1200): string {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86_400_000
  );

  const index = dayOfYear % 30;
  const seed = `biblia-votd-v2-${index + 1}`;
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
