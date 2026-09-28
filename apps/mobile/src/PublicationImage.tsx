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
};

type Align = "left" | "center" | "right";

const INLINE_IMAGE_MAX_WIDTH = 64;

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
  const align = style.match(/(?:^|;)\s*(?:text-align|align-items)\s*:\s*(left|center|right)/i)?.[1] as Align | undefined;
  return {
    width: parseDimension(width, baseWidth),
    height: parseDimension(height, baseWidth),
    align,
  };
}

function normalizeAlign(alignHint: unknown, styleAlign?: Align): Align {
  const raw = String(alignHint || styleAlign || "").trim().toLowerCase();
  return raw === "left" || raw === "right" ? raw : "center";
}

export default function PublicationImage({
  src,
  contentWidth,
  widthHint,
  heightHint,
  styleHint,
  alignHint,
}: Props) {
  const widthLimit = Math.max(1, contentWidth);
  const resolved = useMemo(() => classifyPublicationImage(src || ""), [src]);
  const localAsset = resolved.kind === "asset" ? imageAssets[resolved.key] : undefined;
  const localInfo = useMemo(() => (localAsset ? Image.resolveAssetSource(localAsset) : null), [localAsset]);
  const styleMeta = useMemo(() => parseStyleMeta(styleHint, widthLimit), [styleHint, widthLimit]);
  const explicitWidth = parseDimension(widthHint, widthLimit) ?? styleMeta.width;
  const explicitHeight = parseDimension(heightHint, widthLimit) ?? styleMeta.height;
  const align = normalizeAlign(alignHint, styleMeta.align);

  const initialRatio =
    explicitWidth && explicitHeight
      ? explicitWidth / explicitHeight
      : localInfo?.width && localInfo?.height
        ? localInfo.width / localInfo.height
        : 4 / 3;

  const [ratio, setRatio] = useState(initialRatio > 0 ? initialRatio : 4 / 3);
  const [intrinsicWidth, setIntrinsicWidth] = useState<number | undefined>(localInfo?.width);

  // Explicit HTML/CSS width always wins — including tiny 1–20px symbols.
  const width = Math.max(
    1,
    Math.min(
      widthLimit,
      explicitWidth ?? intrinsicWidth ?? widthLimit,
    ),
  );
  const height = Math.max(
    1,
    Math.min(
      explicitHeight ?? width / Math.max(0.2, ratio),
      widthLimit * 2.4,
    ),
  );

  const tiny = explicitWidth !== undefined && width <= INLINE_IMAGE_MAX_WIDTH;
  const imageStyle = { width, height };

  if (localAsset) {
    // Tiny imported symbols belong to the text flow. Do not put them in a
    // 100%-wide wrapper or give them publication-image margins.
    if (tiny) {
      return <Image source={localAsset} style={imageStyle} resizeMode="contain" />;
    }
    return (
      <View
        style={[
          s.wrap,
          align === "left" ? s.left : align === "right" ? s.right : s.center,
        ]}
      >
        <Image source={localAsset} style={imageStyle} resizeMode="contain" />
      </View>
    );
  }

  if (resolved.kind === "remote" || resolved.kind === "data") {
    const remoteImage = (
      <Image
        source={{ uri: resolved.uri }}
        style={imageStyle}
        resizeMode="contain"
        onLoad={(event) => {
          const source = event.nativeEvent.source;
          if (source?.width && source?.height) {
            setRatio(source.width / source.height);
            setIntrinsicWidth(source.width);
          }
        }}
      />
    );

    if (tiny) return remoteImage;

    return (
      <View
        style={[
          s.wrap,
          align === "left" ? s.left : align === "right" ? s.right : s.center,
        ]}
      >
        {remoteImage}
      </View>
    );
  }

  return null;
}

const s = StyleSheet.create({
  wrap: {
    width: "100%",
    marginVertical: 14,
    overflow: "hidden",
  },
  center: {
    alignItems: "center",
  },
  left: {
    alignItems: "flex-start",
  },
  right: {
    alignItems: "flex-end",
  },
});
