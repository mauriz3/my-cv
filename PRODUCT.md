# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Recruiters, hiring managers, and peers evaluating Maurizio Rendon as a software engineer. Visitors may prefer English or Spanish. Some explore the public visits analytics page; most skim profile, experience, skills, and projects.

## Product Purpose

A fast, accessible, bilingual CV site that presents career facts consistently across web, generated PDFs, and LinkedIn-aligned copy. Success means trustworthy content, clear navigation, strong accessibility and SEO, and a distinctive but restrained visual identity—not a generic “AI portfolio” template.

## Positioning

Personal professional presence: evidence of craft in frontend engineering (Vue/Nuxt, TypeScript, privacy-conscious analytics), not a marketing funnel.

## Operating Context

Static-first Nuxt 4 app with EN/ES routes, theme tokens, consent-gated GA4, and a visits dashboard backed by API/snapshot. Production deploys only via GitHub Actions; local agents must not weaken CSP, expose secrets, or change Profile/Visitas motion without explicit approval.

## Capabilities and Constraints

- Surfaces: profile and CV sections (Experience), visits dashboard (Operate), privacy and docs (Read), books short links.
- WCAG-minded UI; dark default; Lighthouse/axe thresholds in `docs/calidad.md` are authoritative for CI.
- No phone, email, or street address on web/PDFs; cookie consent defaults to denied.
- Visitor-facing copy lives in `data/cv.*.ts` and i18n locales; maintain EN/ES parity.

## Brand Commitments

Precise, calm, engineer-credible. Typography and layout should feel authored for this person’s work—not interchangeable with SaaS landing tropes. Restraint on Operate/Read surfaces; measured expression on the profile hero only where it already exists.

## Evidence on Hand

- `data/cv.shared.ts`, `data/cv.en.ts`, `data/cv.es.ts` and `docs/arquitectura.md` define scope and boundaries.
- `DESIGN.md` may be added via `/impeccable document` to capture tokens and patterns.

## Product Principles

1. **Facts first.** CV content is source-of-truth; design serves reading and trust.
2. **Bilingual by default.** Every visible or accessible string has EN and ES.
3. **Ship-quality bar.** Changes must pass project typecheck, tests, a11y, and audit checks—not detector alone.
4. **Respect locked motion.** Profile and Visitas animations are out of scope unless Maurizio asks.

## Accessibility & Inclusion

WCAG 2.1 AA target; keyboard and contrast in light/dark; `prefers-reduced-motion` and global motion pause honored; chart data available in tabular form.
