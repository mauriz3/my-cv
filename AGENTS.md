# Guidelines for AI agents

## Language

- Maintainer-facing content in English: comments, identifiers, test titles and messages, documentation (`README.md`, `docs/`, scripts), workflows, **commit messages**, and **repository file and directory names**.
- Spanish only for what visitors read on the Spanish site: `data/cv.es.ts` and the `es` entries in `i18n/locales/`. English site copy lives in `data/cv.en.ts` and `en` locale entries.
- Tests that assert visible UI copy keep the expected string per locale.
- Public routes, i18n keys, and storage keys stay as they are.

## Workflow and documentation

- Never merge or deploy to master without Maurizio's explicit OK. Work on branches with PRs; never force-push to master.
- Merge only with squash or rebase (merge commits disabled) for a linear history; the branch is deleted automatically on merge.
- Update the branch with `git rebase origin/master`, not merge; after rebasing, `git push --force-with-lease` only on your own PR branch.
- Deploy only via GitHub Actions; do not publish from the local CLI or enable Netlify automatic builds.
- Update README and `docs/` (including [ADR](docs/adr.md)) when the PR requires it. Record new decisions.
- Keep README concise; avoid internal names such as «tandas». Coordinate documentation changes with other branches.
- Use GitHub noreply email for commits; do not use a personal email.

## Quality and commands

- Use Node 24 (`.nvmrc`), npm, and the lockfile; install with `npm ci`.
- Mandatory CI: typecheck, tests, ≥80% TS coverage, axe and Lighthouse with thresholds, `npm run audit:check`.
- Thresholds and configuration: [quality](docs/quality.md). axe fails on serious/critical; Lighthouse ≥0.85 performance, ≥0.95 accessibility, ≥0.90 best practices, and ≥0.95 SEO (on the EU visit profile with notice, performance only warns: ADR-015).
- Commands: `npm run dev`, `npm run typecheck`, `npm run test`, `npm run coverage`, `npm run generate`, `npm run test:a11y`, `npm run lighthouse`, `npm run audit:check`, `npm run pdf`.
- `generate` produces `.output/public` and CSP hashes; do not skip post-processing.

## Code and architecture

- Vue 3/Nuxt 4: Composition API, composables, `<script setup lang="ts">`, and strict TypeScript, including `noUncheckedIndexedAccess`.
- Follow [architecture](docs/architecture.md), [types](docs/types.md), and [decisions](docs/adr.md): views present, composables coordinate, pure logic is tested in `lib/`; isolate I/O adapters.
- KISS, DRY, YAGNI, and SRP; intentional names and named constants, no magic numbers.
- Reuse types with `Pick`, `Omit`, `extends`, generics, `satisfies`, and `typeof`/`keyof` derivatives when it simplifies; not as ornament.
- Infer from Zod schemas with `z.infer`, `z.input`, or `z.output`; do not duplicate contracts by hand. Validate external data at boundaries; explicit coercion when appropriate.
- CV data in `data/`: shared facts and EN/ES copy; UI in `i18n/locales/`. Translate all visible and accessible text, including errors and metadata.
- Keep the Visits API independent of its source, validated snapshot, and clearly labeled example fallback. Do not expose GA credentials to the browser.

## Design (agents)

- UI design, redesign, or polish: use **Impeccable** (`.cursor/skills/impeccable/`), **frontend-design** (user skill store), and **design-taste-frontend** together; see `.cursor/rules/design-stack.mdc` for lead skill when they overlap. Run `impeccable context` once per design session; read `craft-floor.md` before UI edits. `PRODUCT.md` holds Impeccable product context; add `DESIGN.md` via `/impeccable document` when useful.
- Repo constraints (CSP, privacy, i18n, Profile/Visits motion, CI thresholds) always override design playbooks.

## UI and accessibility

- Check contrast, keyboard, and accessibility in dark and light; dark by default, no flash.
- Respect `prefers-reduced-motion` and global pause; do not change Profile and Visits animations without being asked.
- Reuse theme tokens; charts must have a tabular alternative and not rely on color alone.
- Preserve EN/ES routes and short book links with 200 responses and Open Graph.

## CV content

- Keep web, PDFs, and LinkedIn aligned. Regenerate PDFs from `data/`; do not maintain separate content copies.

## Privacy and security

- Reject as visible as accept; do not claim analytics cookies are necessary. Keep initial consent denied and a prudent fallback when country is unknown.
- Never put secrets in the repo, build, client, documentation, or logs. No phone, email, or address on the web or in PDFs.
- Do not confuse public aggregates with anonymity of GA measurement; denied does not guarantee zero requests to Google.
- No inline scripts without hashes; no `unsafe-inline`/`unsafe-eval` in `script-src`. The style exception does not authorize scripts.
- Pin Actions by SHA, minimum permissions, and gitleaks. Audit dependencies; any exception needs justification and expiry.
- Do not remove `noindex` from non-production builds or pass real credentials/data into the static fallback.

## Diagrams

- Update affected diagrams and render each modified Mermaid block with `mmdc`, installed outside the repo.
