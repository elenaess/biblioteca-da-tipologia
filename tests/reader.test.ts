import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { zipSync, strToU8 } from "fflate";
import { readingProgress, flattenToc } from "../packages/domain/src/reader";
const dom = new JSDOM("");
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  DOMParser: dom.window.DOMParser,
});
const { normalizeHtml } = await import("../apps/web/src/book-parser/normalize");
const { sanitizeReaderHtml } = await import(
  "../apps/web/src/book-parser/sanitizer"
);
const { parseBook } = await import("../apps/web/src/book-parser");
const { parseEpub } = await import("../apps/web/src/book-parser/epub");
test("Markdown preserves semantic formatting, chapter boundaries and a hierarchical stable TOC", async () => {
  const f = new File(
    [
      "# Capítulo I\n\nTexto **forte** e *itálico*.\n\n## História\n\nConteúdo.\n\n# Capítulo II\n\nOutro.",
    ],
    "livro.md",
  );
  const b = await parseBook(f, async () => ""),
    again = await parseBook(f, async () => "");
  assert.equal(b.chapters.length, 2);
  assert.deepEqual(b.toc, again.toc);
  assert.equal(b.toc[0].children?.[0].title, "História");
  assert.match(b.chapters[0].html, /<strong>forte<\/strong>/);
  assert.match(b.chapters[0].html, /<em>itálico<\/em>/);
});
test("Reader blocks active HTML and layout escapes while retaining tables, footnotes and safe styles", () => {
  const html = sanitizeReaderHtml(
    '<style>body{display:none}</style><script>bad()</script><iframe src="https://evil.test"></iframe><h1 id="cap">A</h1><p onclick="bad()" style="position:fixed;z-index:999;text-align:justify;font-style:italic">Texto<sup><a href="#nota">1</a></sup></p><table><tr><td>X</td></tr></table><p id="nota">Nota</p><img src="https://example.com/x.png" onerror="bad()"><a href="javascript:bad()">ruim</a>',
  );
  assert.doesNotMatch(
    html,
    /script|iframe|onclick|onerror|position|z-index|javascript/,
  );
  assert.match(html, /text-align: justify/);
  assert.match(html, /<table>/);
  assert.match(html, /loading="lazy"/);
  const b = normalizeHtml(html, "Livro", "html");
  assert.match(b.chapters[0].html, /data-chapter="chapter-0001"/);
  assert.equal(b.toc.length, 1);
});
test("EPUB honors spine and official TOC; embedded image and cross-chapter anchors survive import", async () => {
  const files: Record<string, Uint8Array> = {};
  const put = (p: string, s: string) => (files[p] = strToU8(s));
  put(
    "META-INF/container.xml",
    '<container><rootfiles><rootfile full-path="OEBPS/book.opf"/></rootfiles></container>',
  );
  put(
    "OEBPS/book.opf",
    '<package xmlns:dc="http://purl.org/dc/elements/1.1/"><metadata><dc:title>Livro de teste</dc:title><dc:creator>Autora</dc:creator></metadata><manifest><item id="a" href="a.xhtml" media-type="application/xhtml+xml"/><item id="b" href="b.xhtml" media-type="application/xhtml+xml"/><item id="n" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="cover" href="cover.png" media-type="image/png" properties="cover-image"/></manifest><spine><itemref idref="b"/><itemref idref="a"/></spine></package>',
  );
  put(
    "OEBPS/a.xhtml",
    '<html><body><h1 id="a">Primeiro</h1><p><strong>negrito</strong><img src="cover.png"/></p></body></html>',
  );
  put(
    "OEBPS/b.xhtml",
    '<html><body><h1 id="b">Segundo</h1><a href="a.xhtml#a">Ir</a><h2>Não duplicar TOC</h2></body></html>',
  );
  put(
    "OEBPS/nav.xhtml",
    '<html xmlns:epub="http://www.idpf.org/2007/ops"><body><nav epub:type="toc"><ol><li><a href="b.xhtml#b">Ordem B</a></li><li><a href="a.xhtml#a">Ordem A</a></li></ol></nav></body></html>',
  );
  files["OEBPS/cover.png"] = new Uint8Array([137, 80, 78, 71]);
  const b = await parseEpub(
    zipSync(files),
    async () => "https://example.com/cover.png",
    () => {},
  );
  assert.equal(b.metadata.author, "Autora");
  assert.equal(b.metadata.coverUrl, "https://example.com/cover.png");
  assert.match(b.chapters[0].html, /Segundo/);
  assert.deepEqual(
    flattenToc(b.toc).map((x) => x.title),
    ["Ordem B", "Ordem A"],
  );
  assert.match(
    b.chapters[0].html,
    new RegExp('data-chapter="' + b.chapters[1].id + '"'),
  );
  assert.match(b.chapters[1].html, /https:\/\/example.com\/cover.png/);
});
test("TXT keeps ordinary prose out of the TOC; progress weighs all chapters", async () => {
  const b = await parseBook(
    new File(["Uma linha normal\n\nOutra linha."], "texto.txt"),
    async () => "",
  );
  assert.equal(b.toc.length, 0);
  assert.equal(
    readingProgress(
      [
        { id: "a", textLength: 100 },
        { id: "b", textLength: 300 },
      ],
      "b",
      0.5,
    ),
    0.625,
  );
});
