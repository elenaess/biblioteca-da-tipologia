import DOMPurify from "dompurify";
const tags =
  "h1 h2 h3 h4 h5 h6 p div span strong b em i u s blockquote ul ol li img figure figcaption table caption thead tbody tfoot tr th td a hr sup sub br pre code section article aside dl dt dd".split(
    " ",
  );
export function sanitizeReaderHtml(html: string) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: tags,
    ALLOWED_ATTR: [
      "id",
      "href",
      "src",
      "alt",
      "title",
      "colspan",
      "rowspan",
      "style",
      "start",
      "type",
      "role",
      "data-chapter",
      "data-anchor",
      "width",
      "height",
    ],
    ALLOW_DATA_ATTR: false,
  });
  const d = new DOMParser().parseFromString(clean, "text/html");
  d.body.querySelectorAll<HTMLElement>("*").forEach((el) => {
    const style = el.getAttribute("style") || "";
    el.removeAttribute("style");
    for (const rule of style.split(";")) {
      const [k, ...v] = rule.split(":");
      const val = v.join(":").trim();
      const key = k.trim().toLowerCase();
      if (
        (key === "text-align" && /^(left|right|center|justify)$/.test(val)) ||
        (key === "font-weight" && /^(bold|normal|[1-9]00)$/.test(val)) ||
        (key === "font-style" && /^(italic|normal|oblique)$/.test(val)) ||
        (key === "text-decoration" &&
          /^(underline|line-through|none)$/.test(val))
      )
        el.style.setProperty(key, val);
    }
    if (el.tagName === "IMG") {
      for (const dim of ["width", "height"])
        if (!/^\d{1,5}$/.test(el.getAttribute(dim) || ""))
          el.removeAttribute(dim);
      const src = el.getAttribute("src") || "";
      if (
        !/^https:\/\//i.test(src) &&
        !/^data:image\/(png|jpeg|webp|gif);base64,/i.test(src)
      )
        el.removeAttribute("src");
      el.setAttribute("loading", "lazy");
      el.setAttribute("referrerpolicy", "no-referrer");
      el.setAttribute("alt", el.getAttribute("alt") || "");
    }
    if (el.tagName === "A") {
      const href = el.getAttribute("href") || "";
      if (href && !/^(#|https:\/\/|mailto:)/i.test(href))
        el.removeAttribute("href");
      if (/^https:/i.test(href)) {
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      }
    }
  });
  return d.body.innerHTML;
}
