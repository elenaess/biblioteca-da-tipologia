function parsePx(style: string, property: string): string | null {
  const match = style.match(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([0-9]+(?:\\.[0-9]+)?)px\\b`, "i"));
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  return Number.isFinite(value) && value > 0 ? String(value) : null;
}

function attrValue(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(['"])(.*?)\\1`, "i"));
  return match?.[2] ?? null;
}

function addAttr(tag: string, name: string, value: string) {
  if (new RegExp(`\\b${name}\\s*=`, "i").test(tag)) return tag;
  return tag.replace(/<img\b/i, `<img ${name}="${value}"`);
}

/**
 * react-native-render-html may consume the style="" attribute before our custom
 * <img> renderer sees tnode.attributes. The imported publications store many
 * tiny symbols only as inline CSS, e.g. width: 10px or width: 20.03px.
 *
 * Copy pixel dimensions into real HTML width/height attributes before parsing,
 * so the native renderer can preserve even 1px-wide images.
 */
export function materializePublicationImageDimensions(html: string): string {
  return String(html || "").replace(/<img\b[^>]*>/gi, (tag) => {
    const style = attrValue(tag, "style") || "";
    const width = parsePx(style, "width");
    const height = parsePx(style, "height");

    let next = tag;
    if (width) next = addAttr(next, "width", width);
    if (height) next = addAttr(next, "height", height);
    return next;
  });
}
