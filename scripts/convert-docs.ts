import { JSDOM } from "jsdom";
import { sanitizeHtml } from "../apps/web/src/rich-content";
export function convertDocHtml(raw: string, assetPrefix: string) {
  const dom = new JSDOM(raw);
  const { document } = dom.window;
  const keep = [
    "text-align",
    "font-weight",
    "font-style",
    "text-decoration",
    "color",
    "background-color",
    "font-size",
    "font-family",
    "vertical-align",
  ];
  for (const node of Array.from(
    document.body.querySelectorAll("*"),
  ) as HTMLElement[]) {
    const computed = dom.window.getComputedStyle(node);
    for (const prop of keep) {
      const value = computed.getPropertyValue(prop);
      if (value && value !== "rgba(0, 0, 0, 0)" && value !== "transparent")
        node.style.setProperty(prop, value);
    }
    node.removeAttribute("class");
    if (node.tagName === "IMG") {
      const src = node.getAttribute("src") || "";
      node.setAttribute("src", assetPrefix + src.split("/").pop());
      node.style.removeProperty("height");
      node.style.maxWidth = "100%";
    }
    if (node.tagName === "A") {
      const href = node.getAttribute("href") || "";
      if (href.startsWith("https://www.google.com/url?")) {
        const original = new URL(href).searchParams.get("q");
        if (original) node.setAttribute("href", original);
      }
    }
  }
  const html = sanitizeHtml(document.body.innerHTML, dom.window);
  dom.window.close();
  return html;
}
