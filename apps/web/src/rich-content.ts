import createDOMPurify from "dompurify";
const allowedStyle = new Set([
  "text-align",
  "font-weight",
  "font-style",
  "text-decoration",
  "color",
  "background-color",
  "font-size",
  "font-family",
  "vertical-align",
  "width",
  "height",
  "max-width",
  "margin-left",
  "margin-right",
]);
export function sanitizeHtml(html: string, suppliedWindow?: any) {
  const win = suppliedWindow || (typeof window !== "undefined" ? window : null);
  if (!win) return "";
  const purify = createDOMPurify(win);
  purify.addHook("afterSanitizeAttributes", (node: any) => {
    if (node.hasAttribute?.("style")) {
      const style = node.style;
      for (const name of Array.from(style) as string[]) {
        const value = style.getPropertyValue(name);
        if (
          !allowedStyle.has(name) ||
          /url\s*\(|expression|javascript/i.test(value)
        )
          style.removeProperty(name);
      }
    }
    for (const attr of ["src", "href"]) {
      const value = node.getAttribute?.(attr);
      if (!value) continue;
      const valid =
        (attr === "src" &&
          value.length < 7000000 &&
          /^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(value)) ||
        /^https:\/\//i.test(value) ||
        (attr === "src" &&
          /^\.\/?source-images\/[a-z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(value)) ||
        (attr === "href" && /^#[\w.-]+$/.test(value));
      if (!valid) node.removeAttribute(attr);
    }
    if (node.tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
    if (node.tagName === "IMG") {
      node.setAttribute("loading", "lazy");
      node.setAttribute("alt", node.getAttribute("alt") || "Imagem do texto");
    }
  });
  return purify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "span",
      "blockquote",
      "br",
      "hr",
      "ul",
      "ol",
      "li",
      "a",
      "img",
      "table",
      "thead",
      "tbody",
      "tr",
      "td",
      "th",
      "colgroup",
      "col",
      "code",
      "pre",
      "sup",
      "sub",
    ],
    ALLOWED_ATTR: [
      "href",
      "src",
      "alt",
      "title",
      "style",
      "width",
      "height",
      "colspan",
      "rowspan",
      "start",
      "data-type",
      "colwidth",
    ],
    KEEP_CONTENT: true,
  });
}
