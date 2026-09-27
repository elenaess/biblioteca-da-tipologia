import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Pressable, type PressableProps } from "react-native";
const ReducedMotion = createContext(false);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => sub.remove();
  }, []);
  return <ReducedMotion.Provider value={reduced}>{children}</ReducedMotion.Provider>;
}
export function MotionPressable({ style, onPressIn, onPressOut, ...props }: PressableProps) {
  const reduced = useContext(ReducedMotion);
  const scale = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);
  function animate(to: number, duration: number) {
    scale.stopAnimation();
    if (reduced) scale.setValue(1);
    else Animated.timing(scale, { toValue: to, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }
  return <AnimatedPressable {...props}
    style={[typeof style === "function" ? style({ pressed }) : style, { transform: [{ scale }] }]}
    onPressIn={(e) => { setPressed(true); animate(0.975, 80); onPressIn?.(e); }}
    onPressOut={(e) => { setPressed(false); animate(1, 100); onPressOut?.(e); }} />;
}
export function ScreenTransition({ transitionKey, children }: { transitionKey: string; children: React.ReactNode }) {
  const reduced = useContext(ReducedMotion);
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    progress.stopAnimation();
    if (reduced) { progress.setValue(1); return; }
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 100, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    return () => progress.stopAnimation();
  }, [transitionKey, reduced]);
  return <Animated.View style={{ flex: 1, opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }), transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [3, 0] }) }] }}>{children}</Animated.View>;
}
