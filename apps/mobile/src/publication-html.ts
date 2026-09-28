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

function blockAlignment(openTag: string): "left" | "center" | "right" | null {
  const direct = attrValue(openTag, "align")?.trim().toLowerCase();
  if (direct === "left" || direct === "center" || direct === "right") return direct;

  const style = attrValue(openTag, "style") || "";
  const styleMatch = style.match(/(?:^|;)\s*text-align\s*:\s*(left|center|right)\b/i);
  if (!styleMatch) return null;
  return styleMatch[1].toLowerCase() as "left" | "center" | "right";
}

function materializeParentImageAlignment(html: string) {
  let output = html;

  for (const tagName of ["p", "div", "figure", "td", "th", "span"]) {
    const block = new RegExp(`<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}>`, "gi");
    output = output.replace(block, (full, attrs: string, inner: string) => {
      const openTag = `<${tagName}${attrs}>`;
      const align = blockAlignment(openTag);
      if (!align || !/<img\b/i.test(inner)) return full;
      const nextInner = inner.replace(/<img\b[^>]*>/gi, (imgTag) =>
        setAttr(imgTag, "align", align),
      );
      return `<${tagName}${attrs}>${nextInner}</${tagName}>`;
    });
  }

  return output;
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

function isTinyImage(tag: string) {
  const width = readDimension(tag, "width");
  return width !== undefined && width > 0 && width <= 64;
}

function protectStandaloneTinyImageBlocks(html: string) {
  const protectedBlocks: string[] = [];
  let output = html;

  for (const tagName of ["p", "div", "figure", "td", "th", "span"]) {
    const block = new RegExp(`<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}>`, "gi");
    output = output.replace(block, (full, attrs: string, inner: string) => {
      if (!/<img\b/i.test(inner)) return full;

      const withoutComments = inner.replace(/<!--[\s\S]*?-->/g, "");
      const images = withoutComments.match(/<img\b[^>]*>/gi) || [];
      if (images.length !== 1) return full;

      const textRemainder = withoutComments
        .replace(/<img\b[^>]*>/gi, "")
        .replace(/<br\b[^>]*\/?\s*>/gi, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/<[^>]+>/g, "")
        .replace(/[\s\u00a0]+/g, "")
        .trim();

      if (textRemainder) return full;
      if (!isTinyImage(images[0])) return full;

      const token = `__BDT_STANDALONE_TINY_IMAGE_${protectedBlocks.length}__`;
      protectedBlocks.push(full);
      return token;
    });
  }

  return { output, protectedBlocks };
}

function makeContextualTinyImagesInline(html: string) {
  const { output: protectedHtml, protectedBlocks } = protectStandaloneTinyImageBlocks(html);

  let next = protectedHtml.replace(/<img\b[^>]*>/gi, (tag) => {
    if (!isTinyImage(tag)) return tag;

    const attrs = tag
      .replace(/^<img\b/i, "")
      .replace(/\/?>$/, "")
      .trim();

    return `<bdt-inline-img ${attrs}></bdt-inline-img>`;
  });

  protectedBlocks.forEach((block, index) => {
    next = next.replace(`__BDT_STANDALONE_TINY_IMAGE_${index}__`, block);
  });

  return next;
}

export function materializePublicationImageDimensions(html: string): string {
  const normalized = materializeImageDimensions(
    materializeParentImageAlignment(String(html || "")),
  );
  return makeContextualTinyImagesInline(normalized);
}
