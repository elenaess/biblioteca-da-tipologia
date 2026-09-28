function parsePx(style: string, property: string): string | null {
  const match = style.match(
    new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([0-9]+(?:\\.[0-9]+)?)px\\b`, "i"),
  );
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  return Number.isFinite(value) && value > 0 ? String(value) : null;
}

function attrValue(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(['"])(.*?)\\1`, "i"));
  return match?.[2] ?? null;
}

function setAttr(tag: string, name: string, value: string) {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(['"])(.*?)\\1`, "i");
  if (pattern.test(tag)) {
    return tag.replace(pattern, `${name}="${value}"`);
  }
  return tag.replace(/<img\b/i, `<img ${name}="${value}"`);
}

function readDimension(tag: string, name: "width" | "height") {
  const raw = attrValue(tag, name);
  if (!raw) return undefined;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function materializeImageDimensions(html: string) {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const style = attrValue(tag, "style") || "";
    const width = parsePx(style, "width");
    const height = parsePx(style, "height");

    let next = tag;
    if (width) next = setAttr(next, "width", width);
    if (height) next = setAttr(next, "height", height);
    return next;
  });
}

function makeTinyImagesInline(html: string) {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const width = readDimension(tag, "width");
    if (width === undefined || width > 64) return tag;

    const attrs = tag
      .replace(/^<img\b/i, "")
      .replace(/\/?>$/, "")
      .trim();

    return `<bdt-inline-img ${attrs}></bdt-inline-img>`;
  });
}

export function materializePublicationImageDimensions(html: string): string {
  return makeTinyImagesInline(materializeImageDimensions(String(html || "")));
}
