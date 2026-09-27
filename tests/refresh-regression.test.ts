import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyPublicationImage,
  rewritePublicationHtml,
} from "../apps/mobile/src/images-core";
import { shouldSplitSemanticGroup, hasSufficientPdfTextLayer, hasAcceptablePdfLayout } from "../apps/web/src/book-parser/segment";
import { exchangeGoogleIdToken, completeGoogleNativeResponse } from "../apps/mobile/src/auth/google-core";

test("publication images never become an empty src", () => {
  assert.deepEqual(classifyPublicationImage("https://cdn.example.org/figure.png"), {
    kind: "remote",
    uri: "https://cdn.example.org/figure.png",
  });
  assert.deepEqual(
    classifyPublicationImage("./source-images/socionics/image2.png"),
    { kind: "asset", key: "socionics/image2.png" },
  );
  assert.deepEqual(classifyPublicationImage("javascript:alert(1)"), {
    kind: "missing",
  });
  const html = rewritePublicationHtml(
    '<img src="./source-images/missing.png"><img src="https://cdn.example.org/a.png">',
    () => undefined,
    "fallback://image",
  );
  assert.equal(html.includes('src=""'), false);
  assert.equal(html.includes('src="fallback://image"'), true);
});

test("semantic chapter grouping uses headings and a stable size cap", () => {
  assert.equal(shouldSplitSemanticGroup(0, "H1", 100), false);
  assert.equal(shouldSplitSemanticGroup(2500, "H1", 100), true);
  assert.equal(shouldSplitSemanticGroup(2500, "H2", 100), false);
  assert.equal(shouldSplitSemanticGroup(9000, "H2", 100), true);
  assert.equal(shouldSplitSemanticGroup(4000, "P", 1000), false);
  assert.equal(shouldSplitSemanticGroup(11800, "P", 800), true);
});

test("google id token is exchanged with Supabase and missing token is rejected", async () => {
  const calls: unknown[] = [];
  const auth = {
    signInWithIdToken: async (input: unknown) => {
      calls.push(input);
      return { error: null };
    },
  };
  await exchangeGoogleIdToken(auth, "token-123");
  assert.deepEqual(calls, [{ provider: "google", token: "token-123" }]);
  await assert.rejects(() => exchangeGoogleIdToken(auth, ""), /token/i);
  const beforeCancel = calls.length;
  assert.equal(await completeGoogleNativeResponse(auth, { type: "cancelled", data: null }), "cancelled");
  assert.equal(calls.length, beforeCancel);
});


test("PDF text-layer policy accepts digital text and rejects scan-like input", () => {
  assert.equal(hasSufficientPdfTextLayer(10, 9, 1, 12000), true);
  assert.equal(hasSufficientPdfTextLayer(10, 3, 7, 5000), false);
  assert.equal(hasSufficientPdfTextLayer(4, 4, 0, 80), false);
});

test("PDF layout policy tolerates occasional complex pages", () => {
  assert.equal(hasAcceptablePdfLayout(100, 8), true);
  assert.equal(hasAcceptablePdfLayout(10, 3), true);
  assert.equal(hasAcceptablePdfLayout(10, 4), false);
});
