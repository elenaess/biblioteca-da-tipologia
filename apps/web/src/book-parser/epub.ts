import { unzip, strFromU8 } from "fflate";
import type {
  NormalizedBook,
  ReaderChapter,
  TocItem,
} from "../../../../packages/domain/src/reader";
import type { AssetWriter } from "./index";
import { normalizeHtml, tocTree } from "./normalize";
import { sanitizeReaderHtml } from "./sanitizer";
const xml = (text: string) => {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror"))
    throw Error("Não foi possível ler a estrutura do EPUB.");
  return doc;
};
const nodes = (el: Document | Element, name: string) =>
  Array.from(el.getElementsByTagNameNS("*", name));
function resolve(base: string, href: string) {
  const u = new URL(href, "https://book.invalid/" + base);
  if (u.origin !== "https://book.invalid") return null;
  return {
    path: decodeURIComponent(u.pathname.slice(1)),
    anchor: decodeURIComponent(u.hash.slice(1)),
  };
}
export async function parseEpub(
  bytes: Uint8Array,
  asset: AssetWriter,
  progress: (s: string) => void,
): Promise<NormalizedBook> {
  let total = 0,
    count = 0;
  const files = await new Promise<Record<string, Uint8Array>>((ok, fail) =>
    unzip(
      bytes,
      {
        filter: (f) => {
          if (++count > 2000 || (total += f.originalSize) > 80 * 1024 * 1024)
            throw Error("Este EPUB é grande demais para importar.");
          return !f.name.startsWith("/") && !f.name.split("/").includes("..");
        },
      },
      (err, data) => (err ? fail(err) : ok(data)),
    ),
  );
  const read = (p: string) => {
    if (!files[p]) throw Error("Seção ausente no EPUB.");
    return strFromU8(files[p]);
  };
  const container = xml(read("META-INF/container.xml")),
    opfPath = nodes(container, "rootfile")[0]?.getAttribute("full-path");
  if (!opfPath) throw Error("EPUB sem manifesto.");
  const opf = xml(read(opfPath));
  const items = new Map(
    nodes(opf, "item").map((el) => [
      el.getAttribute("id")!,
      {
        path: resolve(opfPath, el.getAttribute("href") || "")?.path || "",
        mime: el.getAttribute("media-type") || "",
        properties: el.getAttribute("properties") || "",
      },
    ]),
  );
  const metadata = {
    title: nodes(opf, "title")[0]?.textContent || "Livro",
    author: nodes(opf, "creator")
      .map((x) => x.textContent)
      .join(", "),
    language: nodes(opf, "language")[0]?.textContent || "",
    coverUrl: undefined as string | undefined,
  };
  const assetCache = new Map<string, string>();
  for (const item of items.values()) {
    if (!/^image\/(png|jpeg|webp|gif)$/.test(item.mime) || !files[item.path])
      continue;
    assetCache.set(
      item.path,
      await asset(files[item.path], item.mime, item.path),
    );
    if (item.properties.includes("cover-image"))
      metadata.coverUrl = assetCache.get(item.path);
  }
  const coverId = nodes(opf, "meta")
    .find((x) => x.getAttribute("name") === "cover")
    ?.getAttribute("content");
  if (coverId && items.has(coverId))
    metadata.coverUrl = assetCache.get(items.get(coverId)!.path);
  const chapters: ReaderChapter[] = [],
    pathMap = new Map<string, string>(),
    anchorMap = new Map<string, string>();
  const sourceDocs = new Map<string, Document>();
  const spine = nodes(opf, "itemref").filter(
    (x) => x.getAttribute("linear") !== "no",
  );
  for (const [i, ref] of spine.entries()) {
    const item = items.get(ref.getAttribute("idref") || "");
    if (!item) continue;
    progress(`Preparando capítulo ${i + 1} de ${spine.length}…`);
    try {
      const doc = new DOMParser().parseFromString(read(item.path), "text/html");
      // Reduce EPUB stylesheet rules to safe presentation declarations on the book's own elements.
      const css = [...doc.querySelectorAll("style")].map(
        (x) => x.textContent || "",
      );
      for (const link of doc.querySelectorAll('link[rel="stylesheet"]')) {
        const p = resolve(item.path, link.getAttribute("href") || "")?.path;
        if (p && files[p]) css.push(read(p));
      }
      for (const sheet of css)
        for (const match of sheet.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
          if (match[1].includes("@") || match[1].length > 500) continue;
          try {
            doc.body
              .querySelectorAll<HTMLElement>(match[1].trim())
              .forEach((el) =>
                el.setAttribute(
                  "style",
                  match[2] + ";" + (el.getAttribute("style") || ""),
                ),
              );
          } catch {}
        }
      for (const img of doc.querySelectorAll("img")) {
        const path = resolve(item.path, img.getAttribute("src") || "")?.path;
        const url = path ? assetCache.get(path) : null;
        if (url) img.setAttribute("src", url);
        else if (!/^https:\/\//.test(img.getAttribute("src") || ""))
          img.removeAttribute("src");
      }
      for (const a of doc.querySelectorAll<HTMLAnchorElement>("a[href]")) {
        const dest = resolve(item.path, a.getAttribute("href")!);
        if (dest) {
          a.dataset.chapter = dest.path;
          a.dataset.anchor = dest.anchor;
          a.setAttribute("href", "#" + dest.anchor);
        }
      }
      const normalized = normalizeHtml(
        doc.body.innerHTML,
        metadata.title,
        "epub",
      );
      for (const [n, c] of normalized.chapters.entries()) {
        const id = `chapter-${String(i + 1).padStart(4, "0")}-${n + 1}`;
        c.id = id;
        c.order = chapters.length;
        chapters.push(c);
        if (!pathMap.has(item.path)) pathMap.set(item.path, id);
        const d = new DOMParser().parseFromString(c.html, "text/html");
        sourceDocs.set(id, d);
        for (const el of d.querySelectorAll("[id]"))
          anchorMap.set(item.path + "#" + el.id, id);
      }
    } catch {
      const id = `chapter-${i + 1}-unavailable`;
      chapters.push({
        id,
        title: `Seção ${i + 1}`,
        order: chapters.length,
        html: "<p>Não foi possível carregar esta seção.</p>",
        plainText: "",
        textLength: 1,
        error: true,
      });
      pathMap.set(item.path, id);
    }
    await new Promise((r) => setTimeout(r, 0));
  }
  for (const [path, firstId] of pathMap) {
    const idx = chapters.findIndex((c) => c.id === firstId);
    for (
      let n = idx;
      n < chapters.length &&
      (n === idx || !Array.from(pathMap.values()).includes(chapters[n].id));
      n++
    ) {
      const c = chapters[n],
        d = sourceDocs.get(c.id);
      if (!d) continue;
      for (const a of d.querySelectorAll<HTMLAnchorElement>("a[href]")) {
        const dest = a.dataset.chapter
          ? { path: a.dataset.chapter, anchor: a.dataset.anchor || "" }
          : resolve(path, a.getAttribute("href")!);
        if (!dest) continue;
        const id =
          anchorMap.get(dest.path + "#" + dest.anchor) ||
          pathMap.get(dest.path);
        if (id) {
          a.setAttribute("href", "#" + dest.anchor);
          a.dataset.chapter = id;
          a.dataset.anchor = dest.anchor;
        }
      }
      c.html = sanitizeReaderHtml(d.body.innerHTML);
    }
  }
  const toc: TocItem[] = [];
  let seq = 0;
  const target = (
    base: string,
    href: string,
    title: string,
    level: number,
  ): TocItem | null => {
    const r = resolve(base, href);
    if (!r) return null;
    const chapterId =
      anchorMap.get(r.path + "#" + r.anchor) || pathMap.get(r.path);
    return chapterId
      ? {
          id: `toc-${++seq}`,
          title: title.trim() || "Seção",
          level,
          chapterId,
          anchor: r.anchor || undefined,
        }
      : null;
  };
  const nav = [...items.values()].find((x) =>
    x.properties.split(" ").includes("nav"),
  );
  if (nav && files[nav.path]) {
    try {
      const d = xml(read(nav.path));
      const navEl =
        nodes(d, "nav").find((x) =>
          (
            x.getAttribute("epub:type") ||
            x.getAttribute("role") ||
            ""
          ).includes("toc"),
        ) || nodes(d, "nav")[0];
      const walk = (ol: Element, level: number): TocItem[] =>
        Array.from(ol.children)
          .filter((x) => x.localName === "li")
          .flatMap((li) => {
            const a = Array.from(li.children).find((x) => x.localName === "a"),
              nested = Array.from(li.children).find(
                (x) => x.localName === "ol",
              ),
              children = nested ? walk(nested, level + 1) : [];
            const item = a
              ? target(
                  nav.path,
                  a.getAttribute("href") || "",
                  a.textContent || "",
                  level,
                )
              : null;
            if (item) {
              if (children.length) item.children = children;
              return [item];
            }
            return children;
          });
      const ol = navEl && nodes(navEl, "ol")[0];
      if (ol) toc.push(...walk(ol, 1));
    } catch {}
  }
  if (!toc.length) {
    const ncx = [...items.values()].find(
      (x) => x.mime === "application/x-dtbncx+xml",
    );
    if (ncx && files[ncx.path])
      try {
        const d = xml(read(ncx.path));
        const walk = (el: Element, level: number): TocItem[] =>
          Array.from(el.children)
            .filter((x) => x.localName === "navPoint")
            .flatMap((p) => {
              const item = target(
                ncx.path,
                nodes(p, "content")[0]?.getAttribute("src") || "",
                nodes(p, "text")[0]?.textContent || "",
                level,
              );
              return item ? [{ ...item, children: walk(p, level + 1) }] : [];
            });
        const root = nodes(d, "navMap")[0];
        if (root) toc.push(...walk(root, 1));
      } catch {}
  }
  if (!toc.length) {
    const inferred:TocItem[]=[];
    for (const c of chapters) {
      const d=sourceDocs.get(c.id),headings=d?[...d.querySelectorAll("h1,h2,h3,h4,h5,h6")]:[];
      if(!headings.length)inferred.push({id:`toc-${++seq}`,title:c.title,level:1,chapterId:c.id});
      else for(const h of headings)inferred.push({id:`toc-${++seq}`,title:h.textContent||"Seção",level:Number(h.tagName[1]),chapterId:c.id,anchor:h.id});
    }
    toc.push(...tocTree(inferred));
  }
  if (!chapters.some((c) => !c.error))
    throw Error("Este EPUB não possui capítulos legíveis.");
  return { metadata, format: "epub", toc, chapters };
}
