import { Easing } from "react-native";

export const animations = {
  immersiveFade: {
    duration: 280,
    easing: Easing.out(Easing.cubic),
  },
  screenTransition: {
    duration: 320,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  },
  micro: {
    duration: 160,
    easing: Easing.out(Easing.quad),
  },
  spring: {
    damping: 18,
    stiffness: 180,
  },
} as const;
