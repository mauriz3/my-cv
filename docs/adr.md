# Architecture decisions (ADR)

An ADR records context, decision, and consequences; update it in each PR that makes a new decision.
First commit/PR dates verified (Atlantic/Canary); base: `master` at `8974b35` (after PR #57).

## ADR-001 · Static Nuxt 4 on Netlify
**2026-10-24 · Accepted** · `be08b7f`, `11391be`.
- **Context:** Nuxt 2/Vuetify accumulated debt.
- **Decision:** Rebuild with Nuxt 4, Vue 3, Nuxt UI 4, Tailwind 4, and strict TS; generate static assets on Netlify.
- **Consequences:** No permanent Nuxt server; preserve content, not inherited debt.

## ADR-002 · Typed content and single source
**2026-10-24 · Accepted** · `be08b7f`, `0dc7f15`.
- **Context:** Copy embedded in views.
- **Decision:** Centralize TS data and Zod schemas; separate facts and EN/ES copy; generate PDFs from them.
- **Consequences:** Web/PDF share content; validation in tests.

## ADR-003 · Publish only from GitHub Actions
**2026-10-25 · Accepted** · `c674d67`, `0324d77`.
- **Context:** Avoid parallel publishes.
- **Decision:** After checks, publish the artifact with Netlify CLI `--no-build`, only on push to master.
- **Consequences:** Do not deploy develop. Netlify automatic builds disabled: verified (confirmed by Maurizio, 2026-11-07).

## ADR-004 · CSP with hashes after generate
**2026-10-24 · Accepted** · `be08b7f`, `95d753d`.
- **Context:** Nuxt needs inline scripts.
- **Decision:** Compute SHA-256 of generated HTML; forbid `unsafe-inline`/`unsafe-eval` in `script-src`.
- **Consequences:** Regenerate hashes; exception documented only for `style-src 'unsafe-inline'`.

## ADR-005 · Reviewable supply chain
**2026-10-25 · Accepted** · `83341e2`, `c706d1a`.
- **Context:** Dependencies and actions execute code.
- **Decision:** Actions pinned by SHA, gitleaks, and weekly Dependabot without auto-merge; read token.
- **Consequences:** Updates via PR; secrets and audit block deploy.

## ADR-006 · Visits via snapshots
**2026-11-01 · Accepted** · `500ebd0`, `31baafb` ([PR #42](https://github.com/mauriz3/my-cv/pull/42)).
- **Context:** Avoid GA4 queries per visitor.
- **Decision:** Scheduled function every three hours → GA4 → validated snapshot in Blobs → `/api/visits`; fictional fallback.
- **Consequences:** Public aggregates only; indicate real/example; credentials server-only.

## ADR-007 · Zod without JIT
**2026-11-07 · Accepted** · `ae0f801` ([PR #55](https://github.com/mauriz3/my-cv/pull/55)).
- **Context:** Zod probes `new Function` to compile validators; CSP without `unsafe-eval` blocks it and Lighthouse flags it under best practices.
- **Decision:** `lib/zod.ts` applies `z.config({ jitless: true })` and all code imports `z` from there.
- **Consequences:** CSP is not relaxed; validation somewhat slower, sufficient for this data.

## ADR-008 · Consent by country
**2026-10-31 · Accepted** · `bc57e89`, `c706d1a`.
- **Context:** Analytics with regional consent.
- **Decision:** Consent Mode v2 initially denied; Edge `/geo` drives EU/EEA/UK/Switzerland notice, also for unknown country/error.
- **Consequences:** Outside zone analytics granted without notice; prior choice prevails; denied does not guarantee zero Google requests.

## ADR-009 · Declared 14-month retention
**2026-10-31 · Accepted** · `95d753d`.
- **Context:** Disclose analytics retention periods.
- **Decision:** Declare 14 months for user/event data in `lib/privacy.ts`.
- **Consequences:** Matches GA Admin → Data retention: verified (confirmed by Maurizio, 2026-11-07). Not the same as cookie lifetime.

## ADR-010 · Books: HTML 200 with Open Graph
**2026-11-01 · Accepted** · `4830a57` ([PR #48](https://github.com/mauriz3/my-cv/pull/48)).
- **Context:** 301 failed on LinkedIn.
- **Decision:** `/en/books` and `/es/libros` return 200 with OG; later jump to anchor.
- **Consequences:** Replaces 301 from `d4d017c`; minimal HTML without Nuxt hydration.

## ADR-011 · Dark without flash
**2026-11-01 · Accepted** · `d3a1bf9`.
- **Context:** Coherent initial theme.
- **Decision:** Dark HTML and pre-paint script; respect explicit choice, not system preference.
- **Consequences:** Local persistence; script included in CSP.

## ADR-012 · Motion tied to scroll
**2026-10-31 · Accepted** · `e81bd81`, `b9cb7f7`.
- **Context:** Accessible visual journey.
- **Decision:** Scroll progress, pure logic and composables; respect reduced-motion and global pause.
- **Consequences:** Static alternative; content accessible without animation.

## ADR-013 · Expanded quality in CI
**2026-11-07 · Accepted** · `ae0f801`, `ff47458` ([PR #55](https://github.com/mauriz3/my-cv/pull/55)).
- **Context:** Typecheck, tests, and audit did not catch accessibility, performance, or untested code regressions.
- **Decision:** On every PR and push to master: blocking coverage ≥80% (lines, statements, functions, branches) on own TS/JS, excluding `.vue`; axe WCAG 2.2 A/AA fails on serious/critical; Lighthouse (median of 3) ≥0.85/0.95/0.90/0.95 (performance/a11y/practices/SEO). axe and Lighthouse use the `verify` artifact.
- **Consequences:** `deploy-production` waits for `verify`, `secrets`, `a11y`, and `lighthouse`; `.vue` files are covered only by axe and Lighthouse.

## ADR-014 · Aligned Node types
**2026-11-05 · Accepted** · `f4e21ed` ([PR #52](https://github.com/mauriz3/my-cv/pull/52)).
- **Context:** Node 24 runtime.
- **Decision:** Dependabot ignores `@types/node` majors.
- **Consequences:** Review manually when runtime changes.

## ADR-015 · Lighthouse with EU visit profile
**2026-11-08 · Accepted** · [PR #57](https://github.com/mauriz3/my-cv/pull/57).
- **Context:** In production, a first visit from the EU sees the analytics notice, which appears after hydrate and `/geo` and becomes LCP; the master push `lighthouse` job failed because of that.
- **Decision:** CI server mimics Netlify (Brotli and `/geo` with real Edge Function and simulated country). Two profiles in `lighthouserc.cjs`: visit outside notice zone (US), all thresholds blocking; and first EU visit (ES) with notice, only on push to master, where a11y, best practices, and SEO block and performance only warns. Approved by Maurizio.
- **Consequences:** Performance with notice stays visible without blocking deploy. Lowering it would require redesigning the notice (prerender visible and hide outside EU, with flash risk); pending decision.

## ADR-016 · Opt-in animations (off by default)
**2026-11-08 · Proposed**.
- **Context:** The site started with full motion when there was no choice (`localStorage["motion"]` or `prefers-reduced-motion`). The button used `aria-pressed` and fixed copy «Reducir movimiento». Maurizio asked for the opposite: all static on load and a «Activar animaciones» button.
- **Decision:**
  - New key `localStorage["animations"]` (`on` | `off`). No choice = OFF. Legacy key `motion` is ignored and removed when saving the first new choice.
  - Attribute remains `<html data-motion="full | reduced">` (ON → `full`, OFF → `reduced`) to reuse CSS.
  - On load, `prefers-reduced-motion` wins: with PRM active the site stays static even if `animations=on`. A manual click on «Activar» animates only the current document (`override` in memory) and does not survive reload.
  - Button is a simple action **without `aria-pressed`**; `aria-label` matches visible copy («Activar» / «Desactivar animaciones»). On first session with no choice and no PRM, three soft pulses with amber ring (`--ui-secondary`, OFF button color) start when the button mounts. They stop on click or focus, on tab hide, or after three cycles; scroll and outside taps do not stop them.
  - When enabled, visible charts reset without reload and journey scenes catch up to current progress in 450 ms without moving scroll. Shared registry (`useReplayable`) avoids repeat on theme, locale, or filter change.
- **Consequences:** Replaces «full by default» and fixed copy/`aria-pressed` from `lib/motion.ts`. Must regenerate CSP hash for pre-paint script. Profile and Visits design unchanged: only default state and reset on enable. Visits CTA halo shares `.cta-halo` class; its animation unchanged.

## ADR-017 · Fail-closed supply chain and abuse limits
**2026-11-08 · Proposed** (security review of 2026-11-08).
- **Context:** `audit:check` passed when `npm audit` failed without results; `netlify-cli` (run with the deploy token) and `@lhci/cli` were downloaded with `npx` outside the lockfile; GA4 page paths were published unfiltered; query strings bypassed the Visits CDN cache; Lighthouse and axe could send real GA hits from CI; `deepmerge` GHSA-gcqx-w48m-w2h4 has no patched release.
- **Decision:**
  - `scripts/audit.mjs` fails closed on any audit without a valid report.
  - `netlify-cli` and `@lhci/cli` are exact devDependencies run with `npx --no-install` / `npm run`; `overrides` pins `basic-ftp` 6.2.6 (high advisory surfaced by pinning).
  - Allowlist of reported page paths in code and schema; Visits cache key ignores the query (`Netlify-Vary: query=none`, durable cache); code-based rate limits (60/min per IP) on `/api/visits/:range` and `/geo`.
  - CI audits block Google Analytics domains; local audit server binds `127.0.0.1`; `netlify.toml` skips any Netlify-side build (`ignore = "exit 0"`).
  - `deepmerge` advisory accepted (build-time only, trusted config, not shipped). Review by 2027-02-08.
- **Consequences:** `npm ci` installs more devDependencies (slower cold install, cached by `setup-node`). A new page must be added to `REPORTED_PAGE_PATHS` (a test enforces it). `/geo` can still be influenced by the visitor's own `X-Forwarded-For` through Netlify's lookup: documented, fail-safe, stricter check pending a preview test. Secret scanning and push protection remain for the owner to enable.

## ADR-018 · Height-responsive mobile journey
**2026-11-11 · Proposed**.
- **Context:** The card-fit guard correctly falls back to static on short phones, but Education exceeds the available zone by up to 145px at 360×640 (EN).
- **Decision:** Keep the 520–950px mobile pin guard and fit measurement. Only in the animated, fitting journey: at ≤820px height reduce the hologram to 22cqh and tighten vertical spacing; at ≤700px use 16cqh, 12px card padding, 18px section headings, and 48px scenes (Profile illustration included). Hide only redundant numbered card-header labels at ≤700px; keep their accessible article names, headings, all CV content, and ≥44px CTAs. Profile scroll chaining remains `auto`.
- **Consequences:** Larger phones, tablet/desktop, default animations-off, and static fallback retain their existing presentation. CSS determines initial geometry before hydration. Real-touch/wheel and card-fit tests cover four English CI resolutions; broader EN/ES sizes are verified locally; new content must still pass the fit guard.
