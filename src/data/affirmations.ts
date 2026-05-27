/**
 * Biblical affirmations — curated for the Christian affirmation niche.
 * Each entry pairs an "I am / God says" affirmation with a Scripture anchor.
 * TTS is used until pre-recorded narration is available.
 */

export type AffirmationCategory =
  | "identity"
  | "peace"
  | "strength"
  | "faith"
  | "healing"
  | "hope"
  | "love"
  | "gratitude";

export interface AffirmationEntry {
  id: string;
  category: AffirmationCategory;
  /** Translation key prefix; resolves to `${prefix}.title`, `${prefix}.body`. */
  i18nKey: string;
  /** Scripture reference shown alongside the affirmation (e.g. "Phil 4:13"). */
  reference: string;
  /** Estimated listen time in seconds (for TTS pacing UI). */
  durationSec: number;
}

export const AFFIRMATION_CATEGORIES: readonly AffirmationCategory[] = [
  "identity",
  "peace",
  "strength",
  "faith",
  "healing",
  "hope",
  "love",
  "gratitude",
];

export const AFFIRMATIONS: readonly AffirmationEntry[] = [
  {
    id: "identity-beloved",
    category: "identity",
    i18nKey: "affirmations.entries.identityBeloved",
    reference: "1 John 3:1",
    durationSec: 45,
  },
  {
    id: "identity-new-creation",
    category: "identity",
    i18nKey: "affirmations.entries.identityNewCreation",
    reference: "2 Cor 5:17",
    durationSec: 40,
  },
  {
    id: "peace-not-as-world",
    category: "peace",
    i18nKey: "affirmations.entries.peaceNotAsWorld",
    reference: "John 14:27",
    durationSec: 45,
  },
  {
    id: "peace-anxious-nothing",
    category: "peace",
    i18nKey: "affirmations.entries.peaceAnxiousNothing",
    reference: "Phil 4:6-7",
    durationSec: 55,
  },
  {
    id: "strength-can-do",
    category: "strength",
    i18nKey: "affirmations.entries.strengthCanDo",
    reference: "Phil 4:13",
    durationSec: 40,
  },
  {
    id: "strength-be-strong",
    category: "strength",
    i18nKey: "affirmations.entries.strengthBeStrong",
    reference: "Josh 1:9",
    durationSec: 50,
  },
  {
    id: "faith-mountains",
    category: "faith",
    i18nKey: "affirmations.entries.faithMountains",
    reference: "Matt 17:20",
    durationSec: 40,
  },
  {
    id: "healing-stripes",
    category: "healing",
    i18nKey: "affirmations.entries.healingStripes",
    reference: "Isa 53:5",
    durationSec: 45,
  },
  {
    id: "hope-future",
    category: "hope",
    i18nKey: "affirmations.entries.hopeFuture",
    reference: "Jer 29:11",
    durationSec: 50,
  },
  {
    id: "love-nothing-separate",
    category: "love",
    i18nKey: "affirmations.entries.loveNothingSeparate",
    reference: "Rom 8:38-39",
    durationSec: 55,
  },
  {
    id: "love-perfect-casts-out",
    category: "love",
    i18nKey: "affirmations.entries.lovePerfectCastsOut",
    reference: "1 John 4:18",
    durationSec: 40,
  },
  {
    id: "gratitude-every-good",
    category: "gratitude",
    i18nKey: "affirmations.entries.gratitudeEveryGood",
    reference: "Jas 1:17",
    durationSec: 40,
  },
  {
    id: "identity-chosen-royal",
    category: "identity",
    i18nKey: "affirmations.entries.identityChosenRoyal",
    reference: "1 Pet 2:9",
    durationSec: 45,
  },
  {
    id: "identity-temple",
    category: "identity",
    i18nKey: "affirmations.entries.identityTemple",
    reference: "1 Cor 6:19",
    durationSec: 45,
  },
  {
    id: "identity-image",
    category: "identity",
    i18nKey: "affirmations.entries.identityImage",
    reference: "Gen 1:27",
    durationSec: 40,
  },
  {
    id: "peace-cast-cares",
    category: "peace",
    i18nKey: "affirmations.entries.peaceCastCares",
    reference: "1 Pet 5:7",
    durationSec: 40,
  },
  {
    id: "peace-be-still",
    category: "peace",
    i18nKey: "affirmations.entries.peaceBeStill",
    reference: "Ps 46:10",
    durationSec: 45,
  },
  {
    id: "peace-shepherd",
    category: "peace",
    i18nKey: "affirmations.entries.peaceShepherd",
    reference: "Ps 23:1",
    durationSec: 50,
  },
  {
    id: "strength-refuge",
    category: "strength",
    i18nKey: "affirmations.entries.strengthRefuge",
    reference: "Ps 46:1",
    durationSec: 45,
  },
  {
    id: "strength-mount-wings",
    category: "strength",
    i18nKey: "affirmations.entries.strengthMountWings",
    reference: "Isa 40:31",
    durationSec: 55,
  },
  {
    id: "strength-more-than-conq",
    category: "strength",
    i18nKey: "affirmations.entries.strengthMoreThanConq",
    reference: "Rom 8:37",
    durationSec: 40,
  },
  {
    id: "faith-walk-by",
    category: "faith",
    i18nKey: "affirmations.entries.faithWalkBy",
    reference: "2 Cor 5:7",
    durationSec: 40,
  },
  {
    id: "faith-evidence",
    category: "faith",
    i18nKey: "affirmations.entries.faithEvidence",
    reference: "Heb 11:1",
    durationSec: 45,
  },
  {
    id: "faith-asks-receives",
    category: "faith",
    i18nKey: "affirmations.entries.faithAsksReceives",
    reference: "1 John 5:14",
    durationSec: 50,
  },
  {
    id: "faith-impossible-possible",
    category: "faith",
    i18nKey: "affirmations.entries.faithImpossiblePossible",
    reference: "Luke 1:37",
    durationSec: 40,
  },
  {
    id: "healing-restores-soul",
    category: "healing",
    i18nKey: "affirmations.entries.healingRestoresSoul",
    reference: "Ps 23:3",
    durationSec: 40,
  },
  {
    id: "healing-close-broken",
    category: "healing",
    i18nKey: "affirmations.entries.healingCloseBroken",
    reference: "Ps 34:18",
    durationSec: 50,
  },
  {
    id: "healing-physician",
    category: "healing",
    i18nKey: "affirmations.entries.healingPhysician",
    reference: "Matt 9:12",
    durationSec: 45,
  },
  {
    id: "healing-joy-morning",
    category: "healing",
    i18nKey: "affirmations.entries.healingJoyMorning",
    reference: "Ps 30:5",
    durationSec: 50,
  },
  {
    id: "hope-new-mornings",
    category: "hope",
    i18nKey: "affirmations.entries.hopeNewMornings",
    reference: "Lam 3:22-23",
    durationSec: 55,
  },
  {
    id: "hope-wait",
    category: "hope",
    i18nKey: "affirmations.entries.hopeWait",
    reference: "Ps 27:14",
    durationSec: 45,
  },
  {
    id: "hope-anchor",
    category: "hope",
    i18nKey: "affirmations.entries.hopeAnchor",
    reference: "Heb 6:19",
    durationSec: 45,
  },
  {
    id: "hope-beauty-ashes",
    category: "hope",
    i18nKey: "affirmations.entries.hopeBeautyAshes",
    reference: "Isa 61:3",
    durationSec: 50,
  },
  {
    id: "love-god-so-loved",
    category: "love",
    i18nKey: "affirmations.entries.loveGodSoLoved",
    reference: "John 3:16",
    durationSec: 50,
  },
  {
    id: "love-everlasting",
    category: "love",
    i18nKey: "affirmations.entries.loveEverlasting",
    reference: "Jer 31:3",
    durationSec: 45,
  },
  {
    id: "love-knows-name",
    category: "love",
    i18nKey: "affirmations.entries.loveKnowsName",
    reference: "Isa 43:1",
    durationSec: 50,
  },
  {
    id: "gratitude-give-thanks",
    category: "gratitude",
    i18nKey: "affirmations.entries.gratitudeGiveThanks",
    reference: "1 Thess 5:18",
    durationSec: 40,
  },
  {
    id: "gratitude-new-song",
    category: "gratitude",
    i18nKey: "affirmations.entries.gratitudeNewSong",
    reference: "Ps 40:3",
    durationSec: 45,
  },
  {
    id: "gratitude-abundant-life",
    category: "gratitude",
    i18nKey: "affirmations.entries.gratitudeAbundantLife",
    reference: "John 10:10",
    durationSec: 45,
  },
  {
    id: "gratitude-bless-soul",
    category: "gratitude",
    i18nKey: "affirmations.entries.gratitudeBlessSoul",
    reference: "Ps 103:2",
    durationSec: 50,
  },
];
