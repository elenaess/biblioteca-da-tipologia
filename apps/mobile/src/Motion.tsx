import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  type PressableProps,
} from "react-native";

const ReducedMotion = createContext(false);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function useReducedMotion() {
  return useContext(ReducedMotion);
}

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => sub.remove();
  }, []);
  return <ReducedMotion.Provider value={reduced}>{children}</ReducedMotion.Provider>;
}

type MotionPressableProps = PressableProps & { entryDelay?: number };

export function MotionPressable({ style, onPressIn, onPressOut, entryDelay, ...props }: MotionPressableProps) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const entry = useRef(new Animated.Value(entryDelay === undefined ? 1 : 0)).current;
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    entry.stopAnimation();
    if (reduced || entryDelay === undefined) {
      entry.setValue(1);
      return;
    }
    entry.setValue(0);
    Animated.timing(entry, {
      toValue: 1,
      duration: 140,
      delay: Math.max(0, entryDelay),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    return () => entry.stopAnimation();
  }, [entryDelay, reduced, entry]);

  function pressIn() {
    scale.stopAnimation();
    translateY.stopAnimation();
    if (reduced) {
      scale.setValue(1);
      translateY.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 0.965,
        duration: 75,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 1.5,
        duration: 75,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }

  function pressOut() {
    scale.stopAnimation();
    translateY.stopAnimation();
    if (reduced) {
      scale.setValue(1);
      translateY.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        speed: 28,
        bounciness: 4,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        speed: 30,
        bounciness: 3,
        useNativeDriver: true,
      }),
    ]).start();
  }

  return (
    <AnimatedPressable
      {...props}
      style={[
        typeof style === "function" ? style({ pressed }) : style,
        {
          opacity: entry,
          transform: [
            {
              translateY: Animated.add(
                translateY,
                entry.interpolate({ inputRange: [0, 1], outputRange: [7, 0] }),
              ),
            },
            { scale },
          ],
        },
      ]}
      onPressIn={(e) => {
        setPressed(true);
        pressIn();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        pressOut();
        onPressOut?.(e);
      }}
    />
  );
}

export function ScreenTransition({
  transitionKey,
  children,
}: {
  transitionKey: string;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    progress.stopAnimation();
    if (reduced) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 145,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    return () => progress.stopAnimation();
  }, [transitionKey, reduced, progress]);

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }),
        transform: [
          {
            translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
