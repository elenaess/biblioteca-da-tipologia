import React, { useMemo, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { imageAssets } from "./image-assets";
import { classifyPublicationImage } from "./images-core";

type Props = {
  src: string;
  contentWidth: number;
  widthHint?: unknown;
  heightHint?: unknown;
  styleHint?: string;
  alignHint?: string;
  alt?: string;
  inlineHint?: boolean;
};

type Align = "left" | "center" | "right";

function parseDimension(value: unknown, baseWidth: number): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value > 0 ? value : undefined;
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return undefined;

  if (text.endsWith("%")) {
    const n = Number.parseFloat(text.slice(0, -1));
    return Number.isFinite(n) && n > 0 ? (baseWidth * n) / 100 : undefined;
  }

  const match = text.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return undefined;

  const n = Number.parseFloat(match[1]);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function parseStyleMeta(styleHint: string | undefined, baseWidth: number) {
  const style = String(styleHint || "");
  const width = style.match(/(?:^|;)\s*width\s*:\s*([^;]+)/i)?.[1];
  const height = style.match(/(?:^|;)\s*height\s*:\s*([^;]+)/i)?.[1];

  return {
    width: parseDimension(width, baseWidth),
    height: parseDimension(height, baseWidth),
  };
}

function normalizeBlockAlign(value: unknown): Align {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "right" || raw === "left") return raw;
  return "center";
}

export default function PublicationImage({
  src,
  contentWidth,
  widthHint,
  heightHint,
  styleHint,
  alignHint,
  inlineHint = false,
}: Props) {
  const widthLimit = Math.max(1, contentWidth);
  const resolved = useMemo(() => classifyPublicationImage(src || ""), [src]);
  const localAsset = resolved.kind === "asset" ? imageAssets[resolved.key] : undefined;
  const localInfo = useMemo(
    () => (localAsset ? Image.resolveAssetSource(localAsset) : null),
    [localAsset],
  );
  const styleMeta = useMemo(
    () => parseStyleMeta(styleHint, widthLimit),
    [styleHint, widthLimit],
  );

  const explicitWidth = parseDimension(widthHint, widthLimit) ?? styleMeta.width;
  const explicitHeight = parseDimension(heightHint, widthLimit) ?? styleMeta.height;
  const align = normalizeBlockAlign(alignHint);

  const initialRatio =
    explicitWidth && explicitHeight
      ? explicitWidth / explicitHeight
      : localInfo?.width && localInfo?.height
        ? localInfo.width / localInfo.height
        : 1;

  const [ratio, setRatio] = useState(initialRatio > 0 ? initialRatio : 1);
  const [remoteWidth, setRemoteWidth] = useState<number | undefined>(undefined);

  const width = Math.max(
    1,
    Math.min(widthLimit, explicitWidth ?? localInfo?.width ?? remoteWidth ?? widthLimit),
  );
  const height = Math.max(
    1,
    Math.min(explicitHeight ?? width / Math.max(0.1, ratio), widthLimit * 2.5),
  );

  const imageStyle = inlineHint
    ? [s.inlineImage, { width, height }]
    : { width, height };

  const child = localAsset ? (
    <Image source={localAsset} style={imageStyle} resizeMode="contain" fadeDuration={0} />
  ) : resolved.kind === "remote" || resolved.kind === "data" ? (
    <Image
      source={{ uri: resolved.uri }}
      style={imageStyle}
      resizeMode="contain"
      fadeDuration={0}
      onLoad={(event) => {
        const source = event.nativeEvent.source;
        if (source?.width && source?.height) {
          setRatio(source.width / source.height);
          setRemoteWidth(source.width);
        }
      }}
    />
  ) : null;

  if (!child) return null;
  if (inlineHint) return child;

  return (
    <View
      style={[
        s.block,
        align === "left" ? s.left : align === "right" ? s.right : s.center,
      ]}
    >
      {child}
    </View>
  );
}

const s = StyleSheet.create({
  block: { width: "100%", marginVertical: 12, overflow: "hidden" },
  center: { alignItems: "center" },
  left: { alignItems: "flex-start" },
  right: { alignItems: "flex-end" },
  inlineImage: { marginVertical: 0 },
});
