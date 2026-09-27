export type PublicationImageResolution =
  | { kind: "asset"; key: string }
  | { kind: "remote"; uri: string }
  | { kind: "missing" };

const sourceImagePattern = /^(?:\.\/|\/)?source-images\/(.+)$/i;

export function classifyPublicationImage(src: string): PublicationImageResolution {
  const value = src.trim();
  const local = value.match(sourceImagePattern);
  if (local?.[1]) return { kind: "asset", key: local[1] };
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:")
      return { kind: "remote", uri: url.toString() };
  } catch {
    // Fall through to a safe missing-image result.
  }
  return { kind: "missing" };
}

export function rewritePublicationHtml(
  html: string,
  assetUri: (key: string) => string | undefined,
  fallbackUri: string,
): string {
  return html.replace(/\bsrc=(['"])(.*?)\1/gi, (_match, quote: string, raw: string) => {
    const resolved = classifyPublicationImage(raw);
    const uri =
      resolved.kind === "asset"
        ? assetUri(resolved.key) || fallbackUri
        : resolved.kind === "remote"
          ? resolved.uri
          : fallbackUri;
    return `src=${quote}${uri}${quote}`;
  });
}

export function isRemoteImageUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  const resolved = classifyPublicationImage(value);
  return resolved.kind === "remote";
}
