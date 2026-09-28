import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  createGoogleNonce,
  hashGoogleNonce,
  resolveGoogleWebClientId,
} from "../apps/web/src/google-identity";

test("Google web client id is normalized", () => {
  assert.equal(
    resolveGoogleWebClientId("  123.apps.googleusercontent.com  "),
    "123.apps.googleusercontent.com",
  );
  assert.equal(resolveGoogleWebClientId(""), "");
  assert.equal(resolveGoogleWebClientId(undefined), "");
});

test("Google nonce is strong-looking and fresh", () => {
  const first = createGoogleNonce();
  const second = createGoogleNonce();
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.match(second, /^[a-f0-9]{64}$/);
  assert.notEqual(first, second);
});

test("Google receives SHA-256 nonce while Supabase keeps the raw nonce", async () => {
  assert.equal(
    await hashGoogleNonce("nonce-test"),
    "272e7733cf2cf0366831fb61101a4e2911a47e5856f8b8051b576b9cc5f1e371",
  );

  const helper = fs.readFileSync("apps/web/src/google-identity.ts", "utf8");
  assert.match(helper, /const hashedNonce = await hashGoogleNonce\(nonce\)/);
  assert.match(helper, /nonce: hashedNonce/);
  assert.match(helper, /resolve\(\{ token: result\.token, nonce \}\)/);
});

test("credential rejection does not silently fall back to redirect OAuth", () => {
  const context = fs.readFileSync("apps/web/src/context.tsx", "utf8");

  assert.match(context, /let googleCredential:/);
  assert.match(context, /googleCredential = await getGoogleIdToken/);
  assert.match(
    context,
    /if \(googleCredential\) \{[\s\S]*?signInWithIdToken[\s\S]*?if \(error\) \{[\s\S]*?notice\(error\.message\);[\s\S]*?return;[\s\S]*?\}/,
  );

  const idTokenPosition = context.indexOf("signInWithIdToken");
  const oauthPosition = context.indexOf("signInWithOAuth");
  assert.ok(idTokenPosition >= 0);
  assert.ok(oauthPosition > idTokenPosition);
});

test("web login still preserves OAuth fallback when GIS itself is unavailable", () => {
  const context = fs.readFileSync("apps/web/src/context.tsx", "utf8");
  assert.match(context, /signInWithOAuth/);
  assert.match(context, /Google Identity Services unavailable; using OAuth fallback/);
});
