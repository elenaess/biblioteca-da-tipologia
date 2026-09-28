import { classifyPublicationImageSource } from "../../../packages/domain/src/publication-images";

const TRANSPARENT_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLxAAAAAElFTkSuQmCC";

function safeBase(baseUrl: string) {
  try {
    return new URL(baseUrl, typeof window !== "undefined" ? window.location.origin : "https://example.invalid/");
  } catch {
    return new URL("https://example.invalid/");
  }
}

export function resolveWebPublicationHtml(html: string, baseUrl = "/"): string {
  const base = safeBase(baseUrl.endsWith("/") ? baseUrl : baseUrl + "/");
  return html.replace(/\bsrc=(['"])(.*?)\1/gi, (_match, quote: string, raw: string) => {
    const source = classifyPublicationImageSource(raw);
    let uri = TRANSPARENT_PNG;
    if (source.kind === "local") uri = new URL("source-images/" + source.key, base).toString();
    else if (source.kind === "remote" || source.kind === "data") uri = source.uri;
    return `src=${quote}${uri}${quote}`;
  });
}
