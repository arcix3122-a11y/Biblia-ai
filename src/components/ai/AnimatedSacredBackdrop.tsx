import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { colors } from "@/theme";

export function AnimatedSacredBackdrop() {
  const reducedMotion = useReducedMotion();
  const orbOne = useRef(new Animated.Value(0)).current;
  const orbTwo = useRef(new Animated.Value(0)).current;
  const orbThree = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) {
      orbOne.setValue(0.35);
      orbTwo.setValue(0.55);
      orbThree.setValue(0.15);
      return;
    }

    const makeLoop = (value: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration,
            useNativeDriver: true,
          }),
        ])
      );

    const animation = Animated.parallel([
      makeLoop(orbOne, 8200),
      makeLoop(orbTwo, 9800),
      makeLoop(orbThree, 11600),
    ]);

    animation.start();

    return () => {
      animation.stop();
    };
  }, [orbOne, orbThree, orbTwo, reducedMotion]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.base} />

      <Animated.View
        style={[
          styles.orb,
          styles.orbOne,
          {
            opacity: orbOne.interpolate({
              inputRange: [0, 1],
              outputRange: [0.18, 0.34],
            }),
            transform: [
              {
                translateX: orbOne.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-24, 24],
                }),
              },
              {
                translateY: orbOne.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-18, 12],
                }),
              },
              {
                scale: orbOne.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.92, 1.08],
                }),
              },
            ],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.orb,
          styles.orbTwo,
          {
            opacity: orbTwo.interpolate({
              inputRange: [0, 1],
              outputRange: [0.1, 0.24],
            }),
            transform: [
              {
                translateX: orbTwo.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, -20],
                }),
              },
              {
                translateY: orbTwo.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, -12],
                }),
              },
              {
                scale: orbTwo.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.88, 1.1],
                }),
              },
            ],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.orb,
          styles.orbThree,
          {
            opacity: orbThree.interpolate({
              inputRange: [0, 1],
              outputRange: [0.08, 0.18],
            }),
            transform: [
              {
                translateX: orbThree.interpolate({
                  inputRange: [0, 1],
                  outputRange: [14, -14],
                }),
              },
              {
                translateY: orbThree.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-10, 18],
                }),
              },
              {
                scale: orbThree.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1.04],
                }),
              },
            ],
          },
        ]}
      />

      <View style={styles.vignetteTop} />
      <View style={styles.vignetteBottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.canvas,
  },
  orb: {
    position: "absolute",
    borderRadius: 999,
  },
  orbOne: {
    width: 320,
    height: 320,
    top: -80,
    right: -50,
    backgroundColor: "rgba(229,169,60,0.45)",
  },
  orbTwo: {
    width: 280,
    height: 280,
    top: 140,
    left: -110,
    backgroundColor: "rgba(80,126,255,0.28)",
  },
  orbThree: {
    width: 240,
    height: 240,
    bottom: 180,
    right: -90,
    backgroundColor: "rgba(45,181,164,0.2)",
  },
  vignetteTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: "rgba(5,8,14,0.48)",
  },
  vignetteBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 260,
    backgroundColor: "rgba(0,0,0,0.52)",
  },
});
