import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useReducedMotion } from "./Motion";

export default function OrbitLoader({
  label,
  overlay = false,
}: {
  label?: string;
  overlay?: boolean;
}) {
  const reduced = useReducedMotion();
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      spin.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 520,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, spin]);

  if (reduced)
    return (
      <View style={[styles.box, overlay && styles.overlay]} pointerEvents="none">
        <View style={styles.staticRow}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </View>
    );

  return (
    <View style={[styles.box, overlay && styles.overlay]} pointerEvents="none">
      <View style={styles.orbit}>
        {[0, 120, 240].map((offset) => (
          <Animated.View
            key={offset}
            style={[
              styles.arm,
              {
                transform: [
                  {
                    rotate: spin.interpolate({
                      inputRange: [0, 1],
                      outputRange: [`${offset}deg`, `${offset + 360}deg`],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.dot} />
          </Animated.View>
        ))}
      </View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", justifyContent: "center", gap: 9, padding: 18 },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(245,239,228,0.78)",
    zIndex: 20,
  },
  orbit: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  arm: { position: "absolute", width: 38, height: 38, alignItems: "flex-end", justifyContent: "center" },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#914732" },
  staticRow: { flexDirection: "row", gap: 6, paddingVertical: 8 },
  label: { color: "#6e5b42", fontSize: 13 },
});
