import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  type ImageResizeMode,
  type ViewStyle,
  StyleSheet,
  View,
  type StyleProp,
} from "react-native";
import { isRemoteImageUrl } from "./images-core";

export default function ResilientRemoteImage({
  uri,
  style,
  fallback,
  resizeMode = "cover",
}: {
  uri?: string | null;
  style?: StyleProp<ViewStyle>;
  fallback?: React.ReactNode;
  resizeMode?: ImageResizeMode;
}) {
  const valid = useMemo(() => isRemoteImageUrl(uri), [uri]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const fallbackNode = fallback ?? (
    <View style={styles.defaultFallback}>
      <View style={styles.bookGlyph}>
        <View style={styles.bookHalf} />
        <View style={[styles.bookHalf, { transform: [{ scaleX: -1 }] }]} />
      </View>
    </View>
  );
  if (!valid || failed) return <>{fallbackNode}</>;
  return (
    <View style={[styles.frame, style]}>
      <View style={StyleSheet.absoluteFill}>{fallbackNode}</View>
      <Image
        source={{ uri: uri! }}
        style={[StyleSheet.absoluteFill, { opacity: loaded ? 1 : 0 }]}
        resizeMode={resizeMode}
        onLoadStart={() => setLoaded(false)}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
      {!loaded && !failed ? (
        <ActivityIndicator style={StyleSheet.absoluteFill} color="#914732" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: "hidden" },
  defaultFallback: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#e9dfce" },
  bookGlyph: { width: 54, height: 38, flexDirection: "row", opacity: 0.62 },
  bookHalf: { width: 25, height: 36, borderWidth: 2, borderColor: "#914732", borderTopLeftRadius: 9, borderBottomLeftRadius: 5, marginHorizontal: 1 },
});
