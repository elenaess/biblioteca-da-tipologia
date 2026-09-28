import { classifyPublicationImageSource } from "../../../packages/domain/src/publication-images";

export type PublicationImageResolution =
  | { kind: "asset"; key: string }
  | { kind: "remote"; uri: string }
  | { kind: "data"; uri: string }
  | { kind: "missing" };

const BLOCK_IMAGE_STYLE = "display:block;max-width:100%;height:auto;margin:1rem auto;clear:both;";

function addOrMergeStyleAttribute(imgTag: string) {
  if (/\bstyle\s*=\s*(['"])(.*?)\1/i.test(imgTag)) {
    return imgTag.replace(/\bstyle\s*=\s*(['"])(.*?)\1/i, (_m, quote: string, current: string) => {
      const next = current.trim();
      const merged = next.endsWith(";") || next.length === 0 ? next : next + ";";
      return `style=${quote}${merged}${BLOCK_IMAGE_STYLE}${quote}`;
    });
  }
  return imgTag.replace(/<img\b/i, `<img style="${BLOCK_IMAGE_STYLE}" `);
}

function decorateHtmlImages(html: string) {
  return html.replace(/<img\b[^>]*>/gi, (imgTag) => addOrMergeStyleAttribute(imgTag));
}

export function classifyPublicationImage(src: string): PublicationImageResolution {
  const source = classifyPublicationImageSource(src);
  if (source.kind === "local") return { kind: "asset", key: source.key };
  return source;
}

export function rewritePublicationHtml(
  html: string,
  assetUri: (key: string) => string | undefined,
  fallbackUri: string,
): string {
  const rewritten = html.replace(/\bsrc=(['"])(.*?)\1/gi, (_match, quote: string, raw: string) => {
    const resolved = classifyPublicationImage(raw);
    const uri =
      resolved.kind === "asset"
        ? assetUri(resolved.key) || fallbackUri
        : resolved.kind === "remote" || resolved.kind === "data"
          ? resolved.uri
          : fallbackUri;
    return `src=${quote}${uri}${quote}`;
  });
  return decorateHtmlImages(rewritten);
}

export function isRemoteImageUrl(value: string | null | undefined): boolean {
  return !!value && classifyPublicationImage(value).kind === "remote";
}
