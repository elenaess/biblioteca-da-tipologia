import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { sanitizeHtml } from "../apps/web/src/rich-content.ts";
import { convertDocHtml } from "../scripts/convert-docs.ts";
test("Rich text keeps alignment, bold and image order while blocking executable markup", () => {
  const out = sanitizeHtml(
    '<p style="text-align:justify"><strong>Texto</strong></p><img src="https://example.com/a.png" onerror="alert(1)"><script>alert(1)</script><a href="javascript:alert(1)">x</a>',
    new JSDOM("").window as any,
  );
  assert.match(out, /text-align:justify/);
  assert.match(out, /<strong>Texto<\/strong>/);
  assert.match(out, /<img src=/);
  assert.doesNotMatch(out, /script|onerror|javascript/);
});
test("Docs conversion inlines class styles and keeps photos between paragraphs", () => {
  const out = convertDocHtml(
    '<html><head><style>.c1{font-weight:700}.c2{text-align:center}</style></head><body><p class="c2"><span class="c1">A</span></p><p><img src="images/image1.png"></p><p>Depois</p></body></html>',
    "./source-images/jung/",
  );
  assert.match(out, /text-align: center/);
  assert.match(out, /font-weight: 700/);
  assert.ok(out.indexOf("image1.png") < out.indexOf("Depois"));
  assert.match(out, /source-images\/jung\/image1.png/);
});
