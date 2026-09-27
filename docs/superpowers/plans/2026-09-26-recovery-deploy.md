# Biblioteca da Tipologia Recovery & Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Reconstruct the lost source package with the surviving design, Supabase project, web UI, Android/Expo app, Google/Supabase auth wiring, and CI workflows for GitHub Pages and an installable APK.

**Architecture:** A small monorepo contains a Vite/React website, an Expo React Native Android app, and dependency-free shared domain helpers. Both clients talk directly to the existing Supabase project through its publishable key and RLS-protected tables/RPCs. Google login uses Supabase OAuth; Android returns through a custom URI scheme using PKCE.

**Tech Stack:** React 19, Vite, TypeScript, Expo SDK 57 / React Native 0.86, Supabase JS, React Navigation, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-25-biblioteca-da-tipologia-design.md`

## Global Constraints
- Public catalog, private editing powers enforced by Supabase RLS/RPC.
- Desktop uses the full Biblioteca da Tipologia wordmark; mobile uses the symbol.
- Public navigation calls “Textos-base” **Leituras**.
- Interaction animations stay around 80–100 ms and respect reduced motion on web.
- Footer is “Biblioteca da Tipologia” + the Creative Commons symbol + “- 2006 | Alguns direitos reservados.”
- Authorized users see pencil edit affordances for books, articles and readings.
- Do not place privileged Supabase secrets in source; only the publishable key may ship in clients.

## Review Focus
- Google OAuth callback/PKCE must not silently lose the session on Android.
- Non-editors must never gain edit controls based only on client-side state; RPC/RLS remains authoritative.
- Empty or failed Supabase reads must render a useful state instead of a blank page.
- GitHub Pages must work under a repository subpath; use hash routing/relative Vite base.
- APK workflow must produce an installable debug APK without EAS credentials.

---

### Task 1: Shared domain helpers
**Files:** Create `packages/core/src/index.js`, `packages/core/test/core.test.mjs`.
**Produces:** topic labels, catalog filters, edit permission helper, OAuth callback parser.
- [ ] Write failing Node tests.
- [ ] Run tests and verify missing-module failure.
- [ ] Implement helpers.
- [ ] Run tests and verify pass.

### Task 2: Web client
**Files:** Create `apps/web/*`.
**Consumes:** shared topic labels/filters.
**Produces:** public catalog, readings/articles, details, comments, account, editor forms, Supabase Google login.
- [ ] Add smoke tests for pure web helpers.
- [ ] Implement Vite/React client and styles.
- [ ] Add static build configuration for GitHub Pages.

### Task 3: Android/Expo client
**Files:** Create `apps/mobile/*`.
**Consumes:** Supabase project and shared public schema.
**Produces:** native library/readings/articles/account tabs, book reader, OAuth login, editor deep links.
- [ ] Add OAuth callback parser test in Task 1 and reuse its behavior.
- [ ] Implement Expo client using SDK 57 stable.
- [ ] Configure custom scheme `bibliotecadatipologia`.

### Task 4: CI, docs and packaging
**Files:** Create `.github/workflows/pages.yml`, `.github/workflows/android-apk.yml`, `README.md`, `.env.example` files.
**Produces:** deployable GitHub Pages site and downloadable APK artifact.
- [ ] Add workflow files.
- [ ] Run local dependency-free tests and syntax/config validation.
- [ ] Zip the reconstructed repository for handoff.
