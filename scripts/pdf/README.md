# CV PDF (EN / ES)

Generates `public/Resume-Maurizio-Rendon-en.pdf` and `-es.pdf` (A4, exactly 2 pages) per the design «Handoff – CV PDF».

**Single source:** copy comes from `data/cv.*.ts` via `getCv(locale)`. To change the summary, a role, or a bullet, edit `data/` and regenerate; CV text is not duplicated here. `tests/unit/pdfContent.spec.ts` checks that web and PDF share summary, Octane11 bullets, roles, education, projects, and skills.

- `content.ts`: builds PDF content from data. Only adds PDF-specific pieces, with named constants: section titles and footer, profile = `summary` + `motivation`, link and Skills row order (Back End first), ATS aliases (`React (ReactJS)`, `Chart.js (ChartJS)`), computed «DevOps (2016–2018)» label from the period, page break before Open Canarias, and short System73 location («Tenerife»).
- `template.ts`: semantic single-column HTML (h1/h2/h3, lists) and footer «Maurizio Rendon · CV · Page X of Y» with `@page`.
- `cv-print.css`: print styles (brand blue `#0176AC` for text and `#02A0E9` only on the decorative rule, on graphite; local Inter + Space Grotesk).
- `generate.ts` (CLI) and `render.ts` (logic, with tests): Chromium (Google Chrome via `playwright-core`) → tagged PDF; `pdf-lib` strips metadata and asserts 2 pages.
- `check-privacy.sh`: fails if the PDF contains email, phone, `mailto:`/`tel:`, local paths, non-embedded fonts, or more than 2 pages.
- `fonts/`: trimmed static Latin instances of Inter 400/500/600 and Space Grotesk 700 (SIL OFL 1.1, licenses in `fonts/OFL-*.txt`). Recreate with `make-static-fonts.sh` (python3 + fontTools; variable fonts would render as Type 3).

## Regenerate

```sh
npm run pdf   # generates both PDFs and runs check-privacy.sh on each
```

Requirements: Google Chrome at `/usr/bin/google-chrome` (or `CHROME_PATH=/path/to/browser`) and `poppler-utils` + `ripgrep` for the privacy check. Not run in CI: PDFs are versioned in `public/`.

Privacy: LinkedIn, GitHub, and CodePen links only. Never email, phone, or address.
