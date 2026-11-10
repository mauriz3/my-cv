# my-cv

Maurizio Rendon's CV as a dashboard-style app: [www.mauriziorendon.com](https://www.mauriziorendon.com). Static site in English and Spanish with profile, skills, experience, education, projects, and visits (Google Analytics 4).

## Stack

Nuxt 4 (`nuxt generate`) · Nuxt UI v4 · Tailwind 4 · strict TypeScript · `@nuxtjs/i18n` (EN/ES) · zod · Chart.js · Vitest, Playwright + axe and Lighthouse CI · Netlify (static assets, functions, Blobs, and one Edge Function).

## Getting started

Requires Node 24 (`.nvmrc`).

```bash
npm install
npm run dev
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development |
| `npm run typecheck` | Types |
| `npm run test` | Vitest tests (`tests/unit/` and `tests/nuxt/`), including zod validation of data |
| `npm run coverage` | Tests with coverage (minimum 80%; report in `coverage/index.html`) |
| `npm run generate` | Static site in `.output/public` + headers and CSP hashes |
| `npm run test:a11y` | axe on the generated site (requires `generate` and Google Chrome) |
| `npm run lighthouse` | Lighthouse on the generated site (requires `generate` and Google Chrome) |
| `npm run lighthouse:consent` | Same with the analytics notice (visit from the EU; production build) |
| `npm run audit:check` | `npm audit` with justified exceptions (fails if the audit itself fails) |
| `npm run pdf` | Regenerate CV PDFs from `data/` ([scripts/pdf/README.md](scripts/pdf/README.md)) |
| `npm run visits:snapshot` | Local GA4 snapshot ([docs/ga4.md](docs/ga4.md)) |

## Structure

- `app/` pages, layouts, components, composables, and utilities.
- `data/` CV content (`cv.shared.ts` + copy in `cv.en.ts` / `cv.es.ts`); shared by the web and PDF.
- `lib/` pure logic with tests.
- `i18n/locales/` UI strings.
- `server/`, `netlify/functions/`, and `netlify/edge-functions/`: Visits API and `/geo`.
- `public/` static files, `_headers` (CSP), and `_redirects`.
- `scripts/` header generation, PDF, Open Graph image, audits, and local server for CI.
- `tests/` Vitest (`unit/`, `nuxt/`) and axe (`a11y/`).

## Images

Raster assets in WebP (lossless for screenshots, quality 85 for covers); only `og-cv.png` (LinkedIn), `favicon.ico`, and `webtele.jpg` remain PNG/ICO/JPG (its WebP is larger). `tests/unit/images.spec.ts` blocks unused images and new raster files outside those exceptions. Details: [docs/images.md](docs/images.md).

## CI and quality

Every PR and every push to master runs `.github/workflows/ci.yml`: typecheck, tests with coverage (fails below 80%), generate, `audit:check`, gitleaks, axe (fails on serious/critical violations), mobile journey touch-scroll regressions, and Lighthouse (per-category thresholds). Reports are stored as workflow artifacts in Actions; CI tools (Lighthouse CI, Netlify CLI) come from the lockfile and audits never send Google Analytics hits. Details: [docs/quality.md](docs/quality.md). Security (CSP, headers, dependencies): [docs/security.md](docs/security.md).

## Deployment

Only a push to master deploys to Netlify (job `deploy-production`, after full CI passes) and then verifies production; Netlify itself never builds. Details: [docs/deployment.md](docs/deployment.md).

## Documentation

- [Features](docs/features.md): Visits, analytics and consent, opt-in animations, micro-animations, theme, books, and share preview.
- [Visits with GA4 data](docs/ga4.md): snapshot, setup, and local testing.
- [Images](docs/images.md): formats, exceptions, and how to add an image.
- [Quality](docs/quality.md) · [Security](docs/security.md) · [Deployment](docs/deployment.md).
- [Architecture, types, and flow diagrams](docs/README.md) · [Decisions (ADR)](docs/adr.md) · [AI agent guidelines](AGENTS.md).
