import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createGoogleNonce, resolveGoogleWebClientId } from "../apps/web/src/google-identity";

test("Google web client id is normalized", () => {
  assert.equal(resolveGoogleWebClientId("  123.apps.googleusercontent.com  "), "123.apps.googleusercontent.com");
  assert.equal(resolveGoogleWebClientId(""), "");
  assert.equal(resolveGoogleWebClientId(undefined), "");
});

test("Google nonce is strong-looking, URL-safe hex, and fresh", () => {
  const first = createGoogleNonce();
  const second = createGoogleNonce();
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.match(second, /^[a-f0-9]{64}$/);
  assert.notEqual(first, second);
});

test("web login prefers Google ID token and preserves Supabase OAuth fallback", () => {
  const context = fs.readFileSync("apps/web/src/context.tsx", "utf8");
  assert.match(context, /getGoogleIdToken/);
  assert.match(context, /signInWithIdToken/);
  assert.match(context, /provider:\s*"google"/);
  assert.match(context, /signInWithOAuth/);
});

test("GitHub Pages injects the existing Google web client id variable", () => {
  const workflow = fs.readFileSync(".github/workflows/pages.yml", "utf8");
  assert.match(
    workflow,
    /VITE_GOOGLE_WEB_CLIENT_ID:\s*\$\{\{\s*vars\.GOOGLE_WEB_CLIENT_ID\s*\}\}/,
  );
});
