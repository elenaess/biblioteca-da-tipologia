import { classifyPublicationImageSource } from "../../../packages/domain/src/publication-images";

const TRANSPARENT_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLxAAAAAElFTkSuQmCC";
const BLOCK_IMAGE_STYLE = "display:block;max-width:100%;height:auto;margin:1rem auto;clear:both;";

function safeBase(baseUrl: string) {
  try {
    return new URL(baseUrl, typeof window !== "undefined" ? window.location.origin : "https://example.invalid/");
  } catch {
    return new URL("https://example.invalid/");
  }
}

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

export function resolveWebPublicationHtml(html: string, baseUrl = "/"): string {
  const base = safeBase(baseUrl.endsWith("/") ? baseUrl : baseUrl + "/");
  const rewritten = html.replace(/\bsrc=(['"])(.*?)\1/gi, (_match, quote: string, raw: string) => {
    const source = classifyPublicationImageSource(raw);
    let uri = TRANSPARENT_PNG;
    if (source.kind === "local") uri = new URL("source-images/" + source.key, base).toString();
    else if (source.kind === "remote" || source.kind === "data") uri = source.uri;
    return `src=${quote}${uri}${quote}`;
  });
  return decorateHtmlImages(rewritten);
}
