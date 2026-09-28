import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ALLOWED_ORIGINS,
  ALLOWED_SUPPORT_AMOUNTS,
  corsHeadersForOrigin,
  isAllowedOrigin,
  isAllowedSupportAmount,
} from "../supabase/functions/_shared/support-payment";
import {
  SUPPORT_AMOUNTS,
  isSupportAmount,
} from "../apps/web/src/support";
import { t } from "../packages/domain/src";

test("support amount whitelist accepts exactly the four approved BRL amounts", () => {
  assert.deepEqual(ALLOWED_SUPPORT_AMOUNTS, [250, 500, 1000, 1500]);
  for (const amount of [250, 500, 1000, 1500]) {
    assert.equal(isAllowedSupportAmount(amount), true);
    assert.equal(isSupportAmount(amount), true);
  }
  for (const value of [null, undefined, "500", 500.5, -250, 0, 2000, {}, []]) {
    assert.equal(isAllowedSupportAmount(value), false);
  }
});

test("frontend exposes exactly the four approved support amounts", () => {
  assert.deepEqual(SUPPORT_AMOUNTS.map((item) => item.amount), [250, 500, 1000, 1500]);
});

test("CORS accepts the production GitHub Pages origin and local Vite origins only", () => {
  assert.ok(ALLOWED_ORIGINS.includes("https://elenaess.github.io"));
  assert.equal(isAllowedOrigin("https://elenaess.github.io"), true);
  assert.equal(isAllowedOrigin("http://localhost:4173"), true);
  assert.equal(isAllowedOrigin("https://evil.example"), false);
  const headers = corsHeadersForOrigin("https://elenaess.github.io");
  assert.equal(headers["Access-Control-Allow-Origin"], "https://elenaess.github.io");
});

test("support navigation copy exists in PT EN and ES", () => {
  assert.equal(t("pt", "nav.support"), "Apoiar projeto");
  assert.equal(t("en", "nav.support"), "Support the project");
  assert.equal(t("es", "nav.support"), "Apoyar el proyecto");
});

test("support link is desktop-only and uses the Lucide Heart component", () => {
  const source = readFileSync(new URL("../apps/web/src/App.tsx", import.meta.url), "utf8");
  const sidebar = source.match(/<aside className="sidebar desktop-sidebar">[\s\S]*?<\/aside>/)?.[0] || "";
  const headerNav = source.match(/<nav className="header-nav"[\s\S]*?<\/nav>/)?.[0] || "";
  assert.match(source, /\bHeart\b/);
  assert.match(sidebar, /to="\/apoiar"/);
  assert.doesNotMatch(headerNav, /to="\/apoiar"/);
  assert.match(source, /<Route path="\/apoiar"/);
  const accountIndex = sidebar.indexOf('to="/conta"');
  const adminIndex = sidebar.indexOf('to="/admin"');
  const supportIndex = sidebar.indexOf('to="/apoiar"');
  assert.ok(accountIndex >= 0 && adminIndex > accountIndex && supportIndex > adminIndex);
});


test("production support configuration points to Ko-fi and supplies the Stripe publishable key to Pages", () => {
  const supportSource = readFileSync(new URL("../apps/web/src/pages/Support.tsx", import.meta.url), "utf8");
  const workflow = readFileSync(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8");
  assert.match(supportSource, /https:\/\/ko-fi\.com\/bibliotecadatipologia/);
  assert.match(workflow, /VITE_STRIPE_PUBLISHABLE_KEY:/);
});
