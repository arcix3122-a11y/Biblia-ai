import type { PracticeId } from "@/data/practices";
import { useFastingPlanStore } from "@/store/fastingPlanStore";
import { useRosaryStore } from "@/store/rosaryStore";
import { useStationsStore } from "@/store/stationsStore";

/** Current step/day index to embed in practice completion share links. */
export function getPracticeShareDay(practiceId: PracticeId): number {
  switch (practiceId) {
    case "fasting":
      return Math.max(1, useFastingPlanStore.getState().getCurrentDay());
    case "stations":
      return Math.max(1, useStationsStore.getState().getCurrentStation());
    case "rosary":
      return Math.max(1, useRosaryStore.getState().currentDecade + 1);
    default:
      return 1;
  }
}
