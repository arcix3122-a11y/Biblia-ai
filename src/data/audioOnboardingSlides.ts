import type { ImageSourcePropType } from "react-native";
import { AUDIO_ONBOARDING_IMAGES } from "@/data/audioOnboardingImages";

export type AudioOnboardingHeroKey = "slide1" | "slide2" | "slide3";

export type AudioOnboardingSlideKind = "hero" | "premium";

export interface AudioOnboardingSlideConfig {
  id: number;
  kind: AudioOnboardingSlideKind;
  heroKey?: AudioOnboardingHeroKey;
  backgroundVariant: 0 | 1 | 2;
  image: ImageSourcePropType;
  estimatedDurationMs: number;
}

const HERO_DURATION_MS = 45_000;
const PREMIUM_DURATION_MS = 18_000;

function heroKeyForSlide(id: number): AudioOnboardingHeroKey | undefined {
  if (id === 1) return "slide1";
  if (id === 2) return "slide2";
  if (id === 3) return "slide3";
  return undefined;
}

export const AUDIO_ONBOARDING_SLIDE_COUNT = 100;

export const AUDIO_ONBOARDING_SLIDES: readonly AudioOnboardingSlideConfig[] = Array.from(
  { length: AUDIO_ONBOARDING_SLIDE_COUNT },
  (_, index) => {
    const id = index + 1;
    const heroKey = heroKeyForSlide(id);
    return {
      id,
      kind: heroKey ? "hero" : "premium",
      heroKey,
      backgroundVariant: (index % 3) as 0 | 1 | 2,
      image: AUDIO_ONBOARDING_IMAGES[index] ?? AUDIO_ONBOARDING_IMAGES[0],
      estimatedDurationMs: heroKey ? HERO_DURATION_MS : PREMIUM_DURATION_MS,
    };
  }
);
