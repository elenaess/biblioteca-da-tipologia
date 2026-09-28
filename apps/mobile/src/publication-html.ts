type Align = "left" | "center" | "right";

const TINY_MAX_PX = 64;
const CACHE_LIMIT = 8;
const processedCache = new Map<string, string>();

function attrValue(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(['"])(.*?)\\1`, "i"));
  return match?.[2] ?? null;
}

function setAttr(tag: string, name: string, value: string) {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(['"])(.*?)\\1`, "i");
  if (pattern.test(tag)) return tag.replace(pattern, `${name}="${value}"`);
  return tag.replace(/<img\b/i, `<img ${name}="${value}"`);
}

function parsePx(style: string, property: string): string | null {
  const match = style.match(
    new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([0-9]+(?:\\.[0-9]+)?)px\\b`, "i"),
  );
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  return Number.isFinite(value) && value > 0 ? String(value) : null;
}

function materializeImageDimensions(tag: string) {
  const style = attrValue(tag, "style") || "";
  let next = tag;
  const width = attrValue(next, "width") || parsePx(style, "width");
  const height = attrValue(next, "height") || parsePx(style, "height");
  if (width) next = setAttr(next, "width", width);
  if (height) next = setAttr(next, "height", height);
  return next;
}

function imageWidth(tag: string) {
  const raw = attrValue(tag, "width");
  if (!raw) return undefined;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function isTinyImage(tag: string) {
  const width = imageWidth(tag);
  return width !== undefined && width <= TINY_MAX_PX;
}

function blockAlignment(attrs: string): Align {
  const pseudoTag = `<x ${attrs}>`;
  const direct = attrValue(pseudoTag, "align")?.trim().toLowerCase();
  if (direct === "center" || direct === "right" || direct === "left") return direct;

  const style = attrValue(pseudoTag, "style") || "";
  const matched = style.match(/(?:^|;)\s*text-align\s*:\s*(left|center|right)\b/i)?.[1]?.toLowerCase();
  return matched === "center" || matched === "right" ? matched : "left";
}

function bareText(inner: string) {
  return inner
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<img\b[^>]*>/gi, "")
    .replace(/<br\b[^>]*\/?\s*>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/[\s\u00a0]+/g, "")
    .trim();
}

function toInlineTag(tag: string) {
  const attrs = tag.replace(/^<img\b/i, "").replace(/\/?>$/, "").trim();
  return `<bdt-inline-img ${attrs}></bdt-inline-img>`;
}

function toBlockTag(tag: string, align: Align) {
  const aligned = setAttr(tag, "align", align);
  const attrs = aligned.replace(/^<img\b/i, "").replace(/\/?>$/, "").trim();
  return `<bdt-block-img ${attrs}></bdt-block-img>`;
}

function transformPublicationHtml(source: string) {
  const blockRe = /<(p|figure|div|td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi;

  let output = source.replace(
    blockRe,
    (full, tagName: string, attrs: string, inner: string) => {
      const prepared = inner.replace(/<img\b[^>]*>/gi, materializeImageDimensions);
      const images = prepared.match(/<img\b[^>]*>/gi) || [];

      if (images.length === 1 && bareText(prepared) === "") {
        return toBlockTag(images[0], blockAlignment(attrs));
      }

      const body = prepared.replace(/<img\b[^>]*>/gi, (tag) =>
        isTinyImage(tag) ? toInlineTag(tag) : tag,
      );

      return `<${tagName}${attrs}>${body}</${tagName}>`;
    },
  );

  output = output.replace(/<img\b[^>]*>/gi, (tag) => {
    const prepared = materializeImageDimensions(tag);
    return isTinyImage(prepared) ? toInlineTag(prepared) : prepared;
  });

  return output;
}

export function materializePublicationImageDimensions(html: string): string {
  const source = String(html || "");
  if (!source) return "";

  const cached = processedCache.get(source);
  if (cached !== undefined) return cached;

  const output = transformPublicationHtml(source);

  processedCache.set(source, output);
  if (processedCache.size > CACHE_LIMIT) {
    const oldest = processedCache.keys().next().value as string | undefined;
    if (oldest !== undefined) processedCache.delete(oldest);
  }

  return output;
}
