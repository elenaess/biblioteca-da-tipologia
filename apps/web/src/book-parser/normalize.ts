import type {
  NormalizedBook,
  ReaderChapter,
  TocItem,
  ReaderFormat,
} from "../../../../packages/domain/src/reader";
import { sanitizeReaderHtml } from "./sanitizer";
export const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function tocTree(items: TocItem[]) {
  const roots: TocItem[] = [],
    stack: TocItem[] = [];
  for (const item of items) {
    while (stack.length && stack.at(-1)!.level >= item.level) stack.pop();
    if (stack.length) (stack.at(-1)!.children ??= []).push(item);
    else roots.push(item);
    stack.push(item);
  }
  return roots;
}
export function normalizeHtml(
  html: string,
  title: string,
  format: ReaderFormat,
): NormalizedBook {
  const doc = new DOMParser().parseFromString(
    sanitizeReaderHtml(html),
    "text/html",
  );
  const used = new Set<string>();
  let anchor = 0;
  for (const el of doc.body.querySelectorAll("[id],h1,h2,h3,h4,h5,h6")) {
    let id = el.id || `section-${++anchor}`;
    while (used.has(id)) id += "-2";
    el.id = id;
    used.add(id);
  }
  // Flatten only structural containers, retaining semantic blocks such as tables and quotes.
  for (const el of [
    ...doc.body.querySelectorAll("article,section,div"),
  ].reverse())
    el.replaceWith(...el.childNodes);
  const groups: Node[][] = [];
  let group: Node[] = [],
    size = 0;
  const split = () => {
    if (group.length) {
      groups.push(group);
      group = [];
      size = 0;
    }
  };
  for (const node of [...doc.body.childNodes]) {
    if (node.nodeType === 3 && !node.textContent?.trim()) continue;
    const el = node as Element;
    if (group.length && (el.tagName === "H1" || size > 22000)) split();
    group.push(node);
    size += (node.textContent || "").length;
  }
  split();
  const toc: TocItem[] = [];
  const chapters: ReaderChapter[] = groups.map((nodes, i) => {
    const section = doc.createElement("section");
    section.append(...nodes);
    const id = `chapter-${String(i + 1).padStart(4, "0")}`;
    section
      .querySelectorAll("h1,h2,h3,h4,h5,h6")
      .forEach((el) =>
        toc.push({
          id: `${id}-${el.id}`,
          title: el.textContent?.trim() || "Seção",
          level: Number(el.tagName[1]),
          chapterId: id,
          anchor: el.id,
        }),
      );
    const text = section.textContent || "";
    return {
      id,
      title:
        section.querySelector("h1,h2,h3,h4,h5,h6")?.textContent ||
        (i === 0 ? title : `Continuação ${i + 1}`),
      order: i,
      html: section.innerHTML,
      plainText: text,
      textLength: text.length,
    };
  });
  const ids = new Map<string, string>();
  for (const c of chapters) {
    const d = new DOMParser().parseFromString(c.html, "text/html");
    for (const el of d.querySelectorAll("[id]")) ids.set(el.id, c.id);
  }
  for (const c of chapters) {
    const d = new DOMParser().parseFromString(c.html, "text/html");
    for (const a of d.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')) {
      const target = a.getAttribute("href")!.slice(1);
      if (!a.dataset.chapter && ids.has(target)) {
        a.dataset.chapter = ids.get(target)!;
        a.dataset.anchor = target;
      }
    }
    c.html = d.body.innerHTML;
  }
  return { metadata: { title }, format, toc: tocTree(toc), chapters };
}
