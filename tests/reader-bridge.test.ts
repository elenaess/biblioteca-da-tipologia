import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { build } from "esbuild";
test("Shared native reader loads chapters through its bridge without receiving authentication tokens", async () => {
  const output = await build({
    entryPoints: ["apps/web/src/reader/native-entry.tsx"],
    bundle: true,
    format: "iife",
    platform: "browser",
    write: false,
    outdir: "test-reader",
    loader: { ".css": "empty" },
    define: { "process.env.NODE_ENV": '"production"' },
    jsx: "automatic",
  });
  const calls: string[] = [];
  const chapter = {
    id: "c1",
    title: "Capítulo I",
    order: 0,
    textLength: 60,
    html: '<h1 id="intro">Capítulo I</h1><p><strong>Texto forte</strong></p>',
    plainText: "Texto forte",
  };
  const doc = new JSDOM('<div id="root"></div>', {
    url: "https://reader.biblioteca.invalid/",
    pretendToBeVisual: true,
    runScripts: "dangerously",
    beforeParse(window) {
      (window as any).__readerConfig = { id: "book", title: "Livro" };
      (window as any).ReactNativeWebView = {
        postMessage(raw: string) {
          const request = JSON.parse(raw);
          calls.push(request.method);
          const value =
            request.method === "manifest"
              ? {
                  book_id: "book",
                  revision: "revision",
                  format: "html",
                  processing_status: "ready",
                  message: "",
                  toc: [
                    {
                      id: "t",
                      title: "Capítulo I",
                      level: 1,
                      chapterId: "c1",
                      anchor: "intro",
                    },
                  ],
                  chapters: [chapter],
                }
              : request.method === "chapter"
                ? chapter
                : null;
          queueMicrotask(() =>
            (window as any).__readerReceive({ id: request.id, value }),
          );
        },
      };
    },
  });
  try {
    doc.window.eval(output.outputFiles[0].text);
    for (
      let i = 0;
      i < 40 &&
      !doc.window.document.querySelector(".reader-index button[aria-current]");
      i++
    )
      await new Promise((r) => setTimeout(r, 20));
    assert.equal(
      doc.window.document.querySelector(".reader-document strong")?.textContent,
      "Texto forte",
    );
    assert.ok(
      calls.includes("manifest") &&
        calls.includes("position") &&
        calls.includes("chapter"),
    );
    assert.equal(
      doc.window.document.querySelector(".reader-index button[aria-current]")
        ?.textContent,
      "Capítulo I",
    );
  } finally {
    doc.window.close();
  }
});
