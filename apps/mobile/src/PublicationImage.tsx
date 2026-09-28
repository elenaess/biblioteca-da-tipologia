import React, { useMemo, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { imageAssets } from "./image-assets";
import { classifyPublicationImage } from "./images-core";

export default function PublicationImage({ src, contentWidth }: { src: string; contentWidth: number }) {
  const resolved = useMemo(() => classifyPublicationImage(src || ""), [src]);
  const localAsset = resolved.kind === "asset" ? imageAssets[resolved.key] : undefined;
  const localInfo = useMemo(() => localAsset ? Image.resolveAssetSource(localAsset) : null, [localAsset]);
  const initialRatio = localInfo?.width && localInfo?.height ? localInfo.width / localInfo.height : 4 / 3;
  const [ratio, setRatio] = useState(initialRatio > 0 ? initialRatio : 4 / 3);
  const width = Math.max(1, contentWidth);
  const height = Math.min(width / Math.max(0.25, ratio), width * 1.6);

  if (localAsset) {
    return (
      <View style={s.wrap}>
        <Image source={localAsset} style={{ width, height }} resizeMode="contain" />
      </View>
    );
  }

  if (resolved.kind === "remote" || resolved.kind === "data") {
    return (
      <View style={s.wrap}>
        <Image
          source={{ uri: resolved.uri }}
          style={{ width, height }}
          resizeMode="contain"
          onLoad={(event) => {
            const source = event.nativeEvent.source;
            if (source?.width && source?.height) setRatio(source.width / source.height);
          }}
        />
      </View>
    );
  }

  return null;
}

const s = StyleSheet.create({
  wrap: { width: "100%", alignItems: "center", marginVertical: 14, overflow: "hidden" },
});
